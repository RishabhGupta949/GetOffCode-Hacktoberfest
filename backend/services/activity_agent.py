"""AI activity evaluation: the agent that decides when to suggest a break.

The model sees ONLY aggregate signals (session length, tab-switch frequency,
idle state, domain category). It returns a verdict: suggest or not, a brief
reason, and the break duration + activity. Every failure path returns a
deterministic fallback marked source="fallback" so the UI never claims an
AI decision that did not happen.
"""

import json
import logging

from backend.config import get_settings
from backend.services import ai_client
from backend.services.activity import ActivityInput, score_activity
from backend.services.breaks import BREAKS

log = logging.getLogger("touchgrass.ai")

ALLOWED_DURATIONS = (180, 300, 600, 900)
MAX_REASON_LEN = 200


class ActivityVerdict:
    """Outcome of one activity evaluation."""

    __slots__ = ("suggest", "reason", "duration_sec", "activity_type", "source")

    def __init__(self, suggest: bool, reason: str, duration_sec: int,
                 activity_type: str, source: str):
        self.suggest = suggest
        self.reason = reason
        self.duration_sec = duration_sec
        self.activity_type = activity_type
        self.source = source  # "ai" | "fallback"

    def as_dict(self) -> dict:
        return {
            "suggest": self.suggest,
            "reason": self.reason,
            "duration_sec": self.duration_sec,
            "activity_type": self.activity_type,
            "source": self.source,
        }


def deterministic_break_choice(session_minutes: float, stuck_signals: list[str]) -> tuple[int, str]:
    """Deterministic duration/activity rule shared by every fallback path."""
    base_duration = 300
    if session_minutes > 90:
        base_duration = 600
    if session_minutes > 180:
        base_duration = 900
    if "explicit_stuck" in stuck_signals:
        base_duration = max(base_duration, 600)
    if "high_tab_switches" in stuck_signals:
        base_duration = max(base_duration, 600)
    duration = min(ALLOWED_DURATIONS, key=lambda x: abs(x - base_duration))
    return duration, BREAKS[0].type


def _fallback_verdict(a: ActivityInput, suggest: bool) -> ActivityVerdict:
    duration, activity = deterministic_break_choice(a.session_minutes, [])
    if suggest:
        reason = (f"{a.tab_switches_5m} tab switches in the last 5 minutes "
                  f"after about {int(a.session_minutes)} minutes of work.")
    else:
        reason = "Signals look calm right now."
    return ActivityVerdict(suggest, reason[:MAX_REASON_LEN], duration, activity, "fallback")


async def evaluate_activity_with_ai(a: ActivityInput, demo: bool = False) -> ActivityVerdict:
    """Let the model judge the aggregate activity signals.

    `demo` forces a suggestion even on weak signals so the 15-second demo
    trigger is predictable; the model still picks the duration. Never raises.
    """
    settings = get_settings()
    _, candidate = score_activity(a)

    if not settings.openrouter_api_key:
        # No model configured: honest deterministic decision, marked as such.
        return _fallback_verdict(a, suggest=demo or candidate)

    messages = [
        {"role": "system", "content": (
            "You are the TouchGrass activity agent for a developer's browser. "
            "You receive ONLY aggregate signals: session minutes, tab switches in the last 5 minutes, "
            "active domain, and idle state. You never see page content. "
            "Decide whether the developer should be offered a break right now. "
            "Suggest a break when the signals show fatigue or stuckness: many tab switches (searching, "
            "hopping), a long uninterrupted session, or repeated switching on docs/search sites. "
            "Decline when the session is short, calm, or the user has been idle. "
            "Reply with JSON only: "
            "{\"suggest\": true|false, \"reason\": \"<brief explanation, max 160 chars>\", "
            "\"duration_sec\": 180|300|600|900, \"activity_type\": walk_outside|stretch|water_eyes|breathing|sunlight}. "
            "600 is 10 minutes; prefer 600 or 900 for long sessions or heavy switching."
        )},
        {"role": "user", "content": (
            f"session_minutes: {a.session_minutes:.0f}\n"
            f"tab_switches_5m: {a.tab_switches_5m}\n"
            f"active_domain: {a.active_domain or 'unknown'}\n"
            f"idle_ms: {a.idle_ms}\n"
            f"demo_mode: {'true' if demo else 'false'}"
        )},
    ]
    try:
        raw = await ai_client._chat(messages, max_tokens=120)
        parsed = json.loads(raw.strip())
        if not isinstance(parsed, dict):
            raise ValueError("verdict is not an object")
        suggest = bool(parsed.get("suggest", False))
        if demo:
            suggest = True  # the demo trigger always shows the flow
        reason = str(parsed.get("reason", "")).strip()[:MAX_REASON_LEN]
        duration = int(parsed.get("duration_sec", 300))
        if duration not in ALLOWED_DURATIONS:
            duration = min(ALLOWED_DURATIONS, key=lambda x: abs(x - duration))
        activity = str(parsed.get("activity_type", BREAKS[0].type))
        if activity not in {b.type for b in BREAKS}:
            activity = BREAKS[0].type
        if not reason:
            reason = "The activity agent suggested a break."
        return ActivityVerdict(suggest, reason, duration, activity, "ai")
    except Exception as exc:  # network, auth, timeout, bad JSON
        log.warning("activity evaluation fallback: %s", type(exc).__name__)
        return _fallback_verdict(a, suggest=demo or candidate)
