"""Break timer guard: ending early requires the `early` flag."""

import time

from backend.models.state import AppState as S
from backend.storage.db import db


def test_break_end_before_timer_rejected(client):
    sid = "sess_timer_guard"
    client.post("/api/v1/stuck", json={"session_id": sid, "problem": "timeout bug"})
    r = client.post("/api/v1/break/start", json={"session_id": sid})
    assert r.status_code == 200

    if not r.json()["demo"]:  # production duration (600s): not finished yet
        end = client.post("/api/v1/break/end", json={"session_id": sid, "early": False})
        assert end.status_code == 409
        assert end.json()["detail"]["code"] == "BREAK_NOT_FINISHED"

    # soft lock: the user can always leave early on purpose
    end = client.post("/api/v1/break/end", json={"session_id": sid, "early": True})
    assert end.status_code == 200
    assert end.json()["state"] == "REFLECTION"


def test_break_end_when_timer_elapsed(client):
    sid = "sess_timer_elapsed"
    client.post("/api/v1/stuck", json={"session_id": sid, "problem": "bug"})
    client.post("/api/v1/break/start", json={"session_id": sid})
    # Backdate the timer so the break is complete.
    past = int(time.time()) - 1
    with db() as conn:
        conn.execute("UPDATE sessions SET break_ends_at = ? WHERE session_id = ?",
                     (past, sid))
    end = client.post("/api/v1/break/end", json={"session_id": sid, "early": False})
    assert end.status_code == 200
    assert end.json()["state"] == "REFLECTION"


def test_demo_mode_break_duration(client):
    """In demo mode, break duration uses AI recommendation (not hardcoded 10s)."""
    import os
    os.environ["TOUCHGRASS_DEMO_MODE"] = "true"
    # Need to reload settings
    from backend.config import get_settings
    get_settings.cache_clear()
    from backend.main import app
    from backend.storage.db import init_db
    init_db()
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        sid = "sess_demo_break"
        r = c.post("/api/v1/stuck", json={"session_id": sid, "problem": "demo bug"})
        assert r.status_code == 200
        offer = r.json()["offer"]
        assert offer["demo"] is True
        # Demo mode should use AI-selected duration (from deterministic fallback: 300-900s)
        # Not hardcoded 10 seconds
        assert offer["duration_sec"] in (180, 300, 600, 900)
        assert offer["duration_sec"] != 10

        r = c.post("/api/v1/break/start", json={"session_id": sid})
        assert r.status_code == 200
        data = r.json()
        assert data["demo"] is True
        assert data["duration_sec"] in (180, 300, 600, 900)
        assert data["duration_sec"] != 10
        # ends_at should be approximately duration_sec seconds from now
        assert abs(data["ends_at"] - (int(time.time()) + data["duration_sec"])) <= 2
    get_settings.cache_clear()
    del os.environ["TOUCHGRASS_DEMO_MODE"]
