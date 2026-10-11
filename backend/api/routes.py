"""HTTP API. Every endpoint validates the current AppState before doing work.

Invariants enforced here (not in the LLM):
  * /stuck, /hypothesis, /feedback are rejected in BREAK_ACTIVE (409).
  * /hypothesis only runs in AI_ASSISTANCE_ALLOWED (reached only via "No").
  * /state never returns snapshot/problem data.
"""

import time
import uuid

from fastapi import APIRouter, HTTPException

from backend.config import get_settings
from backend.models import schemas as s
from backend.models.state import AppState, InvalidTransition
from backend.services import cache, session
from backend.services.activity import ActivityInput, score_activity
from backend.services.activity_agent import evaluate_activity_with_ai
from backend.services.ai_client import classify_with_ai, fallback_hypothesis, recommend_break_duration
from backend.services.breaks import pick_break
from backend.services.snapshot import (
    categorize_keywords, clean_text, create_snapshot, delete_snapshot, get_snapshot,
)
from backend.storage.db import db

router = APIRouter(prefix="/api/v1")
S = AppState

NO_DESCRIPTION = "(no description given)"


def _conflict(msg: str, code: str) -> HTTPException:
    return HTTPException(status_code=409, detail={"error": msg, "code": code})


def _break_active_conflict(session_id: str) -> HTTPException | None:
    """Guard for requests that cannot proceed while a break is active.

    Returns an HTTPException to raise, or None when the caller may proceed.
    A break whose timer already elapsed (stale) is completed through the
    existing supported transition BREAK_ACTIVE -> RETURNED -> REFLECTION, so
    the session is never trapped. A break that is still legitimately running
    is never touched; it is rejected with BREAK_STILL_ACTIVE.
    """
    with db() as conn:
        row = session.load_or_create(conn, session_id)
        if AppState(row["state"]) != S.BREAK_ACTIVE:
            return None
        ends_at = row["break_ends_at"]
        if ends_at is not None and int(time.time()) >= ends_at:
            session.transition(conn, session_id, S.RETURNED,
                               break_ends_at=None, break_title=None)
            session.transition(conn, session_id, S.REFLECTION)
            return _conflict(
                "a previous break already ended; continue from reflection",
                "BREAK_RECOVERED",
            )
    return _conflict(
        "a break is still running; return from it first",
        "BREAK_STILL_ACTIVE",
    )


def _current(conn, session_id: str) -> AppState:
    return AppState(session.load_or_create(conn, session_id)["state"])


@router.get("/health")
async def health():
    return {"ok": True, "demo": get_settings().demo_mode,
            "ai_configured": bool(get_settings().openrouter_api_key)}


@router.get("/state", response_model=s.StateResponse)
async def get_state(session_id: str):
    settings = get_settings()
    with db() as conn:
        row = session.load_or_create(conn, session_id)
    state = AppState(row["state"])
    if state == S.BREAK_ACTIVE:
        # Only break-related fields. No snapshot, no problem, no hypothesis.
        return s.StateResponse(state=state.value, break_ends_at=row["break_ends_at"],
                               break_title=row["break_title"], demo=settings.demo_mode)
    return s.StateResponse(state=state.value, demo=settings.demo_mode)


@router.post("/activity", response_model=s.ActivityResponse)
async def post_activity(req: s.ActivityRequest):
    """Deterministic scoring only. No AI call, no snapshot."""
    settings = get_settings()
    now = int(time.time())
    with db() as conn:
        row = session.load_or_create(conn, req.session_id)
        state = AppState(row["state"])
        minutes = (now - row["started_at"]) / 60
        score, candidate = score_activity(ActivityInput(
            active_domain=req.active_domain, idle_ms=req.idle_ms,
            tab_switches_5m=req.tab_switches_5m, session_minutes=minutes,
            explicit_stuck=req.explicit_stuck,
        ))
        idle = req.idle_ms >= settings.idle_reset_ms
        targets: list[AppState] = []
        if idle:
            if state == S.WORKING:
                targets = [S.IDLE]
        elif state == S.IDLE:
            targets = [S.WORKING]
            if candidate:
                targets.append(S.POSSIBLY_STUCK)
        elif state == S.WORKING and candidate:
            targets = [S.POSSIBLY_STUCK]
        elif state == S.POSSIBLY_STUCK and not candidate:
            targets = [S.WORKING]
        # Activity never moves the app out of break/reflection/AI states.
        for target in targets:
            row = session.transition(conn, req.session_id, target)
            state = AppState(row["state"])
    return s.ActivityResponse(state=state.value, score=score, candidate=candidate)


