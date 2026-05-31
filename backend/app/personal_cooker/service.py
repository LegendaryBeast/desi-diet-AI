"""Personal Cooker RAG service — query rewrite, embed, retrieve, synthesize."""

import os
import csv
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.config import settings
from app.db import prisma
from app.core.llm_client import llm_client

logger = logging.getLogger(__name__)

# ── Lazy-loaded embedding model ──────────────────────────────────────────────
_embedding_model = None


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from fastembed import TextEmbedding

            logger.info("Loading embedding model all-MiniLM-L6-v2 via fastembed...")
            _embedding_model = TextEmbedding(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            logger.info("Embedding model loaded.")
        except Exception as e:
            logger.warning("Failed to load fastembed embedding model: %s", e)
            _embedding_model = False
    return _embedding_model if _embedding_model is not False else None


# ── Lazy-loaded Pinecone client ─────────────────────────────────────────────
_pinecone_client = None
_pinecone_index = None


def _get_pinecone_index():
    global _pinecone_client, _pinecone_index
    if _pinecone_index is None and settings.pinecone_api_key:
        try:
            from pinecone import Pinecone

            _pinecone_client = Pinecone(api_key=settings.pinecone_api_key)
            _pinecone_index = _pinecone_client.Index(settings.pinecone_index)
            logger.info("Pinecone index '%s' connected.", settings.pinecone_index)
        except Exception as e:
            logger.warning("Pinecone connection failed: %s", e)
            _pinecone_index = False
    return _pinecone_index if _pinecone_index is not False else None


# ── System prompt template (ported from personal-cooker v2.md) ───────────────
_NUTRISAATHI_SYSTEM_PROMPT = """You are NutriSaathi — a warm, expert, and deeply trusted personal cooking and nutrition guide for Bangladeshi people managing health conditions. You combine medical nutritional knowledge with a genuine understanding of Bangladeshi food culture, ingredients, and cooking traditions.

━━━ YOUR EXPERTISE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are trained on the National Dietary Guidelines for Bangladesh 2022. You understand:
  — Which Bangladeshi foods are safe, restricted, or harmful for each medical condition
  — Local ingredient names in both English and Bengali (e.g., lau = লাউ = bottle gourd)
  — Traditional Bangladeshi cooking methods, spices, and meal patterns
  — How conditions like diabetes, hypertension, CKD, liver disease, obesity, hypothyroidism, TB, diarrhoea, kidney stones, heart disease, and cancer affect dietary needs

━━━ CORE RULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ACCURACY FIRST: Base your answers heavily on the RETRIEVED CONTEXT block below. However, if the context is empty or irrelevant (which can happen if the user speaks in Romanized Bengali/Banglish), you MAY use your general expert nutritional knowledge to answer, provided you strictly adhere to the user's selected Condition.
2. CONDITION-SPECIFIC: Every answer must be tailored to the user's specific condition(s). Always state WHY a food is safe or unsafe.
3. CULTURALLY GROUNDED: Use familiar Bangladeshi ingredient names. Suggest locally available, affordable ingredients.
4. PRECISE AND PRACTICAL: Be specific: give amounts, quantities, timing, and method.
5. LANGUAGE MATCHING: If the user writes in Bengali script (বাংলা), respond in Bengali script. If the user writes in Romanized Bengali (Banglish), respond in Bengali script or English. Always be deeply helpful.
6. FORMATTING: When you give specific suggestions or warnings directly related to the condition, you MUST format those specific sentences in **bold text**.
7. MANDATORY COOKING DETAILS: You MUST NOT provide any answer without including a specific cooking procedure and a detailed list of individual ingredients. If a user asks a general question, you must still provide a relevant recipe with ingredients and a cooking procedure. If you absolutely cannot provide a cooking procedure and ingredients, you must refuse to answer the question.

━━━ RESPONSE FORMAT INSTRUCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Determine the user's intent and follow the matching structure:

A. IF RECIPE REQUEST:
   1. OPENING: Warm acknowledge, state recipe is for {condition}.
   2. RECIPE CARD: Use a box layout with Prep/Cook/Serves. List ingredients with quantities and Bengali names. Numbered steps.
   3. WHY THIS IS SAFE: 2-4 bullets on medical reasoning specific to {condition}.
   4. AVOID: 2-3 common ingredients to specifically avoid for {condition}.
   5. SAFETY NOTE: If the condition is NOT "None", write: "⚕️ এই রেসিপিটি {condition} রোগীদের জন্য বিশেষভাবে তৈরি করা হয়েছে। তবে আপনার ব্যক্তিগত স্বাস্থ্য পরিস্থিতি অনুযায়ী আপনার ডাক্তার বা ডায়েটিশিয়ানের পরামর্শ মেনে চলুন।" If condition is "None", write: "⚕️ সাধারণভাবে স্বাস্থ্যকর এই রেসিপিটি সবার জন্য উপযুক্ত। তবে আপনার যদি কোনো নির্দিষ্ট স্বাস্থ্য সমস্যা থাকে, ডাক্তার বা ডায়েটিশিয়ানের পরামর্শ নিন।"

B. IF FOOD SAFETY CHECK ("Can I eat X"):
   1. DIRECT VERDICT: Start with YES, LIMITED, or AVOID — specifically for {condition}.
   2. THE REASON: Explain WHY based on {condition}.
   3. IF SAFE/LIMITED: How to enjoy, portion size, pairing for {condition}.
   4. IF AVOIDED: 3 safe Bangladeshi alternatives suitable for {condition}.
   5. SAFETY NOTE: Mandatory closing using the same condition-aware note as in A.5.

C. IF GENERAL GUIDANCE:
   Structure with clear headings and bolded condition-specific advice for {condition}.

━━━ CONTEXT BLOCK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATIENT PROFILE:
- Condition: {condition}

{meal_plan_context}

RETRIEVED MEDICAL KNOWLEDGE (Use ONLY this):
{context}
"""

_QUERY_REWRITE_PROMPT = """You are a search query optimizer for a disease and nutrition database.
Your job is to rewrite the user's raw input query into a highly optimized search query.
- Combine the user's query with their medical condition: {condition}.
- Extract key food items, symptoms, and nutrients.
- Include both common English terms and common Bengali terms (in English script, e.g. "shak", "mach", "dosh") if relevant.
- OUTPUT ONLY the optimized search keywords. Do not include any introduction, explanations, or quotes. Keep it under 20 words."""


class PersonalCookerService:
    """Handles the full personal-cooker RAG pipeline."""

    @staticmethod
    async def rewrite_query(raw_query: str, condition: str) -> str:
        """Use a lightweight LLM call to expand the user query for better retrieval."""
        if condition == "None" or not condition:
            return raw_query
        try:
            messages = [
                {"role": "system", "content": _QUERY_REWRITE_PROMPT.format(condition=condition)},
                {"role": "user", "content": raw_query},
            ]
            rewritten = await llm_client.chat_completion(
                messages=messages,
                temperature=0.1,
                max_tokens=50,
            )
            return rewritten.strip() or raw_query
        except Exception as e:
            logger.warning("Query rewrite failed: %s", e)
            return raw_query

    @staticmethod
    def embed_query(text: str) -> Optional[List[float]]:
        """Embed text using all-MiniLM-L6-v2. Returns 384-dim vector."""
        model = _get_embedding_model()
        if model is None:
            return None
        try:
            embeddings = list(model.embed([text]))
            if not embeddings:
                return None
            return embeddings[0].tolist()
        except Exception as e:
            logger.warning("Embedding failed: %s", e)
            return None

    @staticmethod
    def retrieve_context(query_embedding: List[float], condition: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Query Pinecone for relevant chunks."""
        index = _get_pinecone_index()
        if index is None:
            return []

        try:
            filter_dict = {}
            if condition and condition != "None":
                filter_dict = {"condition": {"$eq": condition}}

            response = index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict if filter_dict else None,
            )

            matches = []
            for match in response.matches:
                meta = match.metadata or {}
                matches.append({
                    "id": match.id,
                    "score": match.score,
                    "condition": meta.get("condition", ""),
                    "text": meta.get("text", ""),
                    "category": meta.get("category", ""),
                })
            return matches
        except Exception as e:
            logger.warning("Pinecone query failed: %s", e)
            return []

    @staticmethod
    async def generate_reply(
        user_message: str,
        condition: str,
        history: List[Dict[str, str]],
        contexts: List[Dict[str, Any]],
        meal_plan_context: str = "",
    ) -> str:
        """Synthesize final reply using retrieved context + chat history."""
        context_str = "\n\n".join(
            f"--- Context from Knowledge Base (Condition: {c.get('condition')}) ---\n{c.get('text', '')}"
            for c in contexts
        ) if contexts else "No specific context retrieved. Use your general expert nutritional knowledge while strictly adhering to the user's condition."

        system_prompt = _NUTRISAATHI_SYSTEM_PROMPT.format(
            condition=condition or "None",
            context=context_str,
            meal_plan_context=meal_plan_context,
        )

        messages = [{"role": "system", "content": system_prompt}]
        # Add last 10 turns of history
        for msg in history[-10:]:
            role = msg.get("role", "user")
            if role == "system":
                role = "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_message})

        reply = await llm_client.chat_completion(
            messages=messages,
            temperature=0.3,
            max_tokens=4096,
        )
        return reply

    @staticmethod
    async def chat(
        user_id: str,
        message: str,
        condition: str,
        session_id: str,
    ) -> Dict[str, Any]:
        """Full pipeline: save user msg → rewrite → embed → retrieve → generate → save assistant msg."""
        condition = condition or "None"

        # 1. Save user message
        try:
            await prisma.personalcookerchat.create(
                data={
                    "userId": user_id,
                    "sessionId": session_id,
                    "role": "user",
                    "content": message,
                    "condition": condition,
                }
            )
        except Exception as e:
            logger.warning("Failed to save user personal-cooker message: %s", e)

        # 2. Rewrite query for better retrieval
        search_message = await PersonalCookerService.rewrite_query(message, condition)
        if search_message != message:
            logger.info("Rewritten query: '%s' -> '%s'", message, search_message)

        # 3. Embed query
        query_embedding = PersonalCookerService.embed_query(search_message)

        # 4. Retrieve from Pinecone
        contexts = []
        if query_embedding:
            contexts = PersonalCookerService.retrieve_context(query_embedding, condition, top_k=5)

        # 5. Load history
        history = await prisma.personalcookerchat.find_many(
            where={"userId": user_id, "sessionId": session_id},
            order={"createdAt": "asc"},
        )
        history_dicts = [{"role": h.role, "content": h.content} for h in history]

        # 5b. Fetch user's today's meal plan for context
        meal_plan_context = ""
        try:
            from datetime import timezone
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            today_plan = await prisma.mealplan.find_first(
                where={"userId": user_id, "planDate": {"gte": today}},
                order={"createdAt": "desc"},
            )
            if today_plan and today_plan.planData:
                import json
                plan_data = json.loads(today_plan.planData) if isinstance(today_plan.planData, str) else today_plan.planData
                completed = []
                if today_plan.completedSlots:
                    completed = json.loads(today_plan.completedSlots) if isinstance(today_plan.completedSlots, str) else today_plan.completedSlots
                lines = ["TODAY'S MEAL PLAN:"]
                for meal in plan_data.get("meals", []):
                    status = "✅ Eaten" if meal.get("slot") in completed else "⬜ Pending"
                    items_text = ", ".join(
                        f"{i.get('name_bn') or i.get('name_en')}"
                        for i in meal.get("items", [])
                    )
                    slot_bn = meal.get('slot_bn') or meal.get('slot', '')
                    lines.append(f"  [{slot_bn}] {status}: {items_text}")
                meal_plan_context = "\n".join(lines)
        except Exception as e:
            logger.warning("Failed to load meal plan for personal cooker: %s", e)

        # 6. Generate reply
        reply = await PersonalCookerService.generate_reply(
            user_message=message,
            condition=condition,
            history=history_dicts,
            contexts=contexts,
            meal_plan_context=meal_plan_context,
        )

        # 7. Save assistant message
        try:
            await prisma.personalcookerchat.create(
                data={
                    "userId": user_id,
                    "sessionId": session_id,
                    "role": "assistant",
                    "content": reply,
                    "condition": condition,
                }
            )
        except Exception as e:
            logger.warning("Failed to save assistant personal-cooker message: %s", e)

        return {
            "reply": reply,
            "context_used": [c["id"] for c in contexts],
        }

    @staticmethod
    async def get_history(user_id: str, session_id: str) -> List[Dict[str, str]]:
        """Return chat history for a session."""
        rows = await prisma.personalcookerchat.find_many(
            where={"userId": user_id, "sessionId": session_id},
            order={"createdAt": "asc"},
        )
        return [{"role": r.role, "content": r.content} for r in rows]

    @staticmethod
    async def clear_history(user_id: str, session_id: str) -> None:
        """Delete all messages for a session."""
        await prisma.personalcookerchat.delete_many(
            where={"userId": user_id, "sessionId": session_id}
        )

    @staticmethod
    def get_conditions() -> List[str]:
        """Read conditions from the disease_nutrients.csv shipped with the project."""
        csv_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..",
            "data", "disease_nutrients.csv"
        )
        csv_path = os.path.abspath(csv_path)
        if not os.path.exists(csv_path):
            # Fallback to standalone app copy
            csv_path = os.path.join(
                os.path.dirname(__file__), "..", "..", "..",
                "personal cooker", "backend", "disease_nutrients.csv"
            )
            csv_path = os.path.abspath(csv_path)
        if not os.path.exists(csv_path):
            # Fallback: common conditions hardcoded
            return sorted([
                "Anemia", "Asthma", "Bronchitis", "Burns", "Cancer",
                "Chronic Kidney Disease", "Coronary Heart Disease", "Diabetes",
                "Diarrhoea", "Hypertension", "Hypothyroidism", "Kidney Stones",
                "Liver Disease", "Obesity", "Tuberculosis",
            ])

        conditions = set()
        try:
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                next(reader, None)  # skip header
                for row in reader:
                    if not row:
                        continue
                    disease = row[0].strip().strip('"')
                    if disease:
                        conditions.add(disease)
        except Exception as e:
            logger.warning("Failed to read disease_nutrients.csv: %s", e)

        return sorted(list(conditions))
