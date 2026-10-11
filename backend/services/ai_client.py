"""OpenRouter client (Nemotron). The only AI provider in P0.

Called only for:
  1. categorizing a problem the keyword rules could not classify
  2. generating a tentative hypothesis after the user asked for one
  3. recommending break duration and activity before the break

Never called for activity samples, break text, or reflection.
Every failure path returns a deterministic fallback; nothing raises to the API.
"""

import logging
import re

import httpx

from backend.config import get_settings
from backend.services.snapshot import CATEGORIES

log = logging.getLogger("touchgrass.ai")

TENTATIVE_MARKERS = ("could ", "might ", "may i suggest", "one thing i'd check", "it might", "possibly", "perhaps")
FORBIDDEN_MARKERS = ("definitely", "guaranteed", "the answer is", "the fix is", "certainly")

FALLBACK_HYPOTHESES: dict[str, str] = {
    "redis": "Could the write path be updating one Redis key while the read path reads another? One thing I'd check is whether both paths build the exact same cache key.",
    "docker": "Could the service be reaching 127.0.0.1 inside the container, where nothing is listening? One thing I'd check is whether it uses the service name and the right bind address.",
    "database": "Could a stale read come from an uncommitted or differently isolated transaction? One thing I'd check is when the write is committed relative to the read.",
    "api_backend": "Could the request be hitting a different handler or a cached response than you expect? One thing I'd check is which route actually runs.",
    "networking": "Could the client be targeting a host or port the server is not bound to? One thing I'd check is the exact address and port in both places.",
    "authentication": "Could the token or permission be scoped differently than the check expects? One thing I'd check is which role or claim the failing request carries.",
    "configuration": "Could an environment variable differ between where it works and where it fails? One thing I'd check is whether the same value is loaded in both places.",
}
GENERIC_FALLBACK = "Could one of the assumptions about the failing path be wrong? One thing I'd check is the exact input and output at the step where the behaviour first diverges."


def fallback_hypothesis(category: str) -> str:
    return FALLBACK_HYPOTHESES.get(category, GENERIC_FALLBACK)


def _ensure_tentative(text: str, category: str) -> str | None:
    """Return a safe hypothesis, or None if the model output must be discarded."""
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL).strip().strip('"')
    if not text or len(text) > 600:
        return None
    lower = text.lower()
    if any(f in lower for f in FORBIDDEN_MARKERS):
        return None
    if not any(m in lower for m in TENTATIVE_MARKERS):
        text = "Could this be the issue? " + text
    return text


async def _chat(messages: list[dict], max_tokens: int) -> str:
    s = get_settings()
    if not s.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")
    headers = {"Authorization": f"Bearer {s.openrouter_api_key}", "Content-Type": "application/json"}
    payload = {"model": s.openrouter_model, "messages": messages,
               "max_tokens": max_tokens, "temperature": 0.3}
    async with httpx.AsyncClient(timeout=s.ai_timeout_sec) as client:
        resp = await client.post(f"{s.openrouter_base_url}/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def classify_with_ai(problem: str) -> str | None:
    """Return one known category, or None if unavailable / unparseable."""
    options = ", ".join(CATEGORIES)
    messages = [
        {"role": "system", "content": f"Classify the developer problem into exactly one of: {options}. Reply with the category name only."},
        {"role": "user", "content": problem[:500]},
    ]
    try:
        answer = (await _chat(messages, max_tokens=12)).strip().lower()
    except Exception as exc:  # network, auth, timeout, bad JSON
        log.warning("classify fallback: %s", type(exc).__name__)
        return None
    return answer if answer in CATEGORIES else None


async def recommend_break_duration(category: str, problem: str, session_minutes: float, stuck_signals: list[str]) -> tuple[int, str]:
    """
    Recommend break duration (seconds) and activity type.
    Returns (duration_seconds, activity_type).
    Durations are bounded to {180, 300, 600, 900} seconds (3, 5, 10, 15 min).
    """
    # Deterministic fallback based on simple heuristics
    def deterministic_fallback() -> tuple[int, str]:
        from backend.services.breaks import BREAKS
        # Base duration on session length and stuck signals
        base_duration = 300  # 5 min default
        if session_minutes > 90:
            base_duration = 600  # 10 min for long sessions
        if session_minutes > 180:
            base_duration = 900  # 15 min for very long sessions
        if "explicit_stuck" in stuck_signals:
            base_duration = max(base_duration, 600)  # at least 10 min if explicitly stuck
        if "high_tab_switches" in stuck_signals:
            base_duration = max(base_duration, 600)
        # Clamp to allowed values
        allowed = (180, 300, 600, 900)
        duration = min(allowed, key=lambda x: abs(x - base_duration))
        activity = BREAKS[0].type  # default to first activity
        return duration, activity

    settings = get_settings()
    if not settings.openrouter_api_key:
        return deterministic_fallback()

    # Build context for AI
    stuck_context = ", ".join(stuck_signals) if stuck_signals else "none"
    problem_context = problem[:300] if problem else "no description provided"

    messages = [
        {"role": "system", "content": (
            "You are a calm senior developer recommending a break duration and activity. "
            "Choose duration from exactly these options: 180 (3 min), 300 (5 min), 600 (10 min), 900 (15 min) seconds. "
            "Choose activity from: walk_outside, stretch, water_eyes, breathing, sunlight. "
            "Consider: problem context, session length, stuck signals. "
            "Reply with JSON only: {\"duration_sec\": <int>, \"activity_type\": <string>}. "
            "No explanations, no extra text."
        )},
        {"role": "user", "content": f"Category: {category}\nProblem: {problem_context}\nSession minutes: {session_minutes:.0f}\nStuck signals: {stuck_context}"},
    ]
    try:
        raw = await _chat(messages, max_tokens=60)
        # Parse JSON response
        import json
        parsed = json.loads(raw.strip())
        duration = int(parsed.get("duration_sec", 300))
        activity = parsed.get("activity_type", "walk_outside")
        # Validate duration
        allowed_durations = (180, 300, 600, 900)
        if duration not in allowed_durations:
            duration = min(allowed_durations, key=lambda x: abs(x - duration))
        # Validate activity
        from backend.services.breaks import BREAKS
        valid_activities = {b.type for b in BREAKS}
        if activity not in valid_activities:
            activity = "walk_outside"
        return duration, activity
    except Exception as exc:
        log.warning("break duration recommendation fallback: %s", type(exc).__name__)
        return deterministic_fallback()


async def generate_hypothesis(category: str, problem: str, error: str) -> tuple[str, str]:
    """Return (text, source). source is 'ai' or 'fallback'. Never raises."""
    messages = [
        {"role": "system", "content": (
            "You are a calm senior developer offering ONE tentative debugging hypothesis. "
            "Start with 'Could', 'One thing I'd check', 'May I suggest', or 'It might be'. "
            "Never claim certainty. No code, no lists, at most two sentences. "
            "Do not repeat identifiers, secrets, or tokens from the problem.")},
        {"role": "user", "content": f"Category: {category}\nProblem: {problem[:500]}\nError: {error[:300]}"},
    ]
    try:
        raw = await _chat(messages, max_tokens=120)
        safe = _ensure_tentative(raw, category)
        if safe:
            return safe, "ai"
        log.warning("hypothesis discarded by validator")
    except Exception as exc:
        log.warning("hypothesis fallback: %s", type(exc).__name__)
    return fallback_hypothesis(category), "fallback"
