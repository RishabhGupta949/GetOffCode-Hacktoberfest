"""Semantic cache: hit reuses pattern, miss calls AI path, AI failure falls back."""

import asyncio

import numpy as np
import pytest

from backend.services import cache
from backend.storage.db import db


def test_normalize_strips_punctuation_and_stopwords():
    out = cache.normalize("Redis GET returns stale data after PATCH!")
    assert "redis" in out
    assert "patch" in out
    assert "!" not in out
    assert "the" not in out.split()


def test_cache_miss_then_hit(client, fake_embedder):
    # Same category, semantically similar problems.
    p1 = "Redis GET returns stale data after PATCH"
    p2 = "Redis isn't reflecting my PATCH update"  # different wording

    text1, source1 = resolve(p1)
    assert source1 in ("ai", "fallback")   # first request: miss
    # AI has no key in tests -> fallback text was produced and NOT stored.
    # Seed the cache through the public store() API with a real vector.
    vec1 = cache.embed(cache.normalize(f"{p1} "))
    cache.store("redis", vec1, "CACHED_PATTERN: check the cache key on both paths.")

    text2, source2 = resolve(p2)
    assert source2 == "cache"
    assert "CACHED_PATTERN" in text2

    with db() as conn:
        row = conn.execute("SELECT hits FROM cache_entries WHERE category = 'redis'").fetchone()
    assert row["hits"] >= 1


def test_cache_miss_for_different_problem(client, fake_embedder):
    vec = cache.embed(cache.normalize("Docker container cannot reach postgres host"))
    assert cache.lookup("docker", vec) is None  # nothing stored in this category


def test_cache_threshold_respected(client, fake_embedder):
    # Store a redis pattern, query with an orthogonal vector.
    vec = cache.embed(cache.normalize("Redis GET returns stale data after PATCH"))
    cache.store("redis", vec, "PATTERN_A")
    unrelated = cache.embed(cache.normalize("wholly unrelated gibberish text"))
    assert cache.lookup("redis", unrelated) is None


def test_ai_failure_returns_tentative_fallback(client):
    # No OPENROUTER_API_KEY configured -> generate_hypothesis must not raise.
    import asyncio
    from backend.services.ai_client import generate_hypothesis
    text, source = asyncio.run(generate_hypothesis(
        "redis", "Redis GET returns stale data", "ECONNREFUSED"))
    assert source == "fallback"
    assert text and any(m in text.lower() for m in ("could", "one thing i'd check"))
    # No guaranteed language.
    assert "guaranteed" not in text.lower()
    assert "definitely" not in text.lower()


def resolve(problem: str, category: str = "redis"):
    """Synchronous wrapper around cache.resolve_hypothesis for sync tests."""
    return asyncio.run(cache.resolve_hypothesis(category, problem, ""))
