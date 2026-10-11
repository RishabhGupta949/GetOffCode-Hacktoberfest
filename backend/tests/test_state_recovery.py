"""Stale BREAK_ACTIVE recovery and duplicate break-start handling.

A break that is still legitimately running must never be reset, but a break
whose timer already elapsed while the user was away must not trap the session
in BREAK_ACTIVE forever. Recovery uses only the existing supported transition.
"""

import time

from backend.storage.db import db


def _backdate_break(sid: str, seconds_ago: int) -> None:
    past = int(time.time()) - seconds_ago
    with db() as conn:
        conn.execute("UPDATE sessions SET break_ends_at = ? WHERE session_id = ?",
                     (past, sid))


def _session_row(sid: str):
    with db() as conn:
        return conn.execute("SELECT * FROM sessions WHERE session_id = ?",
                            (sid,)).fetchone()


def _start_break(client, sid: str) -> dict:
    r = client.post("/api/v1/stuck", json={"session_id": sid, "problem": "flaky test"})
    assert r.status_code == 200
    r = client.post("/api/v1/break/start", json={"session_id": sid})
    assert r.status_code == 200
    return r.json()


def test_stuck_with_expired_break_recovers_via_existing_transition(client):
    """A stale (elapsed) break is completed via BREAK_ACTIVE -> RETURNED -> REFLECTION."""
    sid = "sess_stuck_recovery"
    started = _start_break(client, sid)
    _backdate_break(sid, 5)

    r = client.post("/api/v1/stuck", json={"session_id": sid, "problem": "again"})

    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "BREAK_RECOVERED"
    row = _session_row(sid)
    assert row["state"] == "REFLECTION"
    assert row["break_ends_at"] is None
    assert row["break_title"] is None
    assert row["break_id"] == started["break_id"]  # history preserved, not reset


def test_stuck_with_active_break_still_conflicts(client):
    """A legitimately running break is never reset: plain conflict, state untouched."""
    sid = "sess_stuck_active"
    started = _start_break(client, sid)

    r = client.post("/api/v1/stuck", json={"session_id": sid, "problem": "impatient"})

    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "BREAK_STILL_ACTIVE"
    row = _session_row(sid)
    assert row["state"] == "BREAK_ACTIVE"
    assert row["break_id"] == started["break_id"]
    assert row["break_ends_at"] == started["ends_at"]


def test_break_start_with_expired_break_recovers(client):
    sid = "sess_start_recovery"
    _start_break(client, sid)
    _backdate_break(sid, 5)

    r = client.post("/api/v1/break/start", json={"session_id": sid})

    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "BREAK_RECOVERED"
    row = _session_row(sid)
    assert row["state"] == "REFLECTION"
    assert row["break_ends_at"] is None


def test_break_start_duplicate_with_active_break_conflicts_without_reset(client):
    """Duplicate break-start while running: reject, keep the original break intact."""
    sid = "sess_dup_start"
    started = _start_break(client, sid)

    r = client.post("/api/v1/break/start", json={"session_id": sid})

    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "BREAK_STILL_ACTIVE"
    row = _session_row(sid)
    assert row["state"] == "BREAK_ACTIVE"
    assert row["break_id"] == started["break_id"]
    assert row["break_ends_at"] == started["ends_at"]


def test_later_session_starts_after_stale_break_recovered(client):
    """End-to-end: after a stale break is recovered the user is never trapped."""
    sid = "sess_recovery_flow"
    _start_break(client, sid)
    _backdate_break(sid, 5)

    r = client.post("/api/v1/stuck", json={"session_id": sid, "problem": "again"})
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "BREAK_RECOVERED"

    # Complete the reflection flow the recovered break leads into, then resume.
    assert client.post("/api/v1/reflect",
                       json={"session_id": sid, "choice": "idea"}).json()["state"] == "USER_HAS_IDEA"
    assert client.post("/api/v1/resume", json={"session_id": sid}).json()["state"] == "WORKING"

    # A later session starts with no conflict.
    r = client.post("/api/v1/stuck", json={"session_id": sid, "problem": "brand new"})
    assert r.status_code == 200
    assert r.json()["state"] == "BREAK_OFFERED"
    r = client.post("/api/v1/break/start", json={"session_id": sid})
    assert r.status_code == 200
    assert r.json()["state"] == "BREAK_ACTIVE"


def test_early_return_from_running_break_still_works(client):
    """Regression guard: the early-return soft lock is unchanged."""
    sid = "sess_early_return_guard"
    _start_break(client, sid)

    end = client.post("/api/v1/break/end", json={"session_id": sid, "early": True})

    assert end.status_code == 200
    assert end.json()["state"] == "REFLECTION"
