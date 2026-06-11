"""
NutriSaathiNode — NutriSaathi sub-agent.

Wraps the existing PersonalCookerService RAG pipeline:
  1. Query rewrite for better retrieval
  2. Embedding + Pinecone retrieval
  3. LLM synthesis with condition-specific cooking guide

Reads condition from state["condition"] if pre-set, otherwise
falls back to the user's primary medical condition from their profile.
"""

import logging
from app.agents.state import AgentState
from app.db import prisma
from app.utils import safe_list
from app.personal_cooker.service import PersonalCookerService

logger = logging.getLogger(__name__)


async def _get_user_condition(user_id: str) -> str:
    """Return primary medical condition string from user profile."""
    try:
        profile = await prisma.profile.find_unique(where={"userId": user_id})
        if profile:
            conditions = safe_list(profile.medicalConditions)
            if conditions:
                return ", ".join(conditions)
    except Exception as e:
        logger.warning("NutriSaathiNode: failed to fetch condition: %s", e)
    return "None"


async def nutrisaathi_node(state: AgentState) -> AgentState:
    """Run NutriSaathi sub-agent; returns state with reply."""
    user_id = state["user_id"]
    message = state["message"]
    history = state.get("history", [])

    # Use explicitly set condition (from request) or fall back to profile condition
    condition = state.get("condition") or await _get_user_condition(user_id)

    # Use a stable session_id — defaults to "unified" so history is shared
    # with the standalone /personal-cooker endpoint
    session_id = state.get("session_id") or "unified"

    try:
        # Rewrite query for better retrieval
        search_message = await PersonalCookerService.rewrite_query(message, condition)

        # Embed
        query_embedding = PersonalCookerService.embed_query(search_message)

        # Retrieve from Pinecone
        contexts = []
        if query_embedding:
            contexts = PersonalCookerService.retrieve_context(query_embedding, condition, top_k=5)

        # Build history list from state (avoids duplicate DB reads)
        history_dicts = [
            {"role": t.get("role", "user"), "content": t.get("content", "")}
            for t in history[-10:]
        ]

        # Fetch meal plan context (same as PersonalCookerService.chat does internally)
        meal_plan_context = ""
        try:
            from datetime import datetime, timezone, timedelta
            from zoneinfo import ZoneInfo
            import json

            today = datetime.now(ZoneInfo("Asia/Dhaka")).replace(
                hour=0, minute=0, second=0, microsecond=0
            ).astimezone(timezone.utc)
            today_plan = None
            try:
                from app.services.meal_plan_cache import get_cached_meal_plan, set_cached_meal_plan
                today_plan = await get_cached_meal_plan(user_id, today)
            except Exception:
                pass
            if not today_plan:
                today_plan = await prisma.mealplan.find_first(
                    where={
                        "userId": user_id,
                        "planType": "daily",
                        "planDate": {"gte": today, "lt": today + timedelta(days=1)},
                    },
                    order={"createdAt": "desc"},
                )
                if today_plan:
                    try:
                        await set_cached_meal_plan(user_id, today, today_plan)
                    except Exception:
                        pass
            if today_plan and today_plan.planData:
                plan_data = (
                    json.loads(today_plan.planData)
                    if isinstance(today_plan.planData, str)
                    else today_plan.planData
                )
                completed = []
                if today_plan.completedSlots:
                    completed = (
                        json.loads(today_plan.completedSlots)
                        if isinstance(today_plan.completedSlots, str)
                        else today_plan.completedSlots
                    )
                lines = ["TODAY'S MEAL PLAN:"]
                for meal in plan_data.get("meals", []):
                    status = "✅ Eaten" if meal.get("slot") in completed else "⬜ Pending"
                    items_text = ", ".join(
                        f"{i.get('name_bn') or i.get('name_en')}"
                        for i in meal.get("items", [])
                    )
                    slot_label = meal.get("slot_bn") or meal.get("slot", "")
                    lines.append(f"  [{slot_label}] {status}: {items_text}")
                meal_plan_context = "\n".join(lines)
        except Exception as e:
            logger.warning("NutriSaathiNode: meal plan context failed: %s", e)

        # Generate reply using the existing service
        reply = await PersonalCookerService.generate_reply(
            user_message=message,
            condition=condition,
            history=history_dicts,
            contexts=contexts,
            meal_plan_context=meal_plan_context,
            early_history_summary=state.get("early_history_summary"),
        )

        # Persist messages for session continuity (NutriSaathi history)
        try:
            await prisma.personalcookerchat.create(
                data={"userId": user_id, "sessionId": session_id, "role": "user", "content": message, "condition": condition}
            )
            await prisma.personalcookerchat.create(
                data={"userId": user_id, "sessionId": session_id, "role": "assistant", "content": reply, "condition": condition}
            )
        except Exception as e:
            logger.warning("NutriSaathiNode: failed to persist history: %s", e)

        return {**state, "reply": reply, "tool_calls": None}

    except Exception as e:
        logger.error("NutriSaathiNode error: %s", e)
        lang = state.get("language", "bn")
        error_msg = "দুঃখিত, রান্নার গাইড লোড করতে সমস্যা হয়েছে।" if lang == "bn" else "Sorry, failed to load the cooking guide. Please try again."
        return {**state, "reply": error_msg, "error": str(e)}
