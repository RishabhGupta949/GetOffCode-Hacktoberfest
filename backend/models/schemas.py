from typing import Literal, Optional

from pydantic import BaseModel, Field


class ActivityRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)
    # Only the hostname of the active tab. No path, query, or title.
    active_domain: Optional[str] = Field(default=None, max_length=253)
    idle_ms: int = Field(default=0, ge=0)
    tab_switches_5m: int = Field(default=0, ge=0, le=10_000)
    explicit_stuck: bool = False
    # Demo trigger: evaluate even on weak signals (the 15-second demo).
    demo: bool = False


class ActivityResponse(BaseModel):
    state: str
    score: float
    candidate: bool


class StuckRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)
    # Optional, user-typed. Truncated server-side.
    problem: Optional[str] = Field(default=None, max_length=1000)
    error: Optional[str] = Field(default=None, max_length=500)


class BreakOffer(BaseModel):
    type: str
    title: str
    duration_sec: int
    demo: bool


class StuckResponse(BaseModel):
    state: str
    snapshot_id: str
    category: str
    offer: BreakOffer


class SessionRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)


class BreakStartResponse(BaseModel):
    state: str
    break_id: str
    title: str
    type: str
    ends_at: int           # unix seconds
    duration_sec: int
    demo: bool


class BreakEndRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)
    early: bool = False


class ReflectRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)
    choice: Literal["idea", "maybe", "none"]


class ReflectResponse(BaseModel):
    state: str
    allow_ai: bool


class HypothesisRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)


class HypothesisResponse(BaseModel):
    state: str
    hypothesis_id: str
    hypothesis: str
    category: str
    source: Literal["ai", "cache", "fallback"]


class FeedbackRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)
    hypothesis_id: str
    outcome: Literal["fixed", "partial", "none"]


class FeedbackResponse(BaseModel):
    state: str
    stored: bool


class StateResponse(BaseModel):
    """Deliberately contains NO problem/snapshot data."""
    state: str
    break_ends_at: Optional[int] = None
    break_title: Optional[str] = None
    demo: bool


class ActivitySuggestResponse(BaseModel):
    """Result of one automatic activity evaluation.

    `source` is "ai" (model decided), "fallback" (deterministic decision,
    model unavailable/failed) or "gate" (no evaluation ran: calm/idle).
    The UI shows it so an AI decision is never claimed when it was not made.
    """
    state: str
    suggest: bool
    score: float
    source: str
    reason: str = ""
    offer: Optional[BreakOffer] = None
    snapshot_id: Optional[str] = None
    demo_trigger: bool = False
