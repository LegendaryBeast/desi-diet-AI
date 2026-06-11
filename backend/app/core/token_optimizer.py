"""Token Optimization Utilities for Pusti AI.

Implements:
1. Semantic Caching (Redis with local in-memory fallback)
2. Sliding History Window & Caching Conversation Summarizer
3. Local Semantic Context Pruning (Jaccard relevance ranking)
"""

import json
import hashlib
import logging
import math
from typing import List, Dict, Any, Tuple, Optional
from app.config import settings
from app.core.llm_client import llm_client

logger = logging.getLogger(__name__)

# Try to import redis; if import or connection fails, we fall back to local in-memory cache
REDIS_AVAILABLE = False
redis_client = None

try:
    import redis
    # Parse redis URL
    redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    # Test connection
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("✅ Redis connected successfully for Semantic Caching.")
except Exception as e:
    logger.warning("⚠️ Redis is not available. Falling back to local in-memory caching: %s", e)
    REDIS_AVAILABLE = False
    redis_client = None

# Local Fallback Storages
_LOCAL_SEMCACHE: List[Dict[str, Any]] = []
_LOCAL_SUMMARIES: Dict[str, str] = {}

# Heuristic list of words indicating personal queries that should NOT be globally cached
_PERSONAL_KEYWORDS = [
    "i", "me", "my", "mine", "we", "us", "our", "you", "your",
    "আমি", "আমার", "আমাদের", "তুমি", "তোমার", "লগ", "খেলাম",
    "খাইছি", "খেয়েছি", "পরিকল্পনা", "রিপোর্ট", "remind", "reminder",
    "medicine", "ওষুধ", "ট্যাবলেট", "ডোজ", "পাসওয়ার্ড", "password",
    # Meal-plan / report keywords — prevent caching user-specific responses
    "breakfast", "lunch", "dinner", "snack", "meal", "meals", "food", "foods",
    "report", "summary", "progress", "log",
    "খাবার", "আজকের", "খেয়েছি", "খাইছি",
    # Transliterated Bengali & Script keywords for food/diet queries
    "khabo", "khabo?", "khai", "khacchi", "khacche", "khelam", "khaichi",
    "ajke", "ajker", "shokal", "shokale", "nasta", "dupur", "dupure", "rat", "rate", "rater",
    "খাবো", "খাব", "খাব?", "খাবো?", "খাই", "আজকে", "আজকের", "সকাল", "সকালের",
    "নাস্তা", "দুপুর", "দুপুরের", "রাত", "রাতের", "খাবো কি", "কি খাবো",
    "today", "todays", "tomorrow", "tomorrows", "yesterday", "yesterdays",
    "diet", "dietplan", "plan", "planning", "daily",
]


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(x * y for x, y in zip(v1, v2))
    mag_v1 = math.sqrt(sum(x * x for x in v1))
    mag_v2 = math.sqrt(sum(y * y for y in v2))
    if mag_v1 == 0.0 or mag_v2 == 0.0:
        return 0.0
    return dot_product / (mag_v1 * mag_v2)


