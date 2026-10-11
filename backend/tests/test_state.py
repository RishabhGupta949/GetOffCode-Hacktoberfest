"""State machine transition guards — all valid and invalid pairs."""

import pytest

from backend.models.state import AppState as S
from backend.models.state import VALID_TRANSITIONS, InvalidTransition, check_transition


def test_all_documented_transitions_valid():
    expected = {
        (S.IDLE, S.WORKING),
        (S.WORKING, S.IDLE),
        (S.WORKING, S.POSSIBLY_STUCK),
        (S.POSSIBLY_STUCK, S.WORKING),
        (S.POSSIBLY_STUCK, S.BREAK_OFFERED),
        (S.BREAK_OFFERED, S.WORKING),
        (S.BREAK_OFFERED, S.BREAK_ACTIVE),
        (S.BREAK_ACTIVE, S.RETURNED),
        (S.RETURNED, S.REFLECTION),
        (S.REFLECTION, S.USER_HAS_IDEA),
        (S.REFLECTION, S.AI_ASSISTANCE_ALLOWED),
        (S.USER_HAS_IDEA, S.WORKING),
        (S.AI_ASSISTANCE_ALLOWED, S.SUGGESTION_PROVIDED),
        (S.AI_ASSISTANCE_ALLOWED, S.WORKING),
        (S.SUGGESTION_PROVIDED, S.FEEDBACK_CAPTURED),
        (S.FEEDBACK_CAPTURED, S.WORKING),
    }
    assert expected <= VALID_TRANSITIONS


def test_break_active_transitions_only_to_returned():
    allowed = [to for (frm, to) in VALID_TRANSITIONS if frm == S.BREAK_ACTIVE]
    assert allowed == [S.RETURNED]


def test_cannot_enter_break_active_from_reflection():
    with pytest.raises(InvalidTransition):
        check_transition(S.REFLECTION, S.BREAK_ACTIVE)


def test_ai_only_allowed_after_no():
    sources = [frm for (frm, to) in VALID_TRANSITIONS if to == S.AI_ASSISTANCE_ALLOWED]
    assert sources == [S.REFLECTION]


def test_cannot_skip_from_break_active_to_suggestion():
    for target in (S.AI_ASSISTANCE_ALLOWED, S.SUGGESTION_PROVIDED, S.FEEDBACK_CAPTURED):
        with pytest.raises(InvalidTransition):
            check_transition(S.BREAK_ACTIVE, target)


def test_working_cannot_jump_to_break_active():
    with pytest.raises(InvalidTransition):
        check_transition(S.WORKING, S.BREAK_ACTIVE)
