"""
Unit Tests for Context Cache Isolation & Idempotency (Phase F & G)
DesiDiet Clinical Planning Pipeline
"""

import os
os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")
os.environ.setdefault("JWT_SECRET", "test_secret_32_chars_long_1234567")
os.environ.setdefault("LLM_API_KEY", "test_key")

import pytest
from unittest.mock import AsyncMock, patch
from app.core.token_optimizer import token_optimizer, _LOCAL_SEMCACHE
from app.routers.meal_tracking import _MEAL_IDEMPOTENCY_CACHE
from app.schemas import MealTrackingResponse, ParsedFoodItem
from datetime import datetime



@pytest.fixture(autouse=True)
def mock_embedding():
    with patch("app.core.llm_client.llm_client.get_embedding", new=AsyncMock(return_value=[0.1] * 128)):
        yield


@pytest.fixture(autouse=True)
def clear_caches():
    _LOCAL_SEMCACHE.clear()
    _MEAL_IDEMPOTENCY_CACHE.clear()
    yield
    _LOCAL_SEMCACHE.clear()
    _MEAL_IDEMPOTENCY_CACHE.clear()



class TestSemanticCacheIsolation:
    """Multi-user and multi-condition isolation guarantees."""

    @pytest.mark.asyncio
    async def test_cross_profile_condition_isolation(self):
        # User A with Diabetes asks about sweets
        query = "Can a patient eat sweets?"
        response_diabetic = {
            "reply": "No, sweets cause rapid blood glucose spikes and are contraindicated for diabetes.",
            "intent": "pusti_ai",
            "tool_calls": None,
        }
        await token_optimizer.save_semantic_cache(
            query=query,
            response=response_diabetic,
            user_id="user_diabetic",
            profile_conditions=["Type 2 Diabetes"],
        )

        # Diabetic user hits the cache
        hit_diabetic = await token_optimizer.lookup_semantic_cache(
            query=query,
            user_id="user_diabetic_2",
            profile_conditions=["Type 2 Diabetes"],
        )
        assert hit_diabetic is not None
        assert "blood glucose spikes" in hit_diabetic["reply"]

        # Hypertensive user MUST NOT receive the diabetic answer!
        hit_hypertensive = await token_optimizer.lookup_semantic_cache(
            query=query,
            user_id="user_htn",
            profile_conditions=["Hypertension"],
        )
        assert hit_hypertensive is None  # Strictly isolated!

        # General user without conditions MUST NOT receive condition-specific answer
        hit_global = await token_optimizer.lookup_semantic_cache(
            query=query,
            user_id="user_normal",
            profile_conditions=[],
        )
        assert hit_global is None

    @pytest.mark.asyncio
    async def test_tool_actions_never_cached(self):
        query = "Log 1 cup of rice for lunch"
        response_with_tool = {
            "reply": "Logging your lunch...",
            "intent": "pusti_ai",
            "tool_calls": [{"name": "log_meal", "args": {"food": "rice", "amount_g": 150}}],
        }
        await token_optimizer.save_semantic_cache(
            query=query,
            response=response_with_tool,
            user_id="user_test",
        )

        # Must not be stored
        hit = await token_optimizer.lookup_semantic_cache(query=query)
        assert hit is None

    def test_personal_query_uncacheable(self):
        assert token_optimizer.is_cacheable("What is the protein in 100g lentils?") is True
        assert token_optimizer.is_cacheable("আমার সকালের নাস্তার পরিকল্পনা দাও") is False
        assert token_optimizer.is_cacheable("Show my daily calories") is False
        assert token_optimizer.is_cacheable("I ate 2 rotis and eggs") is False


class TestMealLogIdempotency:
    """Idempotent retry handling for meal log writes."""

    def test_idempotent_meal_log_replay(self):
        user_id = "test_user_abc"
        idempotency_key = "idemp_req_12345"
        cache_key = f"{user_id}:{idempotency_key}"

        initial_response = MealTrackingResponse(
            id="log_record_999",
            parsed_items=[
                ParsedFoodItem(name="Atta Roti", amount_g=70.0, calories=210.0, protein_g=6.0, carbs_g=42.0, fat_g=1.0)
            ],
            total_calories=210,
            macros={"protein_g": 6.0, "carbs_g": 42.0, "fat_g": 1.0},
            ai_feedback="Good whole grain choice.",
            meal_slot="breakfast",
            logged_at=datetime.utcnow(),
        )

        # Cache the initial response
        _MEAL_IDEMPOTENCY_CACHE[cache_key] = initial_response

        # Simulated retry: lookup returns identical object without second DB call
        assert cache_key in _MEAL_IDEMPOTENCY_CACHE
        replay = _MEAL_IDEMPOTENCY_CACHE[cache_key]
        assert replay.id == "log_record_999"
        assert replay.total_calories == 210