class TokenOptimizer:
    """Singleton helper managing token optimization flows."""

    def is_cacheable(self, query: str) -> bool:
        """Check if query is general/cacheable (not user-specific or private)."""
        query_lower = query.lower().strip()
        if not query_lower:
            return False
        # If query is too long, it's likely a custom description
        if len(query_lower) > 120:
            return False

        # Tokenize by word to match exact English words accurately
        import re
        words = set(re.findall(r'\b\w+\b', query_lower))
        words.update(query_lower.split())

        for kw in _PERSONAL_KEYWORDS:
            # If kw is single letter or short english word, match exact word
            if len(kw) <= 4 and kw.isalnum():
                if kw in words:
                    return False
            else:
                # Substring match is okay for Bengali/longer words
                if kw in query_lower:
                    return False
        return True

    async def lookup_semantic_cache(self, query: str) -> Optional[Dict[str, Any]]:
        """Look up a query in the semantic cache. Returns cached response dict if matched."""
        if not self.is_cacheable(query):
            return None

        query_clean = query.strip().lower()
        if not query_clean:
            return None

        query_hash = hashlib.md5(query_clean.encode("utf-8")).hexdigest()

        # 1. Exact Match lookup (extremely fast, 0 LLM/embedding calls)
        try:
            if REDIS_AVAILABLE and redis_client:
                cached = redis_client.get(f"semcache_exact:{query_hash}")
                if cached:
                    logger.info("⚡ Semantic Cache: Exact match hit in Redis for query='%s'", query[:40])
                    return json.loads(cached)
            else:
                # Local exact match lookup
                for item in _LOCAL_SEMCACHE:
                    if item["query"] == query_clean:
                        logger.info("⚡ Semantic Cache: Exact match hit in Local Cache for query='%s'", query[:40])
                        return {
                            "reply": item["reply"],
                            "intent": item["intent"],
                            "tool_calls": item["tool_calls"]
                        }
        except Exception as e:
            logger.warning("Exact match lookup error: %s", e)

        # 2. Embedding generation for semantic match
        try:
            query_vector = await llm_client.get_embedding(query_clean)
        except Exception as e:
            logger.warning("Failed to generate embedding for semantic cache: %s", e)
            return None

        # 3. Retrieve all cached items
        items = []
        if REDIS_AVAILABLE and redis_client:
            try:
                raw_items = redis_client.lrange("semcache:items", 0, -1)
                for item_str in raw_items:
                    items.append(json.loads(item_str))
            except Exception as e:
                logger.warning("Redis lrange error: %s", e)
        else:
            items = _LOCAL_SEMCACHE

        # 4. Search for highest similarity
        best_match = None
        best_score = 0.0

        for item in items:
            cached_vector = item.get("embedding")
            if not cached_vector:
                continue
            sim = _cosine_similarity(query_vector, cached_vector)
            if sim > best_score:
                best_score = sim
                best_match = item

        # Match threshold (0.94 is high similarity for text-embedding-3-small)
        THRESHOLD = 0.94
        if best_score >= THRESHOLD and best_match:
            logger.info("⚡ Semantic Cache: Semantic hit (score=%.4f) for query='%s'", best_score, query[:40])
            result = {
                "reply": best_match["reply"],
                "intent": best_match["intent"],
                "tool_calls": best_match["tool_calls"]
            }
            # Cache exact match helper for next time
            try:
                if REDIS_AVAILABLE and redis_client:
                    redis_client.setex(f"semcache_exact:{query_hash}", 3600 * 24, json.dumps(result))
                else:
                    # Insert at the beginning of local cache to make exact match hit first next time
                    # if it wasn't already there
                    exists = any(item["query"] == query_clean for item in _LOCAL_SEMCACHE)
                    if not exists:
                        _LOCAL_SEMCACHE.insert(0, {
                            "query": query_clean,
                            "embedding": query_vector,
                            **result
                        })
            except Exception:
                pass
            return result

        return None

    async def save_semantic_cache(self, query: str, response: Dict[str, Any]):
        """Save a new item to semantic cache if it is cacheable."""
        if not self.is_cacheable(query):
            return

        query_clean = query.strip().lower()
        query_hash = hashlib.md5(query_clean.encode("utf-8")).hexdigest()

        try:
            query_vector = await llm_client.get_embedding(query_clean)
        except Exception as e:
            logger.warning("Failed to generate embedding for saving cache: %s", e)
            return

        cache_data = {
            "query": query_clean,
            "embedding": query_vector,
            "reply": response.get("reply") or "",
            "intent": response.get("intent") or "pusti_ai",
            "tool_calls": response.get("tool_calls")
        }

        # Save exact match helper
        result_simple = {
            "reply": cache_data["reply"],
            "intent": cache_data["intent"],
            "tool_calls": cache_data["tool_calls"]
        }

        if REDIS_AVAILABLE and redis_client:
            try:
                # Store exact match
                redis_client.setex(f"semcache_exact:{query_hash}", 3600 * 24, json.dumps(result_simple))
                # Push to list
                redis_client.lpush("semcache:items", json.dumps(cache_data))
                # Trim list to max 500 items to keep lookup memory footprint small
                redis_client.ltrim("semcache:items", 0, 499)
                logger.info("💾 Saved query='%s' to Redis Semantic Cache", query[:40])
            except Exception as e:
                logger.warning("Failed to write to Redis semantic cache: %s", e)
        else:
            # Local fallback push & trim
            _LOCAL_SEMCACHE.insert(0, cache_data)
            del _LOCAL_SEMCACHE[500:]
            logger.info("💾 Saved query='%s' to Local Semantic Cache", query[:40])

    async def condense_history(self, history: List[Dict[str, str]]) -> Tuple[List[Dict[str, str]], Optional[str]]:
        """Cap conversational history at a fixed sliding window of 6 turns.

        Summarizes older turns into a single paragraph and returns (active_history, summary).
        """
        # If history is short, no compression needed
        if len(history) <= 6:
            return history, None

        # Active sliding window is the last 6 turns
        active_history = history[-6:]
        early_history = history[:-6]

        # Serialize early history to hash
        history_str = json.dumps(early_history, sort_keys=True)
        history_hash = hashlib.md5(history_str.encode("utf-8")).hexdigest()

        # Check for cached summary
        summary = None
        if REDIS_AVAILABLE and redis_client:
            try:
                summary = redis_client.get(f"semcache_summary:{history_hash}")
            except Exception as e:
                logger.warning("Redis summary lookup error: %s", e)
        else:
            summary = _LOCAL_SUMMARIES.get(history_hash)

        if summary:
            logger.info("⚡ Summary Cache: Hit for hash=%s", history_hash[:10])
            return active_history, summary

        # Summary missed: generate summary using OpenAI
        logger.info("✨ Summary Cache: Miss. Generating summary for %d early turns...", len(early_history))
        
        sum_system = (
            "You are a professional clinical dietitian assistant. Summarize the user's dietary preferences, "
            "logged meals, health targets, medical conditions, and key discussion points from this early part of "
            "the conversation into a single, highly concise paragraph (max 3 sentences) in English. "
            "Include only factual details. Do not include greetings or conversational filler."
        )

        messages = [{"role": "system", "content": sum_system}]
        for turn in early_history:
            messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})
        messages.append({"role": "user", "content": "Summarize all the critical user health/food context from above."})

        try:
            summary = await llm_client.chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=256
            )
            summary = summary.strip()
        except Exception as e:
            logger.error("Failed to summarize early history: %s", e)
            # Fallback to no summary
            return active_history, None

        # Cache summary
        if REDIS_AVAILABLE and redis_client:
            try:
                # Cache for 4 hours
                redis_client.setex(f"semcache_summary:{history_hash}", 3600 * 4, summary)
            except Exception as e:
                logger.warning("Redis summary cache write failed: %s", e)
        else:
            _LOCAL_SUMMARIES[history_hash] = summary

        return active_history, summary

    def prune_context(self, context_str: str, query: str, max_chars: int = 1500) -> str:
        """Prunes long RAG food contexts locally using Jaccard token relevance to fit prompt limits."""
        if not context_str or len(context_str) <= max_chars:
            return context_str

        # Find header lines vs content lines
        lines = context_str.split("\n")
        header_lines = []
        content_lines = []

        for line in lines:
            if line.startswith("===") or line.strip() == "":
                header_lines.append(line)
            else:
                content_lines.append(line)

        # Query tokens for relevance comparison
        query_tokens = set(w.lower() for w in query.split() if len(w) > 2)

        scored_lines = []
        for line in content_lines:
            line_tokens = set(w.lower() for w in line.split() if len(w) > 2)
            # Jaccard overlap score
            overlap = len(query_tokens.intersection(line_tokens))
            score = overlap / len(query_tokens.union(line_tokens)) if query_tokens else 0.0
            scored_lines.append((score, line))

        # Sort lines by score descending (most relevant first)
        scored_lines.sort(key=lambda x: x[0], reverse=True)

        # Take lines until character cap is met
        kept_lines = []
        current_len = sum(len(h) + 1 for h in header_lines)

        # Always try to keep at least top 2 items
        for i, (score, line) in enumerate(scored_lines):
            line_len = len(line) + 2
            if i < 2 or (current_len + line_len) <= max_chars:
                kept_lines.append(line)
                current_len += line_len
            else:
                break

        # Reconstruct pruned context
        pruned_context = []
        for line in lines:
            if line.startswith("===") or line.strip() == "":
                pruned_context.append(line)
            elif line in kept_lines:
                pruned_context.append(line)

        return "\n".join(pruned_context)


# Singleton optimizer instance
token_optimizer = TokenOptimizer()
