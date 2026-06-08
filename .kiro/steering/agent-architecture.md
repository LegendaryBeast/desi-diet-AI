---
mode: always
---

# Unified Agent Architecture (LangGraph)

This file steers the development and modification of agent flows, nodes, and states in the DesiDiet unified agent system.

## Topology & Graph Execution
We employ **LangGraph (StateGraph)** to orchestrate user interactions. The path follows:
1. `START` leads directly to the `safety_guard` node.
2. `safety_guard` runs the safety check and routes to:
   * `end` (if the query is unsafe or out-of-scope).
   * `router` (if the query is valid).
3. `router` classifies the user intent and sets `state["intent"]` to:
   * `"pusti_ai"` (for clinical metrics, logs, meal planning, and safety checks).
   * `"nutrisaathi"` (for step-by-step recipe cooking assistance).
4. The matching node (`pusti_ai` or `nutrisaathi`) processes the state and generates the response.
5. The active node routes to `END`.

## State Contract (`AgentState`)
Every node must accept and return fields within the `AgentState` TypedDict:
* `user_id`: str (authenticated user ID)
* `message`: str (current user input)
* `language`: str ("bn" | "en")
* `history`: List[Dict[str, str]] (short-term conversation history)
* `intent`: Optional[str] (resolved intent)
* `reply`: Optional[str] (accumulated text response)
* `tool_calls`: Optional[List[Dict[str, Any]]] (registered tools called by Pusti AI)
* `sse_chunks`: List[str] (accumulated SSE chunks for streaming)
