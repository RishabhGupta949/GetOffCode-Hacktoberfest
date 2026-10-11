"""Deterministic activity / stuck scoring. No AI, no network.

This is a heuristic, not psychological detection. Its only job is to decide
when to *offer* a break. The user always has the final say.
"""

from dataclasses import dataclass

from backend.config import get_settings

SEARCH_OR_DOCS_HINTS = (
    "google.", "bing.", "duckduckgo.", "stackoverflow.", "stackexchange.",
    "github.", "developer.mozilla.org", "docs.", "readthedocs.",
)


@dataclass(frozen=True)
class ActivityInput:
    active_domain: str | None
    idle_ms: int
    tab_switches_5m: int
    session_minutes: float
    explicit_stuck: bool


def score_activity(a: ActivityInput) -> tuple[float, bool]:
    """Return (score in [0, 1], candidate_for_stuck).

    Explicit "I'm stuck" always yields candidate=True.
    Idle beyond the reset threshold yields 0: the developer is away, not stuck.
    """
    settings = get_settings()

    if a.explicit_stuck:
        return 1.0, True

    if a.idle_ms >= settings.idle_reset_ms:
        return 0.0, False

    score = 0.0

    # Rapid tab switching suggests searching / hopping between references.
    if a.tab_switches_5m >= 10:
        score += 0.45
    elif a.tab_switches_5m >= 6:
        score += 0.25
    elif a.tab_switches_5m >= 3:
        score += 0.10

    # Switching while on search/docs hosts is a stronger "looping" hint.
    domain = (a.active_domain or "").lower()
    if a.tab_switches_5m >= 3 and any(h in domain for h in SEARCH_OR_DOCS_HINTS):
        score += 0.15

    # A long session is a weak hint that the same problem is being chewed on.
    if a.session_minutes >= 90:
        score += 0.25
    elif a.session_minutes >= 45:
        score += 0.10

    score = min(score, 1.0)
    return round(score, 2), score >= settings.stuck_threshold
