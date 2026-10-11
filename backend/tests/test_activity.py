"""Deterministic activity scoring: no AI, expected thresholds."""

from backend.config import get_settings
from backend.services.activity import ActivityInput, score_activity


def act(**kw):
    base = dict(active_domain="example.com", idle_ms=1000, tab_switches_5m=0,
                session_minutes=10, explicit_stuck=False)
    base.update(kw)
    return ActivityInput(**base)


def test_explicit_stuck_is_always_candidate():
    score, candidate = score_activity(act(explicit_stuck=True))
    assert candidate is True
    assert score == 1.0


def test_long_idle_is_not_stuck():
    score, candidate = score_activity(act(idle_ms=6 * 60 * 1000))
    assert score == 0.0
    assert candidate is False


def test_heavy_tab_switching_is_candidate():
    score, candidate = score_activity(act(tab_switches_5m=10, active_domain="google.com"))
    assert candidate is True
    assert score >= get_settings().stuck_threshold


def test_calm_activity_is_not_candidate():
    score, candidate = score_activity(act())
    assert candidate is False
    assert score < get_settings().stuck_threshold


def test_long_session_adds_weight():
    calm, _ = score_activity(act())
    long_session, _ = score_activity(act(session_minutes=120))
    assert long_session > calm


def test_score_never_exceeds_one():
    score, _ = score_activity(act(explicit_stuck=False, tab_switches_5m=100,
                                  session_minutes=600, active_domain="google.com"))
    assert 0.0 <= score <= 1.0