@router.post("/activity/suggest", response_model=s.ActivitySuggestResponse)
async def activity_suggest(req: s.ActivityRequest):
    """Automatic break suggestion.

    The deterministic scorer is a cheap local gate; the AI agent decides,
    picks the duration, and explains why. Idle periods and calm signals
    never reach the model. The offer reuses the P0 snapshot + state-machine
    path, so accepting it starts the exact same break flow.
    """
    settings = get_settings()
    conflict = _break_active_conflict(req.session_id)
    if conflict is not None:
        raise conflict
    now = int(time.time())
    with db() as conn:
        row = session.load_or_create(conn, req.session_id)
        state = AppState(row["state"])
    if state not in (S.IDLE, S.WORKING, S.POSSIBLY_STUCK):
        raise _conflict(f"cannot evaluate activity from {state.value}", "INVALID_TRANSITION")

    a = ActivityInput(
        active_domain=req.active_domain, idle_ms=req.idle_ms,
        tab_switches_5m=req.tab_switches_5m,
        session_minutes=(now - row["started_at"]) / 60,
        explicit_stuck=False,
    )
    score, candidate = score_activity(a)

    # Cheap gate: idle users are away, not stuck; calm signals never call the model.
    if req.idle_ms >= settings.idle_reset_ms or (not candidate and not req.demo):
        return s.ActivitySuggestResponse(
            state=state.value, suggest=False, score=score, source="gate",
            demo_trigger=req.demo)

    verdict = await evaluate_activity_with_ai(a, demo=req.demo)
    if not verdict.suggest:
        return s.ActivitySuggestResponse(
            state=state.value, suggest=False, score=score,
            reason=verdict.reason, source=verdict.source,
            demo_trigger=req.demo)

    # Offer a break through the existing snapshot + transition path.
    category = categorize_keywords(req.active_domain or "") or "debugging"
    snap_id = create_snapshot(req.session_id, category, "", "",
                              verdict.duration_sec, verdict.activity_type)
    try:
        with db() as conn:
            if state == S.IDLE:
                session.transition(conn, req.session_id, S.WORKING)
            current = AppState(session.load_or_create(conn, req.session_id)["state"])
            if current != S.POSSIBLY_STUCK:
                session.transition(conn, req.session_id, S.POSSIBLY_STUCK)
            session.transition(conn, req.session_id, S.BREAK_OFFERED, snapshot_id=snap_id)
            from backend.services.breaks import BREAKS
            opt = next((b for b in BREAKS if b.type == verdict.activity_type), BREAKS[0])
    except InvalidTransition as exc:
        delete_snapshot(snap_id)
        raise _conflict(str(exc), "INVALID_TRANSITION") from exc

    return s.ActivitySuggestResponse(
        state=S.BREAK_OFFERED.value, suggest=True, score=score,
        reason=verdict.reason, source=verdict.source,
        offer=s.BreakOffer(type=opt.type, title=opt.title,
                           duration_sec=verdict.duration_sec, demo=settings.demo_mode),
        snapshot_id=snap_id, demo_trigger=req.demo)


