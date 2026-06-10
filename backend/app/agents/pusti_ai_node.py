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
{early_summary_context}
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
    """Run Pusti AI sub-agent; executes tool calls internally and returns final reply."""
    user_id = state["user_id"]
    message = state["message"]
    history = state.get("history", [])
    language = state.get("language", "bn")

    from app.core.token_optimizer import token_optimizer

    # Build initial context (mirrors existing chat.py)
    user_context = await _build_user_context(user_id)
    rag_food_context = await _build_rag_food_context(user_id, message)

    # Apply context pruning
    user_context = token_optimizer.prune_context(user_context, message, max_chars=1200)
    rag_food_context = token_optimizer.prune_context(rag_food_context, message, max_chars=1200)

    # Build early summary context
    early_summary = state.get("early_history_summary")
    early_summary_context = ""
    if early_summary:
        early_summary_context = f"\n=== SUMMARY OF PREVIOUS CONVERSATION CONTEXT ===\n{early_summary}\n"

    system_msg = _PUSTI_SYSTEM.format(
        early_summary_context=early_summary_context,
        user_context=user_context,
        rag_food_context=rag_food_context,
    )

    # If user explicitly opted out of grocery suggestions, tell the model not to mention them.
    if state.get("include_groceries") is False:
        system_msg += "\n\n=== GROCERY PREFERENCE ===\nThe user has chosen NOT to see grocery suggestions. DO NOT mention grocery shopping, prices, store locations, or where to buy ingredients in your response."

    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_msg}]
    for turn in history[-10:]:
        if turn.get("role") in ("user", "assistant") and turn.get("content"):
            messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": message})

    try:
        mutated = False
        tool_results_list = []

        while True:
            # Call OpenAI chat completion with tool definitions
            response = await llm_client.client.chat.completions.create(
                model=llm_client.model,
                messages=messages,
                tools=PUSTI_TOOLS,
                tool_choice="auto",
                temperature=0.4,
                max_tokens=2048,
            )

            choice = response.choices[0]
            message_obj = choice.message

            # If the model didn't generate any tool calls, this is the final response
            if not message_obj.tool_calls:
                reply_text = message_obj.content or ""
                return {
                    **state,
                    "reply": reply_text,
                    "tool_calls": tool_results_list if tool_results_list else None,
                }

            # Reformat tool calls for history
            formatted_tool_calls = []
            tool_calls_to_execute = []
            for tc in message_obj.tool_calls:
                formatted_tool_calls.append({
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                })
                tool_calls_to_execute.append(tc)

            # Append assistant's tool-call response to messages list
            messages.append({
                "role": "assistant",
                "content": message_obj.content,
                "tool_calls": formatted_tool_calls,
            })

            # Import dispatch map inside function to avoid circular imports
            from app.routers.chat import TOOL_DISPATCH, perform_meal_logging, _MUTATING_TOOLS

            # Execute each tool call sequentially
            for tc in tool_calls_to_execute:
                func_name = tc.function.name
                arguments_str = tc.function.arguments
                try:
                    args = json.loads(arguments_str)
                except Exception:
                    args = {}

                result = None

                # Special handle for log_meal (which has complex database log hooks)
                if func_name == "log_meal":
                    description = args.get("meal_description") or args.get("description") or ""
                    meal_slot = args.get("meal_slot", "snack")
                    logged_meal = await perform_meal_logging(
                        user_id=user_id,
                        input_text=description,
                        meal_slot=meal_slot,
                        language=language,
                    )
                    result = logged_meal
                    tool_results_list.append({"tool": func_name, "result": logged_meal})
                    mutated = True
                elif func_name in TOOL_DISPATCH:
                    handler, needs_user = TOOL_DISPATCH[func_name]
                    if handler:
                        try:
                            if needs_user:
                                result = await handler(user_id, args)
                            else:
                                result = await handler(args)
                        except Exception as e:
                            logger.warning("Agent tool %s failed: %s", func_name, e)
                            result = {"success": False, "error": str(e)}

                        # Structure the tool result to match what frontend cards expect
                        if isinstance(result, dict) and result.get("action"):
                            tool_results_list.append({
                                "tool": func_name,
                                "action": result["action"],
                                "result": result.get("data"),
                            })
                        elif isinstance(result, dict) and result.get("success"):
                            tool_results_list.append({
                                "tool": func_name,
                                "result": result.get("data", result),
                            })
                        else:
                            tool_results_list.append({
                                "tool": func_name,
                                "result": result,
                            })
                    else:
                        result = {"success": False, "error": f"Handler not found for {func_name}"}
                else:
                    result = {"success": False, "error": f"Unknown tool: {func_name}"}

                if func_name in _MUTATING_TOOLS:
                    mutated = True

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": func_name,
                    "content": json.dumps(result),
                })

            # Rebuild user profile context if any mutating tools executed
            if mutated:
                user_context = await _build_user_context(user_id)
                # Apply context pruning
                user_context = token_optimizer.prune_context(user_context, message, max_chars=1200)
                system_msg = _PUSTI_SYSTEM.format(
                    early_summary_context=early_summary_context,
                    user_context=user_context,
                    rag_food_context=rag_food_context,
                )
                messages[0] = {"role": "system", "content": system_msg}
                mutated = False

    except Exception as e:
        logger.exception("PustiAiNode error in execution loop: %s", e)
        error_msg = "দুঃখিত, একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।" if language == "bn" else "Sorry, an error occurred. Please try again."
        return {**state, "reply": error_msg, "error": str(e)}
