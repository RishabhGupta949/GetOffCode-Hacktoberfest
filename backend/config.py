from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_prefix="TOUCHGRASS_",
        extra="ignore",
    )

    # Demo mode: same flow, 10-second break instead of 10 minutes.
    demo_mode: bool = False
    break_duration_sec: int = 600
    demo_break_duration_sec: int = 10

    # Deterministic stuck scoring
    stuck_threshold: float = 0.6
    idle_reset_ms: int = 5 * 60 * 1000

    # Snapshots
    snapshot_retention_hours: int = 24

    # Semantic cache
    cache_similarity_threshold: float = 0.82
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Database (overridable for tests)
    db_path: Path = BACKEND_DIR.parent / "data" / "touchgrass.db"

    # OpenRouter (the only AI provider in P0). The key is read from the
    # environment variable OPENROUTER_API_KEY, not the TOUCHGRASS_ prefix.
    openrouter_api_key: str = ""
    openrouter_model: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    ai_timeout_sec: float = 8.0


@lru_cache()
def get_settings() -> Settings:
    import os

    s = Settings()
    # OPENROUTER_API_KEY is a standard name, so read it without the prefix.
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if key:
        s.openrouter_api_key = key
    return s