@router.post("/stuck", response_model=s.StuckResponse)
async def post_stuck(req: s.StuckRequest):
    """Snapshot the minimal problem context and offer a break."""
    conflict = _break_active_conflict(req.session_id)
    if conflict is not None:
        raise conflict
    with db() as conn:
        state = _current(conn, req.session_id)
    if state not in (S.IDLE, S.WORKING, S.POSSIBLY_STUCK):
        raise _conflict(f"cannot offer a break from {state.value}", "INVALID_TRANSITION")

    problem = clean_text(req.problem, 1000)
    error = clean_text(req.error, 300)

    # Keywords first (free). The model only classifies when keywords fail.
    category = categorize_keywords(f"{problem} {error}")
    if category is None and problem:
        category = await classify_with_ai(problem)
    category = category or "debugging"

    # Get session info for duration recommendation
    with db() as conn:
        row = session.load_or_create(conn, req.session_id)
        session_minutes = (time.time() - row["started_at"]) / 60

    # Determine stuck signals for AI context
    stuck_signals = []
    if req.problem or req.error:
        stuck_signals.append("explicit_stuck")
    if session_minutes >= 90:
        stuck_signals.append("long_session")
    # Note: tab_switches not available here; activity sampling provides that separately

    # AI recommends duration and activity (with deterministic fallback)
    dur, act_type = await recommend_break_duration(category, problem, session_minutes, stuck_signals)

    snap_id = create_snapshot(req.session_id, category, problem or NO_DESCRIPTION, error, dur, act_type)
    try:
        with db() as conn:
            if state == S.IDLE:
                session.transition(conn, req.session_id, S.WORKING)
            current = AppState(session.load_or_create(conn, req.session_id)["state"])
            if current != S.POSSIBLY_STUCK:
                session.transition(conn, req.session_id, S.POSSIBLY_STUCK)
            row = session.transition(conn, req.session_id, S.BREAK_OFFERED, snapshot_id=snap_id)
            # Use AI-recommended activity type for the offer
            from backend.services.breaks import BREAKS
            opt = next((b for b in BREAKS if b.type == act_type), BREAKS[0])
    except InvalidTransition as exc:
        delete_snapshot(snap_id)
        raise _conflict(str(exc), "INVALID_TRANSITION") from exc

    settings = get_settings()
    # Use AI-recommended duration in both demo and normal mode
    return s.StuckResponse(
        state=S.BREAK_OFFERED.value, snapshot_id=snap_id, category=category,
        offer=s.BreakOffer(type=opt.type, title=opt.title, duration_sec=dur, demo=settings.demo_mode),
    )


@router.post("/break/dismiss", response_model=s.StateResponse)
async def break_dismiss(req: s.SessionRequest):
    with db() as conn:
        row = session.load_or_create(conn, req.session_id)
        snap_id = row["snapshot_id"]
    try:
        with db() as conn:
            session.transition(conn, req.session_id, S.WORKING, snapshot_id=None)
    except InvalidTransition as exc:
        raise _conflict(str(exc), "INVALID_TRANSITION") from exc
    delete_snapshot(snap_id)
    return s.StateResponse(state=S.WORKING.value, demo=get_settings().demo_mode)


@router.post("/break/start", response_model=s.BreakStartResponse)
async def break_start(req: s.SessionRequest):
    settings = get_settings()
    conflict = _break_active_conflict(req.session_id)
    if conflict is not None:
        raise conflict
    break_id = uuid.uuid4().hex
    try:
        with db() as conn:
            row = session.load_or_create(conn, req.session_id)
            snap = get_snapshot(row["snapshot_id"])
            if snap and snap.duration_sec:
                dur = snap.duration_sec
                act_type = snap.activity_type
                from backend.services.breaks import BREAKS
                opt = next((b for b in BREAKS if b.type == act_type), BREAKS[0])
                break_index = row["break_index"]  # Don't increment when using AI-selected duration
            else:
                dur = settings.break_duration_sec
                next_idx, opt = pick_break(row["break_index"])
                break_index = next_idx
            ends_at = int(time.time()) + dur
            session.transition(
                conn, req.session_id, S.BREAK_ACTIVE,
                break_id=break_id, break_ends_at=ends_at,
                break_title=opt.title, break_index=break_index,
            )
    except InvalidTransition as exc:
        raise _conflict(str(exc), "INVALID_TRANSITION") from exc
    return s.BreakStartResponse(state=S.BREAK_ACTIVE.value, break_id=break_id, title=opt.title,
                                type=opt.type, ends_at=ends_at, duration_sec=dur,
                                demo=settings.demo_mode)


@router.post("/break/end", response_model=s.StateResponse)
async def break_end(req: s.BreakEndRequest):
    """Finish the break. Timer-complete or explicit early return. Goes to REFLECTION."""
    try:
        with db() as conn:
            row = session.load_or_create(conn, req.session_id)
            if AppState(row["state"]) != S.BREAK_ACTIVE:
                raise InvalidTransition(AppState(row["state"]), S.RETURNED)
            if not req.early and int(time.time()) < (row["break_ends_at"] or 0):
                raise _conflict("break is still running", "BREAK_NOT_FINISHED")
            session.transition(conn, req.session_id, S.RETURNED,
                               break_ends_at=None, break_title=None)
            session.transition(conn, req.session_id, S.REFLECTION)
    except InvalidTransition as exc:
        raise _conflict(str(exc), "INVALID_TRANSITION") from exc
    return s.StateResponse(state=S.REFLECTION.value, demo=get_settings().demo_mode)


