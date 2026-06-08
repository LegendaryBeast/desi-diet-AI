"""
LangGraph Graph — Unified Pushti AI + NutriSaathi agent.

Graph topology
──────────────
  START → router_node → (conditional edge on intent)
                ├─ "pusti_ai"    → pusti_ai_node → END
                └─ "nutrisaathi" → nutrisaathi_node → END

The compiled graph is exposed as `unified_graph` and called from
the /chat/unified endpoint in chat.py.
"""

import logging
from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.safety_guard import safety_guard_node
from app.agents.router_node import router_node
from app.agents.pusti_ai_node import pusti_ai_node
from app.agents.nutrisaathi_node import nutrisaathi_node

logger = logging.getLogger(__name__)


def _route_safety(state: AgentState) -> str:
    """Conditional edge: if intent is refused, exit immediately; otherwise route to intent classifier."""
    if state.get("intent") == "refused":
        logger.info("Safety guard flagged query. Exiting graph.")
        return "end"
    return "router"


def _route_intent(state: AgentState) -> str:
    """Conditional edge: read state['intent'] and route to the matching node."""
    intent = state.get("intent", "pusti_ai")
    logger.info("Graph routing to: %s", intent)
    return intent


def build_unified_graph():
    """Build and compile the unified agent StateGraph."""
    builder = StateGraph(AgentState)

    # Register nodes
    builder.add_node("safety_guard", safety_guard_node)
    builder.add_node("router", router_node)
    builder.add_node("pusti_ai", pusti_ai_node)
    builder.add_node("nutrisaathi", nutrisaathi_node)

    # Edges
    builder.add_edge(START, "safety_guard")
    
    # Conditional routing after safety check
    builder.add_conditional_edges(
        "safety_guard",
        _route_safety,
        {
            "end": END,
            "router": "router",
        },
    )

    builder.add_conditional_edges(
        "router",
        _route_intent,
        {
            "pusti_ai":    "pusti_ai",
            "nutrisaathi": "nutrisaathi",
        },
    )
    builder.add_edge("pusti_ai",    END)
    builder.add_edge("nutrisaathi", END)

    return builder.compile()


# Singleton compiled graph — imported by the endpoint
unified_graph = build_unified_graph()
