"""
RouterNode — Master Agent Intent Classifier.

Uses a single fast LLM call to classify the user's intent into one of:
  - "pusti_ai"       → General nutrition, meal planning, logging, health reports
  - "nutrisaathi"    → Recipe safety, cooking guide, cooking instructions

The result is stored in state["intent"] and used by conditional edges
in graph.py to route to the correct sub-agent node.
"""

import json
import logging
from app.agents.state import AgentState
from app.core.llm_client import llm_client

logger = logging.getLogger(__name__)

_ROUTER_SYSTEM_PROMPT = """You are an intelligent intent classifier for a Bangladeshi nutrition assistant.
Classify the user's message into EXACTLY ONE of these two intents:

1. "pusti_ai"     — Use for:
   - Meal plan requests ("আজকের খাবার কী?", "Give me a meal plan")
   - Calorie / nutrition queries ("ভাতে কত ক্যালোরি?")
   - Meal logging ("I ate rice and fish", "আমি ভাত খেয়েছি")
   - Health reports ("Show my progress", "আমার রিপোর্ট দাও")
   - General diet advice ("What should I eat for weight loss?")
   - Medicine reminders, profile queries
   - Food safety questions without cooking details ("Is banana safe for diabetes?")

2. "nutrisaathi"  — Use for:
   - Recipe requests ("ইলিশ মাছ কীভাবে রান্না করব?", "How do I cook hilsa?")
   - Cooking procedures / cooking guide ("chicken curry recipe", "রুটি তৈরির পদ্ধতি")
   - Ingredient safety with cooking context ("Can I fry fish with diabetes? What oil?")
   - Spice / ingredient substitution in cooking
   - Step-by-step cooking instructions

OUTPUT ONLY valid JSON, no extra text:
{"intent": "pusti_ai"} or {"intent": "nutrisaathi"}
"""


async def router_node(state: AgentState) -> AgentState:
    """Classify user intent and set state['intent']."""
    message = state.get("message", "")
    history = state.get("history", [])

    # Build a short context window for the classifier
    context_turns = []
    for turn in history[-4:]:
        context_turns.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})
    context_turns.append({"role": "user", "content": message})

    messages = [{"role": "system", "content": _ROUTER_SYSTEM_PROMPT}] + context_turns

    try:
        raw = await llm_client.chat_completion(
            messages=messages,
            temperature=0.0,
            max_tokens=20,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(raw)
        intent = parsed.get("intent", "pusti_ai")
        if intent not in ("pusti_ai", "nutrisaathi"):
            intent = "pusti_ai"
    except Exception as e:
        logger.warning("RouterNode classification failed, defaulting to pusti_ai: %s", e)
        intent = "pusti_ai"

    logger.info("RouterNode: message='%.60s...' → intent='%s'", message, intent)
    return {**state, "intent": intent}
