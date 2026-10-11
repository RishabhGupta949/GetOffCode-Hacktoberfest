"""Session state persistence. The backend is the source of truth for AppState.

Every transition goes through `transition()`, which validates against
VALID_TRANSITIONS inside one DB transaction. The extension only mirrors state.
"""

import sqlite3
import time

from backend.models.state import AppState, check_transition
from backend.storage.db import db


def load_or_create(conn: sqlite3.Connection, session_id: str) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
    if row is None:
        now = int(time.time())
        conn.execute(
            "INSERT INTO sessions (session_id, state, started_at, updated_at) VALUES (?, ?, ?, ?)",
            (session_id, AppState.IDLE.value, now, now),
        )
        row = conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
    return row


def get(session_id: str) -> sqlite3.Row:
    with db() as conn:
        return load_or_create(conn, session_id)


def transition(conn: sqlite3.Connection, session_id: str, target: AppState, **fields) -> sqlite3.Row:
    """Validate and apply a transition. `fields` are extra columns to update.

    Raises InvalidTransition if the move is not allowed.
    """
    row = load_or_create(conn, session_id)
    current = AppState(row["state"])
    check_transition(current, target)
    allowed = {"snapshot_id", "break_id", "break_ends_at", "break_title", "break_index"}
    assignments = ["state = ?", "updated_at = ?"]
    values: list = [target.value, int(time.time())]
    for key, value in fields.items():
        if key not in allowed:
            raise ValueError(f"unknown session field {key}")
        assignments.append(f"{key} = ?")
        values.append(value)
    values.append(session_id)
    conn.execute(f"UPDATE sessions SET {', '.join(assignments)} WHERE session_id = ?", values)
    return conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()


def to_state(row: sqlite3.Row) -> AppState:
    return AppState(row["state"])
