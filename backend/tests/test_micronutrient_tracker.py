"""
test_micronutrient_tracker.py
Unit tests verifying micronutrient target calculations, RDA key handling,
and offline fallbacks for the Micronutrient Tracker.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone
from app.routers.meal_plan import _get_micronutrient_details


@pytest.mark.asyncio
async def test_micronutrient_targets_non_zero_for_valid_user():
    """Ensure that for a standard adult user, micronutrient targets are strictly positive (> 0)."""
    mock_profile = MagicMock()
    mock_profile.gender = "male"
    mock_profile.age = 30
    mock_profile.medicalConditions = []

    with patch("app.routers.meal_plan.prisma") as mock_prisma:
        mock_prisma.profile.find_unique = AsyncMock(return_value=mock_profile)
        mock_prisma.mealtracking.find_many = AsyncMock(return_value=[])

        result = await _get_micronutrient_details(
            plan_data={},
            user_id="test_user_123",
            completed_slots=[],
            target_date=datetime.now(timezone.utc)
        )

        assert len(result) > 0
        for item in result:
            assert "name" in item
            assert "target" in item
            assert "consumed" in item
            assert "unit" in item
            assert "percentage" in item
            # Target must be non-zero for all standard tracked nutrients
            assert item["target"] > 0, f"Target for {item['name']} must be > 0, got {item['target']}"


@pytest.mark.asyncio
async def test_micronutrient_percentage_computation():
    """Verify that consumed amounts result in non-zero percentages when target > 0."""
    mock_profile = MagicMock()
    mock_profile.gender = "female"
    mock_profile.age = 25
    mock_profile.medicalConditions = []

    mock_log = MagicMock()
    # Log 100g of food with nutrient values
    mock_log.parsedItems = '[{"name": "Guava", "code": "F001", "amount_g": 100.0}]'

    with patch("app.routers.meal_plan.prisma") as mock_prisma, \
         patch("app.logic.offline_nutrients.get_offline_food_nutrients") as mock_food_nutrients:

        mock_prisma.profile.find_unique = AsyncMock(return_value=mock_profile)
        mock_prisma.mealtracking.find_many = AsyncMock(return_value=[mock_log])
        mock_food_nutrients.return_value = {
            "f001": {"Ascorbic acids (C)": 200.0, "Calcium (Ca)": 50.0}
        }

        result = await _get_micronutrient_details(
            plan_data={},
            user_id="test_user_456",
            completed_slots=[],
            target_date=datetime.now(timezone.utc)
        )

        vit_c = next((item for item in result if item["name"] == "Ascorbic acids (C)"), None)
        assert vit_c is not None
        assert vit_c["target"] > 0
        assert vit_c["consumed"] > 0
        assert vit_c["percentage"] > 0


@pytest.mark.asyncio
async def test_offline_rda_fallback_when_neo4j_driver_is_none():
    """When Neo4j driver is unavailable, offline fallback must supply all 16 target nutrients."""
    mock_profile = MagicMock()
    mock_profile.gender = "male"
    mock_profile.age = 30
    mock_profile.medicalConditions = []

    with patch("app.routers.meal_plan.prisma") as mock_prisma, \
         patch("rag_engine.food_engine.KhadokGraphRAG.get_neo4j_driver", return_value=None):

        mock_prisma.profile.find_unique = AsyncMock(return_value=mock_profile)
        mock_prisma.mealtracking.find_many = AsyncMock(return_value=[])

        result = await _get_micronutrient_details(
            plan_data={},
            user_id="test_offline_user",
            completed_slots=[],
            target_date=datetime.now(timezone.utc)
        )

        assert len(result) >= 16
        for item in result:
            assert item["target"] > 0
