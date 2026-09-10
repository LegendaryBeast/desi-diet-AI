import pytest
import asyncio
from app.services.meal_plan_service import regenerate_single_slot_in_plan
from app.utils_portion import attach_household_measurements


def test_attach_household_measurements_on_swapped_item():
    plan_data = {
        "meals": [
            {
                "slot": "breakfast",
                "items": [
                    {
                        "food_code": "CER001",
                        "name_bn": "সুজি",
                        "name_en": "Semolina / Suji",
                        "amount_g": 67,
                        "calories": 224,
                        "food_group": "Cereals",
                    },
                    {
                        "food_code": "EGG001",
                        "name_bn": "সিদ্ধ মুরগির ডিম",
                        "name_en": "Boiled Egg",
                        "amount_g": 67,
                        "calories": 99,
                        "food_group": "Eggs",
                    }
                ]
            }
        ]
    }
    attach_household_measurements(plan_data)
    items = plan_data["meals"][0]["items"]
    # Suji should have household measurement (tablespoon)
    assert items[0]["portion_bn"] is not None
    assert "চামচ" in items[0]["portion_bn"] or "গ্রাম" in items[0]["portion_bn"]
    # Boiled egg should have egg piece measurement
    assert items[1]["portion_bn"] is not None
    assert "টি" in items[1]["portion_bn"]


@pytest.mark.asyncio
async def test_regenerate_single_slot():
    sample_plan = {
        "meals": [
            {
                "slot": "breakfast",
                "items": [
                    {
                        "food_code": "CER001",
                        "name_bn": "সুজি",
                        "amount_g": 67,
                        "calories": 224,
                    }
                ]
            },
            {
                "slot": "lunch",
                "items": [
                    {
                        "food_code": "CER002",
                        "name_bn": "ভাত",
                        "amount_g": 150,
                        "calories": 195,
                    }
                ]
            }
        ]
    }

    updated = await regenerate_single_slot_in_plan(
        plan_data=sample_plan,
        target_slot="breakfast",
        user_id="test-user-123",
        language="bn"
    )

    # Lunch must remain unchanged
    assert updated["meals"][1]["slot"] == "lunch"
    assert updated["meals"][1]["items"][0]["name_bn"] == "ভাত"

    # Breakfast must have regenerated items
    bfast = updated["meals"][0]
    assert bfast["slot"] == "breakfast"
    assert len(bfast["items"]) >= 1
    for item in bfast["items"]:
        assert "portion_bn" in item
        assert item["portion_bn"] is not None
