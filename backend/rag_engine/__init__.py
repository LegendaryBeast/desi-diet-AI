"""
RAG Engine — Self-contained module replacing the old graph_rag_bridge.

Provides:
- KhadokGraphRAG: Neo4j food search/retrieval with mock fallback
- calculate_targets: NDG 2025 calorie/macro calculator
- NDG_DIETARY_RULES: Static dietary rules data
- RAG Planner: SentenceTransformer-based disease-aware food recommendation

Usage (drop-in replacement for old graph_rag_bridge):
    from rag_engine import KhadokGraphRAG, calculate_targets, NDG_DIETARY_RULES

Usage (new RAG planner):
    from rag_engine import get_rag_recommended_foods, load_rag_models
"""

from .calorie_engine import calculate_targets
from .dietary_rules_data import NDG_DIETARY_RULES
from .food_engine import KhadokGraphRAG
from .planner import (
    load_rag_models,
    get_rag_recommended_foods,
    find_best_disease_match,
)

__all__ = [
    "KhadokGraphRAG",
    "calculate_targets",
    "NDG_DIETARY_RULES",
    "load_rag_models",
    "get_rag_recommended_foods",
    "find_best_disease_match",
]
