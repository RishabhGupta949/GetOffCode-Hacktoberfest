"""Shared fixtures: temp DB, fast fake embedder, test client."""

import os
import tempfile
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def temp_db_path(tmp_path_factory):
    path = tmp_path_factory.mktemp("tg") / "test.db"
    os.environ["TOUCHGRASS_DB_PATH"] = str(path)
    yield path
    for key in list(os.environ.keys()):
        if key.startswith("TOUCHGRASS_"):
            del os.environ[key]


@pytest.fixture()
def client(temp_db_path):
    from backend.config import get_settings
    get_settings.cache_clear()
    from backend.main import app
    from backend.storage.db import init_db
    init_db()
    with TestClient(app) as c:
        yield c
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def clean_cache(temp_db_path):
    """Cache rows are seeded mid-test; clear them so tests stay independent."""
    yield
    from backend.storage.db import db, init_db
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM cache_entries")


@pytest.fixture()
def fake_embedder():
    """Deterministic, dependency-free embedder for cache tests.

    Keys are NORMALIZED phrases (what cache.resolve_hypothesis actually embeds).
    Unknown texts map to a fixed orthogonal vector, never random.
    """
    from backend.services import cache

    vocab = {
        cache.normalize("Redis GET returns stale data after PATCH"): [1.0, 0.0, 0.0],
        cache.normalize("Redis isn't reflecting my PATCH update"): [0.95, 0.1, 0.0],
        cache.normalize("wholly unrelated gibberish text"): [0.0, 0.0, 1.0],
    }

    def embed(text: str) -> np.ndarray:
        return np.array(vocab.get(text.strip(), [0.0, 1.0, 0.0]), dtype=np.float32)

    cache.set_embedder(embed)
    yield embed
    cache.set_embedder(None)
