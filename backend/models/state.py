from enum import Enum


class AppState(str, Enum):
    IDLE = "IDLE"
    WORKING = "WORKING"
    POSSIBLY_STUCK = "POSSIBLY_STUCK"
    BREAK_OFFERED = "BREAK_OFFERED"
    BREAK_ACTIVE = "BREAK_ACTIVE"
    RETURNED = "RETURNED"            # transient: break finished, reflection next
    REFLECTION = "REFLECTION"
    USER_HAS_IDEA = "USER_HAS_IDEA"  # YES / MAYBE: control returned to developer
    AI_ASSISTANCE_ALLOWED = "AI_ASSISTANCE_ALLOWED"  # only after "No, nothing yet"
    SUGGESTION_PROVIDED = "SUGGESTION_PROVIDED"
    FEEDBACK_CAPTURED = "FEEDBACK_CAPTURED"


S = AppState

# Every legal (from, to) pair. Anything not listed is rejected with 409.
VALID_TRANSITIONS: frozenset[tuple[AppState, AppState]] = frozenset({
    (S.IDLE, S.WORKING),
    (S.WORKING, S.IDLE),
    (S.WORKING, S.POSSIBLY_STUCK),          # activity score or explicit "I'm stuck"
    (S.POSSIBLY_STUCK, S.WORKING),          # signals cleared / user declined
    (S.POSSIBLY_STUCK, S.BREAK_OFFERED),    # snapshot saved, break offered
    (S.BREAK_OFFERED, S.WORKING),           # "Not now"
    (S.BREAK_OFFERED, S.BREAK_ACTIVE),      # user accepted break
    (S.BREAK_ACTIVE, S.RETURNED),           # timer finished or early return
    (S.RETURNED, S.REFLECTION),
    (S.REFLECTION, S.USER_HAS_IDEA),        # YES / MAYBE
    (S.REFLECTION, S.AI_ASSISTANCE_ALLOWED),  # NO
    (S.USER_HAS_IDEA, S.WORKING),
    (S.AI_ASSISTANCE_ALLOWED, S.SUGGESTION_PROVIDED),  # user said "yes, suggest"
    (S.AI_ASSISTANCE_ALLOWED, S.WORKING),   # user declined the suggestion
    (S.SUGGESTION_PROVIDED, S.FEEDBACK_CAPTURED),
    (S.FEEDBACK_CAPTURED, S.WORKING),
})

# States in which the extension may show ANY technical/problem content.
# BREAK_ACTIVE is deliberately absent. The backend never returns snapshot data
# outside AI_ASSISTANCE_ALLOWED / SUGGESTION_PROVIDED / FEEDBACK_CAPTURED.
TECHNICAL_CONTENT_STATES: frozenset[AppState] = frozenset({
    S.AI_ASSISTANCE_ALLOWED,
    S.SUGGESTION_PROVIDED,
    S.FEEDBACK_CAPTURED,
})


class InvalidTransition(Exception):
    def __init__(self, current: AppState, target: AppState):
        super().__init__(f"Invalid transition {current.value} -> {target.value}")
        self.current = current
        self.target = target


def check_transition(current: AppState, target: AppState) -> None:
    if (current, target) not in VALID_TRANSITIONS:
        raise InvalidTransition(current, target)
