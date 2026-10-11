"""AI activity evaluation: verdicts from aggregate signals only.

Covers: no-key deterministic fallback, AI parsing/validation, failure
fallbacks, and the demo force-suggest rule. Source must always be honest.
"""

import pytest

from backend.config import get_settings
from backend.services.activity import ActivityInput
from backend.services.activity_agent import (
    ALLOWED_DURATIONS,
    evaluate_activity_with_ai,
)


def signals(**kw) -> ActivityInput:
    base = dict(active_domain="github.com", idle_ms=0, tab_switches_5m=0,
                session_minutes=0.0, explicit_stuck=False)
    base.update(kw)
    return ActivityInput(**base)


def no_key(monkeypatch):
    monkeypatch.setattr(get_settings(), "openrouter_api_key", "")


def with_key(monkeypatch):
    monkeypatch.setattr(get_settings(), "openrouter_api_key", "test-key")


@pytest.mark.anyio
async def test_no_api_key_strong_signals_use_deterministic_fallback(monkeypatch):
    no_key(monkeypatch)
    v = await evaluate_activity_with_ai(signals(tab_switches_5m=12, session_minutes=120))
    assert v.source == "fallback"
    assert v.suggest is True
    assert v.duration_sec in ALLOWED_DURATIONS
    assert v.reason  # brief explanation of the signals
    assert len(v.reason) <= 200


@pytest.mark.anyio
async def test_no_api_key_calm_signals_do_not_suggest(monkeypatch):
    no_key(monkeypatch)
    v = await evaluate_activity_with_ai(signals(tab_switches_5m=0, session_minutes=5))
    assert v.source == "fallback"
    assert v.suggest is False


@pytest.mark.anyio
async def test_demo_mode_force_suggests_on_fallback(monkeypatch):
    no_key(monkeypatch)
    # Weak signals: demo trigger must still show the flow, deterministically.
    v = await evaluate_activity_with_ai(signals(), demo=True)
    assert v.source == "fallback"
    assert v.suggest is True
    assert v.duration_sec in ALLOWED_DURATIONS


@pytest.mark.anyio
async def test_ai_verdict_is_parsed(monkeypatch):
    with_key(monkeypatch)

    async def fake_chat(messages, max_tokens):
        return ('{"suggest": true, "reason": "12 tab switches in 5 minutes", '
                '"duration_sec": 900, "activity_type": "breathing"}')

    monkeypatch.setattr("backend.services.ai_client._chat", fake_chat)
    v = await evaluate_activity_with_ai(signals(tab_switches_5m=12, session_minutes=100))
    assert v.source == "ai"
    assert v.suggest is True
    assert v.duration_sec == 900
    assert v.activity_type == "breathing"
    assert v.reason == "12 tab switches in 5 minutes"


@pytest.mark.anyio
async def test_ai_duration_outside_allowed_set_is_clamped(monkeypatch):
    with_key(monkeypatch)

    async def fake_chat(messages, max_tokens):
        return '{"suggest": true, "reason": "long session", "duration_sec": 42, "activity_type": "stretch"}'

    monkeypatch.setattr("backend.services.ai_client._chat", fake_chat)
    v = await evaluate_activity_with_ai(signals(session_minutes=200))
    assert v.source == "ai"
    assert v.duration_sec == 180  # nearest allowed value


@pytest.mark.anyio
async def test_ai_unknown_activity_falls_back_to_default(monkeypatch):
    with_key(monkeypatch)

    async def fake_chat(messages, max_tokens):
        return '{"suggest": true, "reason": "hopping", "duration_sec": 300, "activity_type": "skydiving"}'

    monkeypatch.setattr("backend.services.ai_client._chat", fake_chat)
    v = await evaluate_activity_with_ai(signals(tab_switches_5m=8))
    assert v.activity_type == "walk_outside"


@pytest.mark.anyio
async def test_ai_invalid_json_uses_fallback(monkeypatch):
    with_key(monkeypatch)

    async def fake_chat(messages, max_tokens):
        return "I think you should rest"

    monkeypatch.setattr("backend.services.ai_client._chat", fake_chat)
    v = await evaluate_activity_with_ai(signals(tab_switches_5m=12, session_minutes=120))
    assert v.source == "fallback"  # never claim an AI decision that did not happen
    assert v.suggest is True


@pytest.mark.anyio
async def test_ai_error_uses_fallback(monkeypatch):
    with_key(monkeypatch)

    async def boom(messages, max_tokens):
        raise RuntimeError("openrouter down")

    monkeypatch.setattr("backend.services.ai_client._chat", boom)
    v = await evaluate_activity_with_ai(signals(tab_switches_5m=7))
    assert v.source == "fallback"


@pytest.mark.anyio
async def test_ai_reason_is_truncated(monkeypatch):
    with_key(monkeypatch)

    async def fake_chat(messages, max_tokens):
        return '{"suggest": true, "reason": "' + "x" * 500 + '", "duration_sec": 300, "activity_type": "stretch"}'

    monkeypatch.setattr("backend.services.ai_client._chat", fake_chat)
    v = await evaluate_activity_with_ai(signals(tab_switches_5m=8))
    assert v.source == "ai"
    assert len(v.reason) <= 200
