"""Problem snapshot: the minimum context needed for a later hypothesis.

Stored locally in SQLite. Retention: 24h (configurable). Expired rows are
deleted on startup, on every snapshot write, and on access.
"""

import re
import time
import uuid
from dataclasses import dataclass

from backend.config import get_settings
from backend.storage.db import db

CATEGORIES: tuple[str, ...] = (
    "debugging", "redis", "database", "api_backend", "docker", "deployment",
    "networking", "authentication", "frontend", "performance", "architecture",
    "algorithms", "build_tooling", "configuration", "other",
)

# Ordered keyword rules: first match wins. Deterministic, no AI.
_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("redis", ("redis", "cache", "ttl", "cache key")),
    ("docker", ("docker", "container", "compose", "dockerfile", "image")),
    ("database", ("sql", "postgres", "mysql", "sqlite", "query", "migration", "transaction", "orm")),
    ("networking", ("econnrefused", "econnreset", "dns", "cors", "port", "socket", "timeout", "proxy", "localhost")),
    ("authentication", ("auth", "login", "token", "jwt", "oauth", "permission", "403", "401", "session cookie")),
    ("deployment", ("deploy", "render", "vercel", "netlify", "production", "ci/cd", "pipeline")),
    ("build_tooling", ("webpack", "vite", "npm", "pip", "build", "compile", "bundler", "lint")),
    ("configuration", ("env var", "environment", "config", ".env", "setting")),
    ("api_backend", ("api", "endpoint", "route", "fastapi", "express", "request", "response", "patch", "get ", "post ")),
    ("frontend", ("react", "css", "html", "dom", "component", "render", "hydration", "browser")),
    ("performance", ("slow", "latency", "memory", "cpu", "leak", "performance")),
    ("algorithms", ("algorithm", "complexity", "recursion", "dynamic programming", "graph")),
    ("architecture", ("architecture", "design", "pattern", "refactor", "coupling")),
    ("debugging", ("bug", "error", "exception", "stack trace", "crash", "stale", "wrong", "fails")),
)


def categorize_keywords(text: str) -> str | None:
    """Deterministic category from keywords. Returns None when nothing matches."""
    t = f" {text.lower()} "
    for category, words in _KEYWORDS:
        if any(w in t for w in words):
            return category
    return None


def clean_text(value: str | None, limit: int) -> str:
    if not value:
        return ""
    value = re.sub(r"\s+", " ", value).strip()
    return value[:limit]


@dataclass(frozen=True)
class Snapshot:
    id: str
    session_id: str
    category: str
    problem: str
    error: str
    duration_sec: int | None = None
    activity_type: str | None = None


def cleanup_expired() -> int:
    with db() as conn:
        cur = conn.execute("DELETE FROM snapshots WHERE expires_at < ?", (int(time.time()),))
        return cur.rowcount


def create_snapshot(session_id: str, category: str, problem: str, error: str, duration_sec: int | None = None, activity_type: str | None = None) -> str:
    cleanup_expired()
    snap_id = f"snap_{uuid.uuid4().hex[:12]}"
    now = int(time.time())
    expires = now + get_settings().snapshot_retention_hours * 3600
    with db() as conn:
        conn.execute(
            "INSERT INTO snapshots (id, session_id, category, problem, error, duration_sec, activity_type, created_at, expires_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (snap_id, session_id, category, problem, error, duration_sec, activity_type, now, expires),
        )
    return snap_id


def get_snapshot(snap_id: str | None) -> Snapshot | None:
    if not snap_id:
        return None
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM snapshots WHERE id = ? AND expires_at >= ?",
            (snap_id, int(time.time())),
        ).fetchone()
    if row is None:
        return None
    return Snapshot(row["id"], row["session_id"], row["category"], row["problem"], row["error"] or "",
                    row["duration_sec"], row["activity_type"])


def delete_snapshot(snap_id: str | None) -> None:
    if not snap_id:
        return
    with db() as conn:
        conn.execute("DELETE FROM snapshots WHERE id = ?", (snap_id,))
