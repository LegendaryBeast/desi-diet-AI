from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from app.services.chat_tools import tool_unlog_meal, tool_mark_meal_complete


@pytest.mark.asyncio
async def test_tool_unlog_meal_interface():
    # Mock prisma calls inside tool_unlog_meal
    mock_log = MagicMock()
    mock_log.id = "log-1"
    mock_log.inputText = "ভাত এবং মুরগি"
    mock_log.totalCalories = 400

    mock_plan = MagicMock()
    mock_plan.planId = "plan-1"
    mock_plan.completedSlots = '["dinner"]'

    with patch("app.services.chat_tools.prisma") as mock_prisma:
        mock_prisma.mealtracking.find_many = AsyncMock(side_effect=[[mock_log], []])
        mock_prisma.mealtracking.delete = AsyncMock(return_value=None)
        mock_prisma.mealplan.find_first = AsyncMock(return_value=mock_plan)
        mock_prisma.mealplan.update = AsyncMock(return_value=None)

        res = await tool_unlog_meal("test_user", {"meal_slot": "dinner"})
        assert res is not None
        assert "data" in res
        data = res["data"]
        assert data["unlogged_slot"] == "dinner"
        assert data["deleted_logs_count"] == 1
        assert data["removed_calories"] == 400
        assert "সফলভাবে আনলগ" in data["message"]

