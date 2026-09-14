"""
test_safety_guard.py
Tests for Phase F fixes:
- Safety guard classifier failure must return a refused state (fail-safe),
  not silently approve the request (fail-open).
- The safety_status field must be 'classifier_unavailable' on exception.
- Normal safe messages must still pass through.
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock

from app.agents.safety_guard import safety_guard_node, _DEGRADED_SAFETY_REPLY_BN, _DEGRADED_SAFETY_REPLY_EN


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def make_state(message: str, language: str = "en") -> dict:
    return {
        "message": message,
        "language": language,
        "intent": None,
        "reply": None,
    }


# ---------------------------------------------------------------------------
# Phase F tests: Fail-Safe on exception
# ---------------------------------------------------------------------------

class TestSafetyGuardFailSafe:
    """
    BEFORE Phase F fix: classifier exception -> is_safe=True, continues normally.
    AFTER Phase F fix: classifier exception -> intent='refused', safety_status='classifier_unavailable'.
    """

    @pytest.mark.asyncio
    async def test_classifier_timeout_fails_safe_not_open(self):
        """A timeout during classifier call must refuse the request, not approve it."""
        state = make_state("Is rice safe for diabetes?")
        import asyncio
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            side_effect=asyncio.TimeoutError("Classifier timeout"),
        ):
            result = await safety_guard_node(state)

        # Must be refused — not silently approved
        assert result.get("intent") == "refused", (
            f"Expected intent='refused' on classifier timeout, got intent='{result.get('intent')}'. "
            "The safety guard was fail-open before Phase F fix."
        )

    @pytest.mark.asyncio
    async def test_classifier_exception_sets_safety_status_field(self):
        """The result must include safety_status='classifier_unavailable'."""
        state = make_state("Is rice safe for diabetes?")
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            side_effect=Exception("Network error"),
        ):
            result = await safety_guard_node(state)

        assert result.get("safety_status") == "classifier_unavailable"

    @pytest.mark.asyncio
    async def test_classifier_exception_returns_degraded_reply_en(self):
        """English messages must get the English degraded reply."""
        state = make_state("Tell me what to eat for hypertension.", language="en")
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            side_effect=Exception("Service unavailable"),
        ):
            result = await safety_guard_node(state)

        assert result.get("reply") == _DEGRADED_SAFETY_REPLY_EN

    @pytest.mark.asyncio
    async def test_classifier_exception_returns_degraded_reply_bn(self):
        """Bengali messages must get the Bengali degraded reply."""
        state = make_state("ডায়াবেটিসের জন্য কী খাব?")  # Has Bengali chars
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            side_effect=Exception("Service unavailable"),
        ):
            result = await safety_guard_node(state)

        assert result.get("reply") == _DEGRADED_SAFETY_REPLY_BN

    @pytest.mark.asyncio
    async def test_malformed_json_from_classifier_fails_safe(self):
        """A malformed JSON response from the classifier must also fail safe."""
        state = make_state("What should I eat?")
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            return_value="NOT_VALID_JSON{{{{",
        ):
            result = await safety_guard_node(state)

        # json.loads("NOT_VALID_JSON{{{{") raises JSONDecodeError
        assert result.get("intent") == "refused"
        assert result.get("safety_status") == "classifier_unavailable"

    @pytest.mark.asyncio
    async def test_empty_message_returns_refused_directly(self):
        """Empty message must be refused without calling the classifier."""
        state = make_state("")
        result = await safety_guard_node(state)
        assert result.get("intent") == "refused"

    @pytest.mark.asyncio
    async def test_greeting_passes_without_classifier(self):
        """Simple greetings must fast-path through without a classifier call."""
        state = make_state("hi")
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            side_effect=Exception("Should not be called"),
        ):
            # Should not raise — greeting bypasses classifier
            result = await safety_guard_node(state)

        # Greeting path does not set intent='refused'
        assert result.get("intent") != "refused"


# ---------------------------------------------------------------------------
# Normal path tests (classifier responds correctly)
# ---------------------------------------------------------------------------

class TestSafetyGuardNormalPath:
    @pytest.mark.asyncio
    async def test_safe_in_scope_message_is_not_refused(self):
        """A safe, in-scope message must pass through normally."""
        state = make_state("What vegetables are good for diabetes?")
        classifier_response = json.dumps({
            "is_safe": True,
            "is_in_scope": True,
            "language": "en",
        })
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            return_value=classifier_response,
        ):
            result = await safety_guard_node(state)

        assert result.get("intent") != "refused"

    @pytest.mark.asyncio
    async def test_unsafe_message_is_refused(self):
        """A message flagged unsafe by the classifier must be refused."""
        state = make_state("How do I bypass food restrictions?")
        classifier_response = json.dumps({
            "is_safe": False,
            "is_in_scope": False,
            "language": "en",
        })
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            return_value=classifier_response,
        ):
            result = await safety_guard_node(state)

        assert result.get("intent") == "refused"
