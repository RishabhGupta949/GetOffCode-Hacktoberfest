"""Semantic cache for reusable hypothesis patterns.

Flow:  problem -> normalize -> embed (MiniLM-L6-v2, CPU) -> cosine search over
cache rows of the same category -> hit: reuse pattern | miss: Nemotron -> store.

What is stored: category, embedding, hypothesis pattern, timestamps, hit count.
What is NOT stored: the raw problem text or error. Only the vector and the
model's pattern text, which the prompt asks to keep free of identifiers.

Any failure here (model missing, DB error) degrades to a cache miss.
"""

import logging
import re
import time
from typing import Callable

import numpy as np

from backend.config import get_settings
from backend.services.ai_client import generate_hypothesis
from backend.storage.db import db

log = logging.getLogger("touchgrass.cache")

CACHE_TTL_DAYS = 30
CACHE_MAX_ROWS = 500

STOPWORDS = frozenset(
    "a an and are as at be but by for from had has have i in is it its of on or "
    "that the this to was were will with my your our their we you they".split()
)

EmbedFn = Callable[[str], np.ndarray]
_embedder: EmbedFn | None = None
_embedder_failed = False


class EmbeddingUnavailable(RuntimeError):
    pass


def normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    words = [w for w in text.split() if w not in STOPWORDS]
    return " ".join(words[:128])


def set_embedder(fn: EmbedFn | None) -> None:
    """Inject an embedder (used by tests). Pass None to reset to the default."""
    global _embedder, _embedder_failed
    _embedder = fn
    _embedder_failed = False


def _default_embedder() -> EmbedFn:
    global _embedder_failed
    if _embedder_failed:
        raise EmbeddingUnavailable("embedding model previously failed to load")
    try:
        from sentence_transformers import SentenceTransformer  # heavy import, lazy
        model = SentenceTransformer(get_settings().embedding_model, device="cpu")
    except Exception as exc:
        _embedder_failed = True
        raise EmbeddingUnavailable(type(exc).__name__) from exc

    def embed(text: str) -> np.ndarray:
        return model.encode([text], normalize_embeddings=True, convert_to_numpy=True)[0].astype(np.float32)

    return embed


def embed(text: str) -> np.ndarray:
    fn = _embedder or _default_embedder()
    vec = np.asarray(fn(text), dtype=np.float32)
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec


def lookup(category: str, vec: np.ndarray) -> tuple[int, str, float] | None:
    """Best same-category row at or above the threshold, or None."""
    threshold = get_settings().cache_similarity_threshold
    with db() as conn:
        rows = conn.execute(
            "SELECT id, embedding, hypothesis_pattern FROM cache_entries WHERE category = ? AND created_at >= ?",
            (category, int(time.time()) - CACHE_TTL_DAYS * 86400),
        ).fetchall()
        best: tuple[int, str, float] | None = None
        for row in rows:
            stored = np.frombuffer(row["embedding"], dtype=np.float32)
            if stored.shape != vec.shape:
                continue
            score = float(np.dot(vec, stored))  # both vectors are unit-normalized
            if score >= threshold and (best is None or score > best[2]):
                best = (row["id"], row["hypothesis_pattern"], score)
        if best:
            conn.execute("UPDATE cache_entries SET hits = hits + 1 WHERE id = ?", (best[0],))
    return best


def store(category: str, vec: np.ndarray, pattern: str) -> None:
    with db() as conn:
        conn.execute(
            "INSERT INTO cache_entries (category, embedding, hypothesis_pattern, hits, created_at) VALUES (?, ?, ?, 0, ?)",
            (category, vec.astype(np.float32).tobytes(), pattern, int(time.time())),
        )
        conn.execute(
            "DELETE FROM cache_entries WHERE id NOT IN (SELECT id FROM cache_entries ORDER BY created_at DESC LIMIT ?)",
            (CACHE_MAX_ROWS,),
        )


async def resolve_hypothesis(category: str, problem: str, error: str) -> tuple[str, str]:
    """Return (hypothesis, source) where source is 'cache', 'ai', or 'fallback'."""
    vec = None
    try:
        vec = embed(normalize(f"{problem} {error}"))
        hit = lookup(category, vec)
        if hit is not None:
            log.info("cache hit score=%.3f", hit[2])
            return hit[1], "cache"
        log.info("cache miss")
    except Exception as exc:  # embedding or DB failure -> behave as a miss
        log.warning("cache unavailable: %s", type(exc).__name__)
        vec = None

    text, source = await generate_hypothesis(category, problem, error)
    if source == "ai" and vec is not None:
        try:
            store(category, vec, text)
        except Exception as exc:
            log.warning("cache store failed: %s", type(exc).__name__)
    return text, source
