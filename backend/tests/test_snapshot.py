"""Snapshot creation, retention and expiry cleanup."""

import time

from backend.storage.db import db


def test_snapshot_created_and_cleaned_after_retention(client):
    sid = "sess_snap_1"
    r = client.post("/api/v1/stuck", json={
        "session_id": sid, "problem": "ECONNREFUSED 127.0.0.1:3000 in container"})
    snap_id = r.json()["snapshot_id"]

    with db() as conn:
        row = conn.execute("SELECT * FROM snapshots WHERE id = ?", (snap_id,)).fetchone()
    assert row is not None
    assert row["expires_at"] - row["created_at"] == 24 * 3600

    # Age the snapshot past retention.
    with db() as conn:
        conn.execute("UPDATE snapshots SET expires_at = ? WHERE id = ?",
                     (int(time.time()) - 1, snap_id))

    from backend.services.snapshot import cleanup_expired
    removed = cleanup_expired()
    assert removed >= 1

    with db() as conn:
        row = conn.execute("SELECT 1 FROM snapshots WHERE id = ?", (snap_id,)).fetchone()
    assert row is None


def test_category_from_keywords_without_ai(client):
    r = client.post("/api/v1/stuck", json={
        "session_id": "sess_cat_docker",
        "problem": "Works locally but fails inside the container"})
    assert r.status_code == 200
    assert r.json()["category"] == "docker"

    r = client.post("/api/v1/stuck", json={
        "session_id": "sess_cat_redis", "problem": "Redis GET stale after PATCH"})
    assert r.json()["category"] == "redis"