@router.post("/reflect", response_model=s.ReflectResponse)
async def reflect(req: s.ReflectRequest):
    target = S.AI_ASSISTANCE_ALLOWED if req.choice == "none" else S.USER_HAS_IDEA
    try:
        with db() as conn:
            session.transition(conn, req.session_id, target)
    except InvalidTransition as exc:
        raise _conflict(str(exc), "INVALID_TRANSITION") from exc
    return s.ReflectResponse(state=target.value, allow_ai=target == S.AI_ASSISTANCE_ALLOWED)


@router.post("/resume", response_model=s.StateResponse)
async def resume(req: s.SessionRequest):
    """Return to WORKING after the user's own idea, or after declining AI help. Clears the snapshot."""
    with db() as conn:
        row = session.load_or_create(conn, req.session_id)
        snap_id = row["snapshot_id"]
    try:
        with db() as conn:
            session.transition(conn, req.session_id, S.WORKING, snapshot_id=None)
    except InvalidTransition as exc:
        raise _conflict(str(exc), "INVALID_TRANSITION") from exc
    delete_snapshot(snap_id)
    return s.StateResponse(state=S.WORKING.value, demo=get_settings().demo_mode)


@router.post("/hypothesis", response_model=s.HypothesisResponse)
async def hypothesis(req: s.SessionRequest):
    """Only reachable in AI_ASSISTANCE_ALLOWED, i.e. after "No" and the user's permission."""
    with db() as conn:
        row = session.load_or_create(conn, req.session_id)
        if AppState(row["state"]) != S.AI_ASSISTANCE_ALLOWED:
            raise _conflict("AI assistance is not allowed in this state", "AI_NOT_ALLOWED")
        snap = get_snapshot(row["snapshot_id"])

    # Check for meaningful problem context before requesting AI hypothesis
    # Missing context: empty, whitespace-only, or "(no description given)"
    no_context = False
    if snap is None or not snap.problem or not snap.problem.strip() or snap.problem.strip() == NO_DESCRIPTION:
        no_context = True

    if no_context:
        # No meaningful problem context - don't call AI, transition to WORKING, clear snapshot
        helpful_msg = ("You didn't tell me what you were stuck on before your break, "
                       "so I don't know what to help with. Head back to work, "
                       "and next time, share a short description or error message.")
        text, source, category = helpful_msg, "fallback", "no_context"
        # Transition to WORKING and clear snapshot
        with db() as conn:
            session.transition(conn, req.session_id, S.WORKING, snapshot_id=None)
        if snap:
            delete_snapshot(snap.id)
    elif snap is None:
        # Snapshot expired - deterministic fallback
        text, source, category = fallback_hypothesis("debugging"), "fallback", "debugging"
    else:
        category = snap.category
        text, source = await cache.resolve_hypothesis(snap.category, snap.problem, snap.error)

    hyp_id = uuid.uuid4().hex
    try:
        with db() as conn:
            conn.execute(
                "INSERT INTO hypotheses (id, session_id, category, text, source, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (hyp_id, req.session_id, category, text, source, int(time.time())),
            )
            if not no_context:
                session.transition(conn, req.session_id, S.SUGGESTION_PROVIDED)
    except InvalidTransition as exc:
        raise _conflict(str(exc), "INVALID_TRANSITION") from exc
    return s.HypothesisResponse(state=S.SUGGESTION_PROVIDED.value if not no_context else S.WORKING.value,
                                hypothesis_id=hyp_id,
                                hypothesis=text, category=category, source=source)


@router.post("/feedback", response_model=s.FeedbackResponse)
async def feedback(req: s.FeedbackRequest):
    with db() as conn:
        row = session.load_or_create(conn, req.session_id)
        snap_id = row["snapshot_id"]
        owned = conn.execute(
            "SELECT 1 FROM hypotheses WHERE id = ? AND session_id = ?",
            (req.hypothesis_id, req.session_id),
        ).fetchone()
    if owned is None:
        raise HTTPException(status_code=404, detail={"error": "unknown hypothesis", "code": "NOT_FOUND"})
    try:
        with db() as conn:
            conn.execute(
                "INSERT INTO feedback (hypothesis_id, outcome, created_at) VALUES (?, ?, ?)",
                (req.hypothesis_id, req.outcome, int(time.time())),
            )
            session.transition(conn, req.session_id, S.FEEDBACK_CAPTURED)
            session.transition(conn, req.session_id, S.WORKING, snapshot_id=None)
    except InvalidTransition as exc:
        raise _conflict(str(exc), "INVALID_TRANSITION") from exc
    delete_snapshot(snap_id)
    return s.FeedbackResponse(state=S.WORKING.value, stored=True)
