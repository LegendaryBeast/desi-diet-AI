"""
PustiAiNode — Pusti AI sub-agent.

Wraps the existing full user-context RAG chat logic from chat.py.
Builds the system prompt with profile/targets/meal plan context and
runs the LLM (with tool support). Returns state with reply + tool_calls.
"""

import json
import logging
from typing import List, Dict, Any

from app.agents.state import AgentState
from app.core.llm_client import llm_client
from app.db import prisma
from app.utils import safe_list
from rag_engine import KhadokGraphRAG, calculate_targets

logger = logging.getLogger(__name__)


# ── Re-use context builder from the existing chat router ────────────────────

async def _build_user_context(user_id: str) -> str:
    """Build the rich user context string (mirrors chat.py logic)."""
    from app.routers.chat import _build_user_context as _orig
    return await _orig(user_id)


async def _build_rag_food_context(user_id: str, message: str) -> str:
    """Query GraphRAG for food knowledge relevant to the message."""
    rag_food_context = ""
    try:
        rag = KhadokGraphRAG()
        profile = await prisma.profile.find_unique(where={"userId": user_id})
        conditions = safe_list(profile.medicalConditions) if profile else []
        search_results = rag.search_food(message) if message else []
        if search_results:
            rag_food_context = "\n=== FOOD KNOWLEDGE (from nutrition database) ===\n"
            for food in search_results[:6]:
                ctx = rag.get_chatbot_context(food["code"], conditions)
                rag_food_context += f"- {ctx}\n"
    except Exception as e:
        logger.warning("PustiAiNode GraphRAG context unavailable: %s", e)
    return rag_food_context


_PUSTI_SYSTEM = """You are পুষ্টি এআই (PushtiAI), a prestigious Bangladeshi diet and nutrition assistant backed by a verified Graph-RAG food database. Your SOLE purpose is to help users with:
  - Personalized food and meal recommendations
  - Daily diet planning based on their health profile and goals
  - Calorie and macro-nutrient information (from the verified database only)
  - Meal logging and food tracking
  - Complete Health & Nutrition Reports
  - Nutritional analysis of foods
  - Which foods to prefer or avoid based on their logged medical conditions
  - Food safety questions for specific medical conditions

=== IMPORTANT — WHAT IS IN SCOPE ===
ANY question that combines food/eating with a health condition IS in scope.

=== HARD RESTRICTIONS — NEVER VIOLATE ===
  1. NO medicines or clinical drug dosages.
  2. NO disease diagnosis.
  3. NO topics unrelated to food, diet, nutrition, or health.

=== NUTRITION RESPONSE RULES ===
1. Reply in Bengali if user writes in Bengali, English otherwise.
2. Always name specific Bangladeshi foods (e.g. ভাত, ডাল, মাছ, মুরগি, ডিম).
3. Cross-reference user's medical conditions, meal logs and targets from context.
4. TODAY'S MEAL PLAN: When user asks what to eat, reference the specific foods in their today's plan. ⬜ Pending = recommend it. ✅ Eaten = acknowledge and suggest next.
5. MEAL LOGGING: If user says they ate something, call the `log_meal` tool.
6. HEALTH REPORT: If user asks for report, summarise from context AND append [HEALTH_REPORT_LINK].
7. Always use values from the Graph-RAG context below — never invent nutrition values.
8. Use tools proactively for actions (profile, plan, reminders, navigation).

=== USER'S COMPLETE CONTEXT ===
{user_context}
{rag_food_context}"""

# ── Tool definitions (identical to those in chat.py) ────────────────────────
PUSTI_TOOLS = [
    {"type": "function", "function": {"name": "log_meal", "description": "Log a meal the user has eaten.", "parameters": {"type": "object", "properties": {"meal_description": {"type": "string"}, "meal_slot": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"]}}, "required": ["meal_description", "meal_slot"]}}},
    {"type": "function", "function": {"name": "get_meal_plan", "description": "Fetch the user's current daily meal plan.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "mark_meal_complete", "description": "Mark a meal slot as eaten.", "parameters": {"type": "object", "properties": {"slot": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"]}}, "required": ["slot"]}}},
    {"type": "function", "function": {"name": "get_profile", "description": "Get user profile information.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "update_profile", "description": "Update user profile fields.", "parameters": {"type": "object", "properties": {"weight_kg": {"type": "number"}, "goal": {"type": "string"}}, "required": []}}},
    {"type": "function", "function": {"name": "log_health", "description": "Log health metrics.", "parameters": {"type": "object", "properties": {"weight_kg": {"type": "number"}, "blood_sugar": {"type": "number"}, "blood_pressure": {"type": "string"}, "notes": {"type": "string"}}, "required": []}}},
    {"type": "function", "function": {"name": "get_health_logs", "description": "Retrieve recent health logs.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "get_health_report", "description": "Generate a nutrition health summary report.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "get_medicine_reminders", "description": "Get medicine reminders.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "add_medicine_reminder", "description": "Add a medicine reminder.", "parameters": {"type": "object", "properties": {"medicine_name": {"type": "string"}, "time": {"type": "string"}, "notes": {"type": "string"}}, "required": ["medicine_name", "time"]}}},
    {"type": "function", "function": {"name": "search_food", "description": "Search for a food in the database.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "get_food_safety", "description": "Check if a food is safe for the user's conditions.", "parameters": {"type": "object", "properties": {"food_name": {"type": "string"}}, "required": ["food_name"]}}},
    {"type": "function", "function": {"name": "navigate_to", "description": "Navigate the app to a page.", "parameters": {"type": "object", "properties": {"page": {"type": "string", "enum": ["home", "profile", "meal-plan", "health-log", "report", "chat", "nutrisaathi"]}}, "required": ["page"]}}},
    {"type": "function", "function": {"name": "show_toast", "description": "Show a toast notification in the app.", "parameters": {"type": "object", "properties": {"message": {"type": "string"}, "type": {"type": "string", "enum": ["success", "error", "info"]}}, "required": ["message"]}}},
]


async def pusti_ai_node(state: AgentState) -> AgentState:
    """Run Pusti AI sub-agent; returns state with reply and optional tool_calls."""
    user_id = state["user_id"]
    message = state["message"]
    history = state.get("history", [])
    language = state.get("language", "bn")

    # Build full context (mirrors existing chat.py)
    user_context = await _build_user_context(user_id)
    rag_food_context = await _build_rag_food_context(user_id, message)

    system_msg = _PUSTI_SYSTEM.format(
        user_context=user_context,
        rag_food_context=rag_food_context,
    )

    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_msg}]
    for turn in history[-10:]:
        if turn.get("role") in ("user", "assistant") and turn.get("content"):
            messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": message})

    try:
        raw = await llm_client.chat_completion(
            messages=messages,
            temperature=0.4,
            max_tokens=2048,
            tools=PUSTI_TOOLS,
        )

        # Detect tool calls vs plain text reply
        if isinstance(raw, dict) and raw.get("tool_calls"):
            return {**state, "reply": None, "tool_calls": raw["tool_calls"]}
        else:
            reply_text = raw if isinstance(raw, str) else raw.get("content", "")
            return {**state, "reply": reply_text, "tool_calls": None}

    except Exception as e:
        logger.error("PustiAiNode error: %s", e)
        error_msg = "দুঃখিত, একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।" if language == "bn" else "Sorry, an error occurred. Please try again."
        return {**state, "reply": error_msg, "error": str(e)}
