import sqlite3
from contextlib import contextmanager
from typing import Iterator

from backend.config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    session_id     TEXT PRIMARY KEY,
    state          TEXT NOT NULL,
    started_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL,
    snapshot_id    TEXT,
    break_id       TEXT,
    break_ends_at  INTEGER,
    break_title    TEXT,
    break_index    INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS snapshots (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL,
    category        TEXT NOT NULL,
    problem         TEXT NOT NULL,
    error           TEXT,
    duration_sec    INTEGER,
    activity_type   TEXT,
    created_at      INTEGER NOT NULL,
    expires_at      INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cache_entries (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    category            TEXT NOT NULL,
    embedding           BLOB NOT NULL,
    hypothesis_pattern  TEXT NOT NULL,
    hits                INTEGER NOT NULL DEFAULT 0,
    created_at          INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hypotheses (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL,
    category    TEXT NOT NULL,
    text        TEXT NOT NULL,
    source      TEXT NOT NULL,   -- 'ai' | 'cache' | 'fallback'
    created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    hypothesis_id TEXT NOT NULL,
    outcome       TEXT NOT NULL,   -- 'fixed' | 'partial' | 'none'
    created_at    INTEGER NOT NULL
);
"""


def connect() -> sqlite3.Connection:
    path = get_settings().db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    """Open a connection, commit on success, always close."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with db() as conn:
        conn.executescript(SCHEMA)
        # Migration: add missing columns if they don't exist (for existing databases)
        cursor = conn.execute("PRAGMA table_info(snapshots)")
        columns = {row[1] for row in cursor.fetchall()}
        if "duration_sec" not in columns:
            conn.execute("ALTER TABLE snapshots ADD COLUMN duration_sec INTEGER")
        if "activity_type" not in columns:
            conn.execute("ALTER TABLE snapshots ADD COLUMN activity_type TEXT")
