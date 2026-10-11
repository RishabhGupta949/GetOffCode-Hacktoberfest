"""POST /activity/suggest: the automatic break-suggestion endpoint.

The deterministic scorer is a cheap gate; the AI agent makes the decision,
picks the duration, and explains why. Failures must be visible (source),
and the offer reuses the P0 snapshot/state-machine/break-offer flow.
"""

import time

from backend.services.activity_agent import ActivityVerdict
from backend.storage.db import db


def _post(client, sid, **kw):
    body = {"session_id": sid, "active_domain": "github.com", "idle_ms": 0,
            "tab_switches_5m": 0, "session_minutes": 0.0}
    body.update(kw)
    return client.post("/api/v1/activity/suggest", json=body)


def _verdict(**kw):
    base = dict(suggest=True, reason="12 tab switches in 5 minutes",
                duration_sec=900, activity_type="breathing", source="ai")
    base.update(kw)
    return ActivityVerdict(**base)


def _fake_verdict(**kw):
    """Async stub matching the real evaluate_activity_with_ai signature."""
    async def fake(a, demo=False):
        return _verdict(**kw)
    return fake


def _sentinel(*args, **kwargs):
    raise AssertionError("AI must not be called when the gate blocks evaluation")


def test_suggest_with_ai_offer_creates_offer_and_snapshot(client, monkeypatch):
    sid = "sess_suggest_ai"
    monkeypatch.setattr("backend.api.routes.evaluate_activity_with_ai",
                        _fake_verdict())

    r = _post(client, sid, tab_switches_5m=12, session_minutes=120)

    assert r.status_code == 200
    data = r.json()
    assert data["state"] == "BREAK_OFFERED"
    assert data["suggest"] is True
    assert data["source"] == "ai"
    assert data["reason"] == "12 tab switches in 5 minutes"
    assert data["offer"]["duration_sec"] == 900
    assert data["offer"]["type"] == "breathing"
    assert data["offer"]["title"]
    with db() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE session_id = ?", (sid,)).fetchone()
        assert row["state"] == "BREAK_OFFERED"
        snap = conn.execute("SELECT * FROM snapshots WHERE id = ?",
                            (row["snapshot_id"],)).fetchone()
        assert snap["duration_sec"] == 900
        assert snap["activity_type"] == "breathing"


def test_suggest_ai_declines_leaves_state_untouched(client, monkeypatch):
    sid = "sess_suggest_decline"
    monkeypatch.setattr("backend.api.routes.evaluate_activity_with_ai",
                        _fake_verdict(suggest=False, reason="calm session"))

    r = _post(client, sid, tab_switches_5m=12, session_minutes=120)

    assert r.status_code == 200
    data = r.json()
    assert data["suggest"] is False
    assert data["state"] == "IDLE"
    assert data["offer"] is None
    with db() as conn:
        assert conn.execute("SELECT COUNT(*) FROM snapshots WHERE session_id = ?",
                            (sid,)).fetchone()[0] == 0


def test_deterministic_gate_blocks_ai_on_weak_signals(client, monkeypatch):
    sid = "sess_suggest_gate"
    monkeypatch.setattr("backend.api.routes.evaluate_activity_with_ai", _sentinel)

    r = _post(client, sid, tab_switches_5m=0, session_minutes=2)

    assert r.status_code == 200
    data = r.json()
    assert data["suggest"] is False
    assert data["source"] == "gate"
    assert data["score"] < 0.6


def test_idle_never_triggers_evaluation(client, monkeypatch):
    sid = "sess_suggest_idle"
    monkeypatch.setattr("backend.api.routes.evaluate_activity_with_ai", _sentinel)

    r = _post(client, sid, tab_switches_5m=12, session_minutes=120,
              idle_ms=6 * 60 * 1000)  # past the idle reset threshold

    assert r.status_code == 200
    data = r.json()
    assert data["suggest"] is False
    assert data["score"] == 0.0


def test_suggest_rejected_while_break_offered(client):
    sid = "sess_suggest_offered"
    client.post("/api/v1/stuck", json={"session_id": sid, "problem": "p"})
    r = _post(client, sid, tab_switches_5m=12, session_minutes=120)
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "INVALID_TRANSITION"


def test_suggest_rejected_while_break_active(client):
    sid = "sess_suggest_active"
    client.post("/api/v1/stuck", json={"session_id": sid, "problem": "p"})
    client.post("/api/v1/break/start", json={"session_id": sid})
    r = _post(client, sid, tab_switches_5m=12, session_minutes=120)
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "BREAK_STILL_ACTIVE"


def test_ai_failure_falls_back_visibly(client, monkeypatch):
    sid = "sess_suggest_aifail"
    from backend.config import get_settings
    monkeypatch.setattr(get_settings(), "openrouter_api_key", "test-key")

    async def boom(messages, max_tokens):
        raise RuntimeError("openrouter down")

    monkeypatch.setattr("backend.services.ai_client._chat", boom)

    r = _post(client, sid, tab_switches_5m=12, session_minutes=120)

    assert r.status_code == 200
    data = r.json()
    assert data["suggest"] is True
    assert data["source"] == "fallback"  # must not claim an AI decision
    assert data["reason"]


def test_demo_mode_evaluates_even_with_weak_signals(client):
    """15s is the demo trigger, not the duration. The AI fallback still picks
    a real duration from the allowed set; demo never hard-codes it."""
    sid = "sess_suggest_demo"
    r = _post(client, sid, tab_switches_5m=0, session_minutes=0, demo=True)

    assert r.status_code == 200
    data = r.json()
    assert data["suggest"] is True
    assert data["demo_trigger"] is True
    assert data["source"] in ("ai", "fallback")
    assert data["offer"]["duration_sec"] in (180, 300, 600, 900)
    assert data["offer"]["duration_sec"] != 15


def test_auto_suggested_break_start_uses_ai_duration(client, monkeypatch):
    sid = "sess_suggest_start"
    monkeypatch.setattr("backend.api.routes.evaluate_activity_with_ai",
                        _fake_verdict(duration_sec=600))
    _post(client, sid, tab_switches_5m=12, session_minutes=120)

    r = client.post("/api/v1/break/start", json={"session_id": sid})

    assert r.status_code == 200
    data = r.json()
    assert data["state"] == "BREAK_ACTIVE"
    assert data["duration_sec"] == 600  # AI-selected duration survives the flow


def test_full_auto_cycle_preserves_p0_flow(client, monkeypatch):
    sid = "sess_suggest_cycle"
    monkeypatch.setattr("backend.api.routes.evaluate_activity_with_ai",
                        _fake_verdict())
    assert _post(client, sid, tab_switches_5m=12, session_minutes=120).json()["suggest"]

    assert client.post("/api/v1/break/start", json={"session_id": sid}).json()["state"] == "BREAK_ACTIVE"
    assert client.post("/api/v1/break/end",
                       json={"session_id": sid, "early": True}).json()["state"] == "REFLECTION"
    assert client.post("/api/v1/reflect",
                       json={"session_id": sid, "choice": "idea"}).json()["state"] == "USER_HAS_IDEA"
    assert client.post("/api/v1/resume", json={"session_id": sid}).json()["state"] == "WORKING"
    # A later session starts with no conflict after the auto-suggested cycle.
    r = client.post("/api/v1/stuck", json={"session_id": sid, "problem": "again"})
    assert r.status_code == 200
    assert r.json()["state"] == "BREAK_OFFERED"
