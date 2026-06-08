"""Shared LangGraph state type for the unified Pushti AI + NutriSaathi agent."""

from typing import List, Dict, Any, Optional, Annotated
from typing_extensions import TypedDict
import operator


class AgentState(TypedDict):
    """
    The shared state that flows through every node in the LangGraph.

    Fields
    ------
    user_id     : Authenticated user's DB id.
    message     : The latest user message text.
    language    : "bn" | "en"
    history     : Last N turns [{role, content}, ...]
    intent      : Classified intent string (set by RouterNode).
    condition   : Medical condition string used by NutriSaathi.
    session_id  : NutriSaathi session key.
    reply       : Final text reply accumulated by the active sub-agent.
    tool_calls  : Optional list of tool call dicts from Pusti AI.
    sse_chunks  : Accumulated SSE-ready text chunks for streaming.
    error       : Error message if something went wrong.
    """
    user_id:    str
    message:    str
    language:   str
    history:    List[Dict[str, str]]
    intent:     Optional[str]
    condition:  Optional[str]
    session_id: Optional[str]
    reply:      Optional[str]
    tool_calls: Optional[List[Dict[str, Any]]]
    sse_chunks: Annotated[List[str], operator.add]   # accumulate across nodes
    error:      Optional[str]
    early_history_summary: Optional[str]
