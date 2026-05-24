"""Meal plan generation service — GraphRAG + Calorie Engine + Groq LLM (Llama 3.3)."""

import json
import random
import unicodedata
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.db import prisma
from app.core.llm_client import llm_client
from app.utils import safe_list, to_json_string
from rag_engine import calculate_targets, KhadokGraphRAG, NDG_DIETARY_RULES, get_rag_recommended_foods


# Singleton Neo4j connection
_rag_engine = None


def _get_rag() -> KhadokGraphRAG:
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = KhadokGraphRAG()
    return _rag_engine


# ── Emoji assignment ──────────────────────────────────────────────────────────
# Two-layer lookup: (1) substring match on Bengali/English name, (2) food_group
# default. Used to enrich both LLM-generated and fallback meal items so the UI
# can show a glyph in front of every food.

_NAME_EMOJI_RULES: List[tuple] = [
    # (substrings_lower, emoji) — first match wins. Bengali + English variants.
    (("ভাত", "চাল", "rice", "polao", "biryani", "khichuri", "খিচুড়ি", "পোলাও"), "🍚"),
    (("রুটি", "আটা", "ময়দা", "roti", "bread", "naan", "নান", "porota", "পরোটা"), "🫓"),
    (("সুজি", "সেমাই", "halwa", "halua", "হালুয়া", "vermicelli"), "🍮"),
    (("oat", "cereal", "ওটস", "কর্নফ্লেক্স"), "🥣"),
    (("ডিম", "egg"), "🥚"),
    (("মুরগি", "chicken", "পোলট্রি"), "🍗"),
    (("গরু", "beef"), "🥩"),
    (("খাসি", "পাঁঠা", "mutton", "lamb", "goat"), "🍖"),
    (("চিংড়ি", "shrimp", "prawn"), "🦐"),
    (("কাঁকড়া", "crab"), "🦀"),
    (("ইলিশ", "rui", "katla", "tilapia", "মাছ", "fish"), "🐟"),
    (("দুধ", "milk"), "🥛"),
    (("দই", "yogurt", "yoghurt", "curd"), "🥣"),
    (("পনির", "ছানা", "cheese", "paneer"), "🧀"),
    (("মাখন", "butter", "ঘি", "ghee"), "🧈"),
    (("ডাল", "dal", "lentil", "মসুর", "মুগ"), "🍲"),
    (("ছোলা", "chickpea", "chana", "মটর", "pea ", "peas"), "🫘"),
    (("শাক", "spinach", "leafy", "kolmi", "kalmi", "পাতা"), "🥬"),
    # Core Staples
    (("ভাত", "চাল", "rice"), "🍚"),
    (("রুটি", "আটা", "ময়দা", "সুজি", "সেমাই", "গম", "roti", "atta", "flour", "wheat", "semolina", "vermicelli"), "🍚"),
    # Proteins
    (("ডিম", "egg"), "🥚"),
    (("মুরগি", "chicken", "poultry"), "🍗"),
    (("মাছ", "fish", "pangas", "ruhi", "tilapia", "hilsa", "carp", "tengra", "mola"), "🐟"),
    (("গরু", "খাসি", "মাংস", "ছাগল", "ভেড়া", "মহিষ", "beef", "mutton", "meat", "lamb", "pork"), "🥩"),
    (("ডাল", "dal", "lentil", "pulse", "chola", "ছোলা", "peas"), "🍲"),
    # Fruits, Vegetables & Leaves
    (("শাক", "leafy", "spinach", "leaves", "পাতা", "leaf", "parsley", "coriander", "পুদিনা", "ধনে"), "🥬"),
    (("আলু", "potato"), "🥔"),
    (("টমেটো", "tomato"), "🍅"),
    (("গাজর", "carrot"), "🥕"),
    (("বেগুন", "eggplant", "brinjal", "aubergine"), "🍆"),
    (("ফুলকপি", "cauliflower", "broccoli"), "🥦"),
    (("বাঁধাকপি", "cabbage"), "🥦"),
    (("শসা", "cucumber"), "🥒"),
    (("মরিচ", "pepper", "chili", "chilli"), "🌶️"),
    (("পেঁয়াজ", "onion", "রসুন", "garlic"), "🧅"),
    (("ভুট্টা", "corn", "maize"), "🌽"),
    (("মাশরুম", "mushroom"), "🍄"),
    (("কলা", "banana"), "🍌"),
    (("আপেল", "apple"), "🍎"),
    (("কমলা", "orange", "tangerine"), "🍊"),
    (("আম", "mango"), "🥭"),
    (("পেয়ারা", "guava"), "🍐"),
    (("আঙ্গুর", "grape"), "🍇"),
    (("তরমুজ", "watermelon"), "🍉"),
    (("আনারস", "pineapple"), "🍍"),
    (("নারকেল", "coconut"), "🥥"),
    (("খেজুর", "date "), "🍯"),
    (("পেঁপে", "papaya"), "🍈"),
    (("কাঁঠাল", "jackfruit"), "🥭"),
    (("লেবু", "lemon", "lime"), "🍋"),
    (("বাদাম", "almond", "nut", "peanut", "কাজু", "cashew"), "🥜"),
    (("চা", "tea"), "🍵"),
    (("কফি", "coffee"), "☕"),
    (("জুস", "juice", "শরবত"), "🧃"),
    (("পানি", "water"), "💧"),
    (("মধু", "honey"), "🍯"),
    (("চিনি", "sugar", "জাগেরি", "jaggery", "গুড়"), "🍬"),
    (("তেল", "oil"), "🫒"),
]


def _get_cooked_name(raw_name_bn: str, raw_name_en: str, food_group_name: str) -> tuple:
    """Convert raw DB ingredient names into realistic cooked Bangladeshi dish names.
    
    Shared by both the LLM validation path and the fallback plan builder so
    the final output always shows practical, cooked meal names.
    """
    bn = raw_name_bn
    en = raw_name_en
    if "সিদ্ধ চাল" in raw_name_bn:
        bn = "সিদ্ধ চালের ভাত"
        en = "Cooked Parboiled Rice"
    elif "আতপ চাল" in raw_name_bn:
        bn = "আতপ চালের ভাত"
        en = "Cooked Atap Rice"
    elif "আটা" in raw_name_bn:
        bn = "আটা রুটি"
        en = "Atta Roti"
    elif "ময়দা" in raw_name_bn:
        bn = "ময়দা রুটি"
        en = "White Flour Roti"
    elif "সুজি" in raw_name_bn:
        bn = "সুজির হালুয়া"
        en = "Semolina Halwa"
    elif "সেমাই" in raw_name_bn:
        bn = "রান্না করা মিষ্টি সেমাই"
        en = "Cooked Vermicelli"
    elif "পোলট্রি মুরগির  ডিম" in raw_name_bn or "মুরগির ডিম" in raw_name_bn or "ডিম" in raw_name_bn:
        bn = "সিদ্ধ মুরগির ডিম"
        en = "Boiled Poultry Egg"
    elif "পোলট্রি মুরগি" in raw_name_bn or "মুরগি" in raw_name_bn:
        bn = "মুরগির মাংসের তরকারি (কম তেল)"
        en = "Chicken Curry (Low Oil)"
    elif "গরুর মাংস" in raw_name_bn or "গরুর" in raw_name_bn:
        bn = "গরুর মাংসের তরকারি (কম চর্বি)"
        en = "Beef Curry (Low Fat)"
    elif "পাঁঠার মাংস" in raw_name_bn or "খাসি" in raw_name_bn:
        bn = "খাসির মাংসের তরকারি"
        en = "Mutton Curry"
    elif "ডাল" in raw_name_bn:
        bn = f"{raw_name_bn} (রান্না করা)"
        en = f"Cooked {raw_name_en}"
    elif "মটর" in raw_name_bn or "ছোলা" in raw_name_bn:
        bn = f"{raw_name_bn}র তরকারি"
        en = f"Cooked {raw_name_en}"
    elif "মাছ" in raw_name_bn or food_group_name in ("Fish & Seafood", "Marine Fish", "Fresh Water Fish and Shellfish", "Marine Shellfish"):
        bn = f"{raw_name_bn}র হালকা ঝোল / দো পেঁয়াজা"
        en = f"{raw_name_en} Curry"
    elif "কচু পাতা" in raw_name_bn:
        bn = "কচু পাতার ভর্তা"
        en = "Colocasia Leaf Bhorta"
    elif "শাক" in raw_name_bn or food_group_name in ("Leafy Vegetables", "Green Leafy Vegetables"):
        bn = f"{raw_name_bn} ভাজি"
        en = f"Stir-fried {raw_name_en}"
    elif food_group_name in ("Vegetables", "Other Vegetables", "Roots and Tubers", "Roots & Tubers"):
        bn = f"{raw_name_bn}র তরকারি"
        en = f"{raw_name_en} Curry"
    return bn, en


_GROUP_EMOJI: Dict[str, str] = {
    "Cereals & Grains": "🍚",
    "Cereals": "🍚",
    "Grains": "🍚",
    "Pulses & Legumes": "🍲",
    "Legumes": "🍲",
    "Fish & Seafood": "🐟",
    "Meat & Poultry": "🍗",
    "Eggs": "🥚",
    "Dairy & Milk": "🥛",
    "Dairy": "🥛",
    "Vegetables": "🥗",
    "Leafy Vegetables": "🥬",
    "Fruits": "🍎",
    "Nuts & Seeds": "🥜",
    "Beverages": "🥤",
    "Sweets": "🍬",
    "Spices": "🌶️",
    "Oils & Fats": "🫒",
}


def _emoji_for_item(item: Dict[str, Any]) -> str:
    """Return a food emoji based on item name (BN+EN) or food_group fallback."""
    name = f"{item.get('name_bn') or ''} {item.get('name_en') or ''}".lower()
    for keys, emoji in _NAME_EMOJI_RULES:
        if any(k.lower() in name for k in keys):
            return emoji
    group = item.get("food_group") or ""
    return _GROUP_EMOJI.get(group, "🍽️")


def _validate_emoji(item: Dict[str, Any]) -> str:
    emoji_str = item.get("emoji")
    if emoji_str and isinstance(emoji_str, str):
        # Clean any extra spaces or text
        emoji_str = emoji_str.strip()
        # Find the first character that is classified as a symbol
        for char in emoji_str:
            if unicodedata.category(char) in ('So', 'Sk'):
                return char
    # If no valid emoji is found, fall back to our existing name-based lookup
    return _emoji_for_item(item)


def _ensure_item_emojis(plan_data: Dict[str, Any]) -> Dict[str, Any]:
    """Walk every meal item and fill in `emoji` and `amount` if missing/empty/invalid."""
    for slot in plan_data.get("meals", []) or []:
        for item in slot.get("items", []) or []:
            item["emoji"] = _validate_emoji(item)
            if "amount_g" in item and not item.get("amount"):
                item["amount"] = f"{int(item['amount_g'])}g"
    return plan_data


def _parse_amount_g(amount: Any) -> float:
    if not amount:
        return 100.0
    try:
        return float(amount)
    except Exception:
        import re
        match = re.search(r"\d+", str(amount))
        return float(match.group()) if match else 100.0


def _get_food_by_code(driver, code: str) -> Optional[Dict[str, Any]]:
    query = """
    MATCH (f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
    WHERE f.code = $code
    RETURN f.code AS code,
           f.name_en AS name_en,
           coalesce(f.name_bn, f.name_en) AS name_bn,
           f.energy_kcal AS calories,
           f.protein_g AS protein,
           f.fiber_g AS fiber,
           fg.name_en AS food_group
    """
    try:
        with driver.session() as session:
            result = session.run(query, code=code).single()
            if result:
                rec = dict(result)
                rec["calories"] = round(float(rec["calories"] or 0), 1)
                rec["protein"] = round(float(rec["protein"] or 0), 2)
                rec["fiber"] = round(float(rec["fiber"] or 0), 2)
                return rec
    except Exception as e:
        print(f"⚠️ Failed to get food by code {code}: {e}")
    return None


def _find_closest_food_by_name(driver, name_en: str, name_bn: str) -> Optional[Dict[str, Any]]:
    # Only search if we have non-empty search terms
    en = (name_en or "").strip().lower()
    bn = (name_bn or "").strip().lower()
    if not en and not bn:
        return None
        
    clauses = []
    params = {}
    
    if en:
        clauses.append("toLower(f.name_en) CONTAINS $en OR toLower($en) CONTAINS toLower(f.name_en)")
        params["en"] = en
    if bn:
        clauses.append("toLower(f.name_bn) CONTAINS $bn OR toLower($bn) CONTAINS toLower(f.name_bn)")
        params["bn"] = bn
        
    where_clause = " OR ".join(clauses)
    
    query = f"""
    MATCH (f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
    WHERE {where_clause}
    RETURN f.code AS code,
           f.name_en AS name_en,
           coalesce(f.name_bn, f.name_en) AS name_bn,
           f.energy_kcal AS calories,
           f.protein_g AS protein,
           f.fiber_g AS fiber,
           fg.name_en AS food_group
    LIMIT 1
    """
    try:
        with driver.session() as session:
            result = session.run(query, **params).single()
            if result:
                rec = dict(result)
                rec["calories"] = round(float(rec["calories"] or 0), 1)
                rec["protein"] = round(float(rec["protein"] or 0), 2)
                rec["fiber"] = round(float(rec["fiber"] or 0), 2)
                return rec
    except Exception as e:
        print(f"⚠️ Failed to match food by name en={name_en}, bn={name_bn}: {e}")
    return None


def _validate_and_sanitize_meal_plan_foods(plan_data: Dict[str, Any], safe_foods: List[Dict[str, Any]], driver, slot_pools: Dict[str, List[str]] = None) -> Dict[str, Any]:
    """
    Validate every suggested food in the plan against the database/safe foods list.
    Corrects food codes, names, calories, and emoji fields.
    """
    safe_by_code = {f["code"]: f for f in safe_foods if f.get("code")}
    
    # Map slot to food dicts from safe_foods for fallback selections.
    slot_to_safe_foods = {}
    if slot_pools:
        for slot, codes in slot_pools.items():
            slot_to_safe_foods[slot] = [f for f in safe_foods if f.get("code") in codes]
            
    standard_fallbacks = {
        "breakfast": {
            "food_code": "A019",
            "name_bn": "আটা রুটি",
            "name_en": "Atta Roti",
            "calories": 150.0,
            "protein": 5.0,
            "food_group": "Cereals & Grains"
        },
        "lunch": {
            "food_code": "A018",
            "name_bn": "সিদ্ধ চালের ভাত",
            "name_en": "Cooked Parboiled Rice",
            "calories": 300.0,
            "protein": 6.0,
            "food_group": "Cereals & Grains"
        },
        "dinner": {
            "food_code": "A018",
            "name_bn": "সিদ্ধ চালের ভাত",
            "name_en": "Cooked Parboiled Rice",
            "calories": 250.0,
            "protein": 5.0,
            "food_group": "Cereals & Grains"
        },
        "snack": {
            "food_code": "F005",
            "name_bn": "পাকা কলা",
            "name_en": "Ripe Banana",
            "calories": 90.0,
            "protein": 1.0,
            "food_group": "Fruits"
        }
    }

    for meal in plan_data.get("meals", []) or []:
        slot_name = meal.get("slot", "").lower()
        items = meal.get("items", []) or []
        sanitized_items = []
        for item in items:
            code = item.get("food_code") or item.get("code") or ""
            name_en = item.get("name_en") or ""
            name_bn = item.get("name_bn") or ""
            
            db_food = None
            
            # 1. Match by code in safe_foods
            if code in safe_by_code:
                db_food = safe_by_code[code]
            else:
                # 2. Match by code in database
                db_food = _get_food_by_code(driver, code)
                if not db_food:
                    # 3. Match by name
                    db_food = _find_closest_food_by_name(driver, name_en, name_bn)
            
            # 4. Fallback if still no match found
            if not db_food:
                pool = slot_to_safe_foods.get(slot_name) or slot_to_safe_foods.get("breakfast") or []
                if pool:
                    db_food = random.choice(pool)
                else:
                    db_food = standard_fallbacks.get(slot_name) or standard_fallbacks["breakfast"]
                print(f"⚠️ Food '{name_en}' ({code}) not found. Falling back to '{db_food.get('name_en')}' ({db_food.get('code') or db_food.get('food_code')})")

            resolved_code = db_food.get("code") or db_food.get("food_code") or ""
            
            # Recalculate portion-based calories
            amount_g = _parse_amount_g(item.get("amount_g") or item.get("amount"))
            kcal_per_100g = float(db_food.get("calories") or db_food.get("energy_kcal") or 0)
            item_calories = round((kcal_per_100g * amount_g) / 100.0)
            
            item["food_code"] = resolved_code
            if "code" in item:
                item["code"] = resolved_code
            
            raw_bn = db_food.get("name_bn") or db_food.get("name_en") or ""
            raw_en = db_food.get("name_en") or ""
            raw_group = db_food.get("food_group") or ""
            cooked_bn, cooked_en = _get_cooked_name(raw_bn, raw_en, raw_group)
            item["name_en"] = cooked_en
            item["name_bn"] = cooked_bn
            item["calories"] = item_calories
            item["food_group"] = raw_group
            item["amount_g"] = amount_g
            # Always set amount for frontend compatibility
            item["amount"] = f"{int(amount_g)}g"
            
            # Validate and clean emoji
            item["emoji"] = _validate_emoji(item)
            
            sanitized_items.append(item)
            
        meal["items"] = sanitized_items
        
    return plan_data


def _get_popular_pairings(driver) -> List[Dict[str, Any]]:
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (f1:Food)-[r:PAIRS_WITH]->(f2:Food)
                RETURN f1.name_en AS f1_en, coalesce(f1.name_bn, f1.name_en) AS f1_bn,
                       f2.name_en AS f2_en, coalesce(f2.name_bn, f2.name_en) AS f2_bn,
                       r.popularity AS popularity, r.pairing_type AS pairing_type,
                       r.meal_slot AS meal_slot
                ORDER BY r.popularity DESC
            """)
            pairings = []
            for rec in result:
                pairings.append({
                    "f1_en": rec["f1_en"] or "",
                    "f1_bn": rec["f1_bn"] or rec["f1_en"] or "",
                    "f2_en": rec["f2_en"] or "",
                    "f2_bn": rec["f2_bn"] or rec["f2_en"] or "",
                    "popularity": rec["popularity"] or 1.0,
                    "pairing_type": rec["pairing_type"] or "",
                    "meal_slot": rec["meal_slot"] or "all"
                })
            return pairings
    except Exception as e:
        print(f"⚠️ Failed to get popular pairings: {e}")
        return []


def _get_slot_separated_foods(driver, safe_food_codes: set) -> Dict[str, set]:
    """
    Returns per-slot sets of food codes that are appropriate for each meal slot.
    Uses HAS_MEAL_SLOT relationships to enforce proper Bangladeshi meal structure.
    Returns: {breakfast: set, lunch: set, dinner: set, supplementary: set}
    """
    result = {"breakfast": set(), "lunch": set(), "dinner": set(), "supplementary": set()}
    try:
        with driver.session() as session:
            # Foods for each slot
            rows = session.run("""
                MATCH (f:Food)-[r:HAS_MEAL_SLOT]->(ms:MealSlot)
                WHERE f.code IN $codes
                RETURN f.code AS code, ms.name AS slot, r.role AS role
            """, codes=list(safe_food_codes)).data()

            for row in rows:
                slot = row["slot"]
                code = row["code"]
                role = row.get("role", "side")
                if slot in result:
                    result[slot].add(code)
                if slot == "all":
                    result["breakfast"].add(code)
                    result["lunch"].add(code)
                    result["dinner"].add(code)

            # Supplementary = foods marked is_supplementary=true (milk, fruits, etc.)
            supp = session.run("""
                MATCH (f:Food) WHERE f.is_supplementary = true AND f.code IN $codes
                RETURN f.code AS code
            """, codes=list(safe_food_codes)).data()
            for row in supp:
                result["supplementary"].add(row["code"])

    except Exception as e:
        print(f"⚠️ Failed to get slot-separated foods: {e}")
        # Fallback: allow all foods in all slots
        for key in result:
            result[key] = set(safe_food_codes)
    return result


def _ensure_balanced_food_list(rag: KhadokGraphRAG, rag_foods: List[Dict[str, Any]], min_per_group: int = 3) -> List[Dict[str, Any]]:
    """
    Ensures the food list has adequate representation from all major food groups
    and includes essential micronutrient-dense foods (eggs, milk, lentils, spinach, guava)
    so the LLM can build calorie-sufficient and nutrient-complete meal plans.
    """
    existing_codes = {f["code"] for f in rag_foods if f.get("code")}
    existing_groups = {f["food_group"] for f in rag_foods}

    driver = rag.get_neo4j_driver()
    supplemental = []

    # 1. Always ensure key micronutrient-dense staples are present
    essential_codes = ["M004", "L002", "B013", "C033", "E028"]
    missing_essentials = [c for c in essential_codes if c not in existing_codes]
    if missing_essentials:
        try:
            with driver.session() as session:
                result = session.run("""
                    MATCH (f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
                    WHERE f.code IN $codes
                    RETURN f.code AS code, f.name_en AS name_en,
                           coalesce(f.name_bn, f.name_en) AS name_bn,
                           f.energy_kcal AS calories, f.protein_g AS protein,
                           f.fiber_g AS fiber, fg.name_en AS food_group
                """, codes=missing_essentials)
                for rec in result:
                    if rec["code"] not in existing_codes:
                        supplemental.append({
                            "code":       rec["code"] or "",
                            "name_en":    rec["name_en"] or "",
                            "name_bn":    rec["name_bn"] or rec["name_en"] or "",
                            "calories":   round(float(rec["calories"] or 0), 1),
                            "protein":    round(float(rec["protein"]  or 0), 2),
                            "fiber":      round(float(rec["fiber"]    or 0), 2),
                            "food_group": rec["food_group"] or "Other",
                            "similarity_score": 0.0,
                        })
                        existing_codes.add(rec["code"])
                        existing_groups.add(rec["food_group"] or "Other")
        except Exception as e:
            print(f"⚠️ _ensure_balanced_food_list essentials query error: {e}")

    # 2. Check and ensure each major group has at least 3-4 diverse items for a balanced cultural diet
    has_grain = any(g in existing_groups for g in ["Cereals and Millets", "Cereals", "Cereals & Grains"])
    has_pulses = any(g in existing_groups for g in ["Grain Legumes", "Pulses & Legumes", "Pulse and Pulse Products"])
    has_meat = any(g in existing_groups for g in ["Poultry", "Animal Meat", "Meat & Poultry"])
    has_fish = any(g in existing_groups for g in ["Marine Fish", "Fresh Water Fish and Shellfish", "Marine Shellfish", "Fish & Seafood", "Fish and Fish Products"])

    # Query Neo4j for specific missing groups
    def fetch_missing_group_foods(groups, limit=4):
        try:
            with driver.session() as session:
                result = session.run("""
                    MATCH (f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
                    WHERE fg.name_en IN $groups AND f.is_partial = false
                    RETURN f.code AS code, f.name_en AS name_en,
                           coalesce(f.name_bn, f.name_en) AS name_bn,
                           f.energy_kcal AS calories, f.protein_g AS protein,
                           f.fiber_g AS fiber, fg.name_en AS food_group
                    ORDER BY f.energy_kcal DESC
                    LIMIT $limit
                """, groups=groups, limit=limit)
                
                added = 0
                for rec in result:
                    if rec["code"] not in existing_codes:
                        supplemental.append({
                            "code":       rec["code"] or "",
                            "name_en":    rec["name_en"] or "",
                            "name_bn":    rec["name_bn"] or rec["name_en"] or "",
                            "calories":   round(float(rec["calories"] or 0), 1),
                            "protein":    round(float(rec["protein"]  or 0), 2),
                            "fiber":      round(float(rec["fiber"]    or 0), 2),
                            "food_group": rec["food_group"] or "Other",
                            "similarity_score": 0.0,
                        })
                        existing_codes.add(rec["code"])
                        added += 1
                if added > 0:
                    print(f"✅ Supplemental: Added {added} items from {groups[0]}")
        except Exception as e:
            print(f"⚠️ _ensure_balanced_food_list groups query error for {groups}: {e}")

    # Enforce Staples
    if not has_grain:
        fetch_missing_group_foods(["Cereals and Millets", "Cereals", "Cereals & Grains"], limit=4)
        
    # Enforce Pulses
    if not has_pulses:
        fetch_missing_group_foods(["Grain Legumes", "Pulses & Legumes"], limit=4)

    # Enforce Meat & Poultry (Beef/Chicken)
    if not has_meat:
        fetch_missing_group_foods(["Poultry", "Animal Meat", "Meat & Poultry"], limit=5)

    # Enforce Fish & Seafood
    if not has_fish:
        fetch_missing_group_foods(["Marine Fish", "Fresh Water Fish and Shellfish", "Fish & Seafood"], limit=5)

    combined = rag_foods + supplemental
    print(f"✅ Balanced food list: {len(rag_foods)} RAG + {len(supplemental)} essential/staple foods")
    return combined


def _scale_plan_to_target(plan_data: Dict[str, Any], target_calories: int) -> Dict[str, Any]:
    """Scale all food item portions proportionally so the total calories exactly hit the target.
    This fixes the common issue where the LLM under-generates food portions.
    """
    meals = plan_data.get("meals", [])
    if not meals:
        return plan_data

    # Calculate actual total from LLM output
    actual_total = sum(
        item.get("calories", 0)
        for meal in meals
        for item in meal.get("items", [])
    )

    if actual_total <= 0:
        return plan_data

    # Only scale if there's a meaningful gap (>3% off target)
    gap_pct = abs(actual_total - target_calories) / target_calories
    if gap_pct < 0.03:
        return plan_data

    scale = target_calories / actual_total
    print(f"⚖️  Scaling plan: LLM generated {actual_total} kcal → scaling by {scale:.3f} to reach {target_calories} kcal")

    meal_targets = [0.30, 0.40, 0.30]  # breakfast / lunch / dinner fractions
    for i, meal in enumerate(meals):
        meal_target = round(target_calories * meal_targets[i]) if i < len(meal_targets) else round(target_calories / len(meals))
        meal["target_calories"] = meal_target
        items = meal.get("items", [])
        for item in items:
            original_cal = item.get("calories", 0)
            original_g   = item.get("amount_g", 0)
            item["calories"]  = round(original_cal * scale)
            item["amount_g"]  = round(original_g  * scale)

    return plan_data


def _build_meal_plan_prompt(
    profile: Any,
    targets: Dict[str, Any],
    safe_foods: List[Dict[str, Any]],
    conditions: List[str],
    language: str = "bn",
    pairings: List[Dict[str, Any]] = None,
    slot_pools: Dict[str, set] = None,
) -> List[Dict[str, str]]:
    """Build the LLM prompt for meal plan generation."""

    applicable_rules = [r for r in NDG_DIETARY_RULES if r["condition"] in conditions]

    # Slot-separated food lists — each slot gets its own filtered pool
    import random

    def _foods_for_slot(slot: str) -> str:
        if slot_pools and slot in slot_pools and slot_pools[slot]:
            slot_codes = slot_pools[slot]
            supp_codes = slot_pools.get("supplementary", set())
            allowed = [f for f in safe_foods if f.get("code") in slot_codes or f.get("code") in supp_codes]
        else:
            allowed = safe_foods[:]
        
        # Categorize allowed foods
        staples = []
        proteins = []
        veggies = []
        others = []
        
        for f in allowed:
            g = f.get("food_group", "Other")
            if g in ["Cereals and Millets", "Cereals", "Cereals & Grains"]:
                staples.append(f)
            elif g in ["Poultry", "Animal Meat", "Marine Fish", "Fresh Water Fish and Shellfish", "Marine Shellfish", "Egg and Egg Products", "Eggs", "Grain Legumes", "Pulses & Legumes"]:
                proteins.append(f)
            elif g in ["Green Leafy Vegetables", "Other Vegetables", "Roots and Tubers", "Leafy Vegetables", "Vegetables", "Roots & Tubers"]:
                veggies.append(f)
            else:
                others.append(f)
                
        # Shuffle each category for maximum variety
        random.shuffle(staples)
        random.shuffle(proteins)
        random.shuffle(veggies)
        random.shuffle(others)
        
        # Build structured text block
        lines = []
        if staples:
            lines.append("  STAPLES (grains/roti/rice):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in staples[:6]])
        if proteins:
            lines.append("  PROTEINS (meat/poultry/fish/eggs/lentils):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in proteins[:12]])
        if veggies:
            lines.append("  VEGETABLES & GREENS:")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in veggies[:10]])
        if others and slot in ["breakfast", "snack"]:
            lines.append("  OTHER (supplementary/dairy/fruits):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in others[:6]])
            
        return "\n".join(lines)

    foods_text_breakfast = _foods_for_slot("breakfast")
    foods_text_lunch     = _foods_for_slot("lunch")
    foods_text_dinner    = _foods_for_slot("dinner")

    rules_text = "\n".join([
        f"- [{r['rule_type']}] {r['group_target']}: {r['reason_en']}"
        for r in applicable_rules[:20]
    ])

    lang_instruction = "বাংলায় উত্তর দিন।" if language == "bn" else "Reply in English."

    breakfast_cal = round(targets['target_calories'] * 0.30)
    lunch_cal     = round(targets['target_calories'] * 0.40)
    dinner_cal    = round(targets['target_calories'] * 0.30)

    # Enrich prompt with dietary context from GraphRAG
    dietary_context = ""
    for condition in conditions:
        rules_for_condition = [r for r in applicable_rules if r["condition"] == condition]
        if rules_for_condition:
            dietary_context += f"\n{condition} Rules:\n"
            for r in rules_for_condition[:5]:
                action = "AVOID" if r["rule_type"] == "AVOID" else "PREFER"
                dietary_context += f"  - {action} {r['group_target']}: {r['reason_en']}\n"

    pairings_section = ""
    if pairings:
        # Shuffle pairings to provide diverse inspiration
        display_pairings = pairings[:25]
        random.shuffle(display_pairings)
        pairings_lines = []
        for p in display_pairings:
            pairings_lines.append(f"- {p['f1_bn']} ({p['f1_en']}) pairs well with {p['f2_bn']} ({p['f2_en']}) [Popularity weight: {p['popularity']}, Type: {p['pairing_type']}, Slot: {p['meal_slot']}]")
        pairings_section = "\nPOPULAR FOOD COMBINATIONS & PAIRINGS (highly recommended to combine these foods together inside a meal slot):\n" + "\n".join(pairings_lines) + "\n"



    system_prompt = """You are Pusti AI, a Bangladeshi clinical nutrition assistant.
Your task is to format a personalized daily meal plan using ONLY the graph-validated foods provided below.

CRITICAL RULES:
1. Use ONLY foods from the GRAPH-RANKED FOODS list as main ingredients. Do NOT invent or add any food not on that list.
2. You may supplement with small amounts of pantry staples: salt, water, oil, turmeric, cumin, coriander, chili, garam masala, ginger, garlic.
3. Respect all dietary rules (AVOID, PREFER, LIMIT).
4. YOU MUST HIT THE CALORIE TARGET. Each slot has a per-slot target below. Use generous portions of calorie-dense foods (rice, fish, dal, meat) to reach those targets.
5. Calorie calculation: calories = round((kcal_per_100g × amount_g) / 100). Use large enough amounts.
6. DO NOT select only low-calorie vegetables. Include high-calorie staples (rice, roti, dal, fish, meat, eggs) to meet energy needs.
7. Use authentic Bangladeshi food names in Bengali first, then English in brackets.
8. Explain WHY each food helps the user's specific condition.
8b. For EVERY item, include an "emoji" field with a single appropriate food emoji (e.g. 🍚 rice, 🫓 roti, 🐟 fish, 🍗 chicken, 🥚 egg, 🥬 greens, 🍌 banana, 🥛 milk, 🍲 dal). Pick the most accurate single emoji for that food.
9. Return ONLY a valid JSON object — no markdown, no extra text outside JSON.
10. All numeric values must be integers.
11. Lunch and dinner MUST include a staple grain (Rice/ভাত or Roti/রুটি) from the food list.
12. Respect traditional Bangladeshi food pairings. For example, pair Rice (ভাত) with curry (Chicken/Beef/Fish) and Dal (মসুর ডাল), or Roti (রুটি) with Eggs/Dal. Refer to the POPULAR FOOD COMBINATIONS guide provided in the prompt. Do not pair unrelated or mismatching items in a single meal.
13. VARIETY: Ensure you select different curries, vegetables, and proteins than a typical default plan. Mix it up and provide creative, appetizing combinations!
14. MEAL SLOT RULES: Follow the food-to-slot compatibility data below. Do NOT serve breakfast-only foods (fruits, nuts, milk) as lunch/dinner main items. Lunch and dinner should contain heavy foods: rice/roti + protein curry + dal + vegetable. Breakfast should be lighter: roti/bread + egg/dal + optional fruit.
16. BREAKFAST VEGETABLE RULE (CRITICAL): Vegetables (শাক/সবজি) are ONLY acceptable at breakfast when the breakfast includes Ruti (রুটি) or Paratha (পরোটা) as the staple. If breakfast uses Semolina (সুজি), Semai (সেমাই), Rice (ভাত), or any non-roti grain, DO NOT include any vegetables in that breakfast slot. This is authentic Bangladeshi morning food culture.
15. COOKED BANGLADESHI FOOD NAMING REASONING (CRITICAL): Do NOT return raw ingredient names in the final plan. Perform culinary reasoning to convert the raw ingredients you choose from the list into realistic, cooked Bangladeshi dishes for the `name_bn` field. 
  - If you choose `সিদ্ধ চাল` (raw parboiled rice), list it as `সিদ্ধ চালের ভাত` (cooked rice).
  - If you choose `আটা` (wheat flour), list it as `আটা রুটি` (atta roti).
  - If you choose `কচু পাতা` (colocasia leaves), list it as `কচু পাতার ভর্তা` (colocasia leaf bhorta) or `কচু পাতার তরকারি`.
  - If you choose `পোলট্রি মুরগি` (chicken), list it as `মুরগির মাংসের তরকারি (কম তেল)` (chicken curry).
  - If you choose a leafy vegetable like `লাল শাক` or `পালং শাক`, list it as `লাল শাক ভাজি` or `পালং শাকের তরকারি`.
  - If you choose lentils like `মসুর ডাল`, list it as `মসুর ডাল (রান্না করা)`.
  This makes the meal plan highly practical and realistic for daily eating.
16. FOOD CODE REQUIREMENT: The `food_code` field for every item MUST be an exact code from the provided food lists (e.g. "A019", "B013", "M004"). Never invent codes. Every item must trace back to a real food in the dataset.
"""

    user_prompt = f"""{lang_instruction}

USER PROFILE:
- Age: {profile.age}, Gender: {profile.gender}
- Weight: {profile.weightKg}kg, Height: {profile.heightCm}cm
- Activity Level: {profile.activityLevel}, Goal: {profile.goal}
- Medical Conditions: {', '.join(conditions) if conditions else 'None'}

DAILY NUTRITION TARGETS (NDG 2025):
- Total Target Calories: {targets['target_calories']} kcal (YOU MUST REACH THIS)
- Protein: {targets['protein_g']}g | Carbs: {targets['carbs_g']}g | Fat: {targets['fat_g']}g

MEAL CALORIE DISTRIBUTION (MUST HIT EACH TARGET):
- Breakfast (সকালের নাস্তা): {breakfast_cal} kcal  ← use rice/roti + protein + veg
- Lunch (দুপুরের খাবার):    {lunch_cal} kcal  ← use rice 250g≈{round(356*2.5)} kcal + dal 150g≈{round(357*1.5)} kcal + fish + veg
- Dinner (রাতের খাবার):    {dinner_cal} kcal  ← use rice/roti + protein + veg

PORTION GUIDANCE (to help you hit targets):
- Rice (ভাত) 200g ≈ {round(356*2)} kcal  |  Rice 300g ≈ {round(356*3)} kcal
- Roti (রুটি) 80g ≈ {round(300*0.8)} kcal  |  Dal 150g ≈ {round(357*1.5)} kcal
- Fish (মাছ) 150g ≈ 150–250 kcal  |  Eggs (ডিম) 2 pcs (100g) ≈ 150 kcal

DIETARY RULES:
{rules_text}

{dietary_context}

{pairings_section}


FOODS FOR BREAKFAST (সকালের নাস্তা) — choose ONLY from this list for breakfast:
{foods_text_breakfast}

FOODS FOR LUNCH (দুপুরের খাবার) — choose ONLY from this list for lunch:
{foods_text_lunch}

FOODS FOR DINNER (রাতের খাবার) — choose ONLY from this list for dinner:
{foods_text_dinner}

TASK: Generate a complete daily meal plan. Make sure the sum of all item calories ≈ {targets['target_calories']} kcal.

RESPONSE FORMAT (strict JSON, no text outside JSON):
{{
  "target_calories": {targets['target_calories']},
  "macros": {{"protein_g": {targets['protein_g']}, "carbs_g": {targets['carbs_g']}, "fat_g": {targets['fat_g']}, "fiber_g": {targets.get('fiber_g', 25)}}},
  "explanation_bn": "বাংলায় ব্যাখ্যা...",
  "explanation_en": "English explanation...",
  "meals": [
    {{
      "slot": "breakfast",
      "slot_bn": "সকালের নাস্তা",
      "target_calories": {breakfast_cal},
      "items": [
        {{
          "food_code": "code_from_list",
          "name_bn": "বাংলা নাম",
          "name_en": "English Name",
          "amount_g": 200,
          "calories": {round(356*2)},
          "emoji": "🍚",
          "why_bn": "কেন এই খাবার..."
        }}
      ]
    }},
    {{
      "slot": "lunch",
      "slot_bn": "দুপুরের খাবার",
      "target_calories": {lunch_cal},
      "items": []
    }},
    {{
      "slot": "dinner",
      "slot_bn": "রাতের খাবার",
      "target_calories": {dinner_cal},
      "items": []
    }}
  ],
  "condition_rules_applied": {json.dumps(conditions)}
}}
"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]



def _build_weekly_meal_plan_prompt(
    profile: Any,
    targets: Dict[str, Any],
    safe_foods: List[Dict[str, Any]],
    conditions: List[str],
    language: str = "bn",
    pairings: List[Dict[str, Any]] = None,
    slot_pools: Dict[str, set] = None,
) -> List[Dict[str, str]]:
    """Build the LLM prompt for 7-day meal plan generation."""

    applicable_rules = [r for r in NDG_DIETARY_RULES if r["condition"] in conditions]

    # Slot-separated food lists
    import random

    def _foods_for_slot(slot: str) -> str:
        if slot_pools and slot in slot_pools and slot_pools[slot]:
            slot_codes = slot_pools[slot]
            supp_codes = slot_pools.get("supplementary", set())
            allowed = [f for f in safe_foods if f.get("code") in slot_codes or f.get("code") in supp_codes]
        else:
            allowed = safe_foods[:]
        
        # Categorize allowed foods
        staples = []
        proteins = []
        veggies = []
        others = []
        
        for f in allowed:
            g = f.get("food_group", "Other")
            if g in ["Cereals and Millets", "Cereals", "Cereals & Grains"]:
                staples.append(f)
            elif g in ["Poultry", "Animal Meat", "Marine Fish", "Fresh Water Fish and Shellfish", "Marine Shellfish", "Egg and Egg Products", "Eggs", "Grain Legumes", "Pulses & Legumes"]:
                proteins.append(f)
            elif g in ["Green Leafy Vegetables", "Other Vegetables", "Roots and Tubers", "Leafy Vegetables", "Vegetables", "Roots & Tubers"]:
                veggies.append(f)
            else:
                others.append(f)
                
        # Shuffle each category for maximum variety
        random.shuffle(staples)
        random.shuffle(proteins)
        random.shuffle(veggies)
        random.shuffle(others)
        
        # Build structured text block
        lines = []
        if staples:
            lines.append("  STAPLES (grains/roti/rice):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in staples[:6]])
        if proteins:
            lines.append("  PROTEINS (meat/poultry/fish/eggs/lentils):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in proteins[:12]])
        if veggies:
            lines.append("  VEGETABLES & GREENS:")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in veggies[:10]])
        if others and slot in ["breakfast", "snack"]:
            lines.append("  OTHER (supplementary/dairy/fruits):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in others[:6]])
            
        return "\n".join(lines)

    foods_text_breakfast = _foods_for_slot("breakfast")
    foods_text_lunch     = _foods_for_slot("lunch")
    foods_text_dinner    = _foods_for_slot("dinner")

    rules_text = "\n".join([
        f"- [{r['rule_type']}] {r['group_target']}: {r['reason_en']}"
        for r in applicable_rules[:20]
    ])

    lang_instruction = "বাংলায় উত্তর দিন।" if language == "bn" else "Reply in English."

    pairings_section = ""
    if pairings:
        display_pairings = pairings[:30]
        random.shuffle(display_pairings)
        pairings_lines = []
        for p in display_pairings:
            pairings_lines.append(f"- {p['f1_bn']} ({p['f1_en']}) pairs well with {p['f2_bn']} ({p['f2_en']}) [Popularity weight: {p['popularity']}, Type: {p['pairing_type']}, Slot: {p['meal_slot']}]")
        pairings_section = "\nPOPULAR FOOD COMBINATIONS & PAIRINGS (highly recommended to combine these foods together inside a meal slot):\n" + "\n".join(pairings_lines) + "\n"

    system_prompt = """You are Pusti AI, a Bangladeshi clinical nutrition assistant.
Your task is to format a personalized 7-DAY weekly meal plan using ONLY the graph-validated foods provided below.

CRITICAL RULES:
1. Provide a plan for exactly 7 days.
2. For each day, include exactly 3 meals: breakfast (সকালের নাস্তা), lunch (দুপুরের খাবার), and dinner (রাতের খাবার). No snacks.
3. Use ONLY foods from the GRAPH-RANKED FOODS list as main ingredients. Do NOT invent or add any food not on that list.
4. You may supplement with pantry staples: salt, water, oil, turmeric, cumin, coriander, chili, garam masala, ginger, garlic.
5. Respect all dietary rules (AVOID, PREFER, LIMIT).
6. Match the daily calorie target for EACH day. Calculate: round((kcal_per_100g × amount_g) / 100).
7. Provide variety across the 7 days — do not repeat the exact same meals every day.
8. Use authentic Bangladeshi food names in Bengali first, then English in brackets.
8b. For EVERY item, include an "emoji" field with a single appropriate food emoji (e.g. 🍚 rice, 🫓 roti, 🐟 fish, 🍗 chicken, 🥚 egg, 🥬 greens, 🍌 banana, 🥛 milk, 🍲 dal).
9. Return ONLY a valid JSON object — no markdown, no extra text outside JSON.
10. All numeric values must be integers.
11. Authentic Bengali lunch and dinner MUST include a staple grain: Rice (ভাত), Roti/Chapati (রুটি), or similar.
12. Respect traditional Bangladeshi food pairings. For example, pair Rice (ভাত) with curry (Chicken/Beef/Fish) and Dal (মসুর ডাল), or Roti (রুটি) with Eggs/Dal. Refer to the POPULAR FOOD COMBINATIONS guide provided in the prompt. Do not pair unrelated or mismatching items in a single meal.
13. VARIETY: Ensure you select different curries, vegetables, and proteins than a typical default plan. Mix it up and provide creative, appetizing combinations across the 7 days!
15. BREAKFAST VEGETABLE RULE (CRITICAL): Vegetables (শাক/সবজি) are ONLY acceptable at breakfast when the breakfast includes Ruti (রুটি) or Paratha (পরোটা) as the staple. If breakfast uses Semolina (সুজি), Semai (সেমাই), Rice (ভাত), or any non-roti grain, DO NOT include any vegetables in that breakfast slot. This applies for every single day in the 7-day plan. This is authentic Bangladeshi morning food culture.
14. COOKED BANGLADESHI FOOD NAMING REASONING (CRITICAL): Do NOT return raw ingredient names in the final plan. Perform culinary reasoning to convert the raw ingredients you choose from the list into realistic, cooked Bangladeshi dishes for the `name_bn` field. 
  - If you choose `সিদ্ধ চাল` (raw parboiled rice), list it as `সিদ্ধ চালের ভাত` (cooked rice).
  - If you choose `আটা` (wheat flour), list it as `আটা রুটি` (atta roti).
  - If you choose `কচু পাতা` (colocasia leaves), list it as `কচু পাতার ভর্তা` (colocasia leaf bhorta) or `কচু পাতার তরকারি`.
  - If you choose `পোলট্রি মুরগি` (chicken), list it as `মুরগির মাংসের তরকারি (কম তেল)` (chicken curry).
  - If you choose a leafy vegetable like `লাল শাক` or `পালং শাক`, list it as `লাল শাক ভাজি` or `পালং শাকের তরকারি`.
  - If you choose lentils like `মসুর ডাল`, list it as `মসুর ডাল (রান্না করা)`.
  This makes the meal plan highly practical and realistic for daily eating.
15. FOOD CODE REQUIREMENT: The `food_code` field for every item MUST be an exact code from the provided food lists (e.g. "A019", "B013", "M004"). Never invent codes. Every item must trace back to a real food in the dataset.
"""

    dietary_context = ""
    for condition in conditions:
        rules_for_condition = [r for r in applicable_rules if r["condition"] == condition]
        if rules_for_condition:
            dietary_context += f"\n{condition} Rules:\n"
            for r in rules_for_condition[:5]:
                action = "AVOID" if r["rule_type"] == "AVOID" else "PREFER"
                dietary_context += f"  - {action} {r['group_target']}: {r['reason_en']}\n"

    user_prompt = f"""{lang_instruction}

USER PROFILE:
- Age: {profile.age}, Gender: {profile.gender}
- Weight: {profile.weightKg}kg, Height: {profile.heightCm}cm
- Goal: {profile.goal}
- Medical Conditions: {', '.join(conditions) if conditions else 'None'}
- Preferred Foods: {', '.join(safe_list(profile.preferredFoods)) if profile.preferredFoods else 'Any'}

DAILY TARGETS (per day):
- Target Calories: {targets['target_calories']} kcal
- Protein: {targets['protein_g']}g | Carbs: {targets['carbs_g']}g | Fat: {targets['fat_g']}g

DIETARY RULES:
{rules_text}
{dietary_context}

{pairings_section}

FOODS FOR BREAKFAST (সকালের নাস্তা) — choose ONLY from this list for breakfast:
{foods_text_breakfast}

FOODS FOR LUNCH (দুপুরের খাবার) — choose ONLY from this list for lunch:
{foods_text_lunch}

FOODS FOR DINNER (রাতের খাবার) — choose ONLY from this list for dinner:
{foods_text_dinner}

TASK: Generate a complete 7-day meal plan in JSON format. Do not include any text outside the JSON object.

RESPONSE FORMAT (strict JSON, follow exactly):
{{
  "weekly_plan": [
    {{
      "day": 1,
      "day_name_bn": "সোমবার",
      "day_name_en": "Monday",
      "target_calories": {targets['target_calories']},
      "macros": {{"protein_g": {targets['protein_g']}, "carbs_g": {targets['carbs_g']}, "fat_g": {targets['fat_g']}, "fiber_g": {targets.get('fiber_g', 25)}}},
      "explanation_bn": "...",
      "explanation_en": "...",
      "meals": [
        {{
          "slot": "breakfast",
          "slot_bn": "সকালের নাস্তা",
          "target_calories": number,
          "items": [
            {{
              "food_code": "code_or_name",
              "name_bn": "বাংলা নাম",
              "name_en": "English Name",
              "amount_g": 150,
              "calories": 195,
              "emoji": "🍚",
              "why_bn": "কেন এই খাবার..."
            }}
          ]
        }}
      ]
    }}
  ]
}}
"""
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _generate_fallback_meal_plan(
    profile: Any,
    targets: Dict[str, Any],
    safe_foods: List[Dict[str, Any]],
    conditions: List[str],
    language: str = "bn",
    used_codes_global: set = None,
) -> Dict[str, Any]:
    """Generate a template-based meal plan when LLM is unavailable."""

    if used_codes_global is None:
        used_codes_global = set()

    categories = {}
    for f in safe_foods:
        raw_cat = f.get("food_group", "Other")
        cat = "Other"
        if raw_cat in ["Cereals", "Cereals & Grains", "Cereals and Millets", "Cereals and Cereal Products"]:
            cat = "Cereals & Grains"
        elif raw_cat in ["Pulses & Legumes", "Grain Legumes", "Pulse and Pulse Products"]:
            cat = "Pulses & Legumes"
        elif raw_cat in ["Fish & Seafood", "Fresh Water Fish and Shellfish", "Marine Fish", "Marine Shellfish", "Marine Mollusks", "Fish and Fish Products"]:
            cat = "Fish & Seafood"
        elif raw_cat in ["Meat & Poultry", "Animal Meat", "Poultry"]:
            cat = "Meat & Poultry"
        elif raw_cat in ["Eggs", "Egg and Egg Products"]:
            cat = "Eggs"
        elif raw_cat in ["Leafy Vegetables", "Green Leafy Vegetables"]:
            cat = "Leafy Vegetables"
        elif raw_cat in ["Vegetables", "Other Vegetables", "Roots & Tubers", "Roots and Tubers"]:
            cat = "Vegetables"
        elif raw_cat in ["Fruits", "Fresh Fruits"]:
            cat = "Fruits"
        categories.setdefault(cat, []).append(f)

    def pick(cat, used):
        pool = [f for f in categories.get(cat, []) if f["code"] not in used and f["code"] not in used_codes_global]
        if pool:
            chosen = random.choice(pool)
            used.add(chosen["code"])
            used_codes_global.add(chosen["code"])
            return chosen
        
        # Fallback to any safe food in the category, ignoring used constraints
        pool_any = categories.get(cat, [])
        if pool_any:
            chosen = random.choice(pool_any)
            return chosen
            
        # Fallback to any safe food not used
        pool_all = [f for f in safe_foods if f["code"] not in used and f["code"] not in used_codes_global]
        if pool_all:
            chosen = random.choice(pool_all)
            used.add(chosen["code"])
            used_codes_global.add(chosen["code"])
            return chosen
            
        return random.choice(safe_foods) if safe_foods else None

    used_codes = set()

    # Breakfast-only cereals (Semolina/Suji, Vermicelli/Semai)
    BREAKFAST_ONLY_CEREALS = {"A016", "A022", "A023", "A024"}

    def pick_slot_specific(cat, slot, used):
        pool = categories.get(cat, [])
        
        # 1. Slot-based filtering
        if slot in ["lunch", "dinner"]:
            # Exclude sweet breakfast items
            pool = [f for f in pool if f["code"] not in BREAKFAST_ONLY_CEREALS]
        elif slot == "breakfast":
            # For breakfast cereals, prefer suji, semai, atta/roti, exclude raw rice
            preferred_bfast_codes = BREAKFAST_ONLY_CEREALS.union({"A019", "A018"})
            bfast_pool = [f for f in pool if f["code"] in preferred_bfast_codes]
            if bfast_pool:
                pool = bfast_pool

        # 2. Protein slot preference
        if cat in ["Fish & Seafood", "Meat & Poultry"] and slot == "breakfast":
            # Do not serve heavy fish/meat curry at breakfast
            return None

        # Filter used codes
        eligible = [f for f in pool if f["code"] not in used and f["code"] not in used_codes_global]
        if eligible:
            chosen = random.choice(eligible)
            used.add(chosen["code"])
            used_codes_global.add(chosen["code"])
            return chosen

        # Fallback to any in category matching slot constraints
        if pool:
            chosen = random.choice(pool)
            return chosen

        # absolute fallback
        return random.choice(safe_foods) if safe_foods else None

    def make_meal(slot, slot_bn, pct):
        target = int(targets["target_calories"] * pct)
        items = []

        # 1. Pick staple grain
        grain = pick_slot_specific("Cereals & Grains", slot, used_codes)

        # 2. Pick Protein (Lunch/Dinner shuffles categories to ensure meat/beef/chicken/fish/egg/lentil variety)
        protein = None
        if slot == "breakfast":
            protein = pick_slot_specific("Eggs", slot, used_codes)
            if not protein:
                protein = pick_slot_specific("Pulses & Legumes", slot, used_codes)
        else:
            # Lunch / Dinner: Shuffle order to give equal chance to Beef/Chicken/Fish/Lentils
            categories_to_try = ["Meat & Poultry", "Fish & Seafood", "Pulses & Legumes", "Eggs"]
            random.shuffle(categories_to_try)
            for cat_name in categories_to_try:
                protein = pick_slot_specific(cat_name, slot, used_codes)
                if protein:
                    break

        # 3. Pick Vegetable
        # RULE: At breakfast, vegetables are ONLY served when the staple is Ruti/Paratha.
        # Breakfast-only cereals (suji, semai) → no vegetable at breakfast.
        RUTI_PARATHA_CODES = {"A019", "A018", "A020"}  # atta roti, whole wheat roti, paratha
        veg = None
        if slot == "breakfast":
            grain_is_ruti = grain and grain.get("code") in RUTI_PARATHA_CODES
            if grain_is_ruti:
                # Only pick veg when breakfast has ruti/paratha
                veg = pick_slot_specific("Vegetables", slot, used_codes)
            # else: no vegetable for non-ruti breakfasts (suji, semai, etc.)
        else:
            # Lunch/Dinner: greens or other vegetables
            veg = pick_slot_specific("Leafy Vegetables", slot, used_codes)
            if not veg:
                veg = pick_slot_specific("Vegetables", slot, used_codes)

        # Base calorie values per 100g
        grain_cal_per_100 = grain.get("calories", 350) if grain else 350
        prot_cal_per_100 = protein.get("calories", 150) if protein else 150
        veg_cal_per_100 = veg.get("calories", 30) if veg else 30

        # Set fixed vegetable portion
        veg_amt = 80
        veg_cal = round(veg_cal_per_100 * veg_amt / 100)

        # Distribute remaining calorie budget between grain and protein (70% grain, 30% protein)
        remaining = max(50, target - veg_cal)
        grain_budget = remaining * 0.70
        prot_budget = remaining * 0.30

        grain_amt = max(30, min(300, round(grain_budget * 100 / grain_cal_per_100)))
        prot_amt = max(30, min(200, round(prot_budget * 100 / prot_cal_per_100)))


        if grain:
            g_bn, g_en = _get_cooked_name(grain["name_bn"], grain["name_en"], "Cereals & Grains")
            items.append({
                "food_code": grain["code"],
                "name_bn": g_bn,
                "name_en": g_en,
                "amount_g": grain_amt,
                "calories": round(grain_cal_per_100 * grain_amt / 100),
                "food_group": grain.get("food_group"),
                "why_bn": "শক্তির উৎস" if language == "bn" else "Energy source",
            })

        if protein:
            p_bn, p_en = _get_cooked_name(protein["name_bn"], protein["name_en"], protein.get("food_group", "Protein"))
            items.append({
                "food_code": protein["code"],
                "name_bn": p_bn,
                "name_en": p_en,
                "amount_g": prot_amt,
                "calories": round(prot_cal_per_100 * prot_amt / 100),
                "food_group": protein.get("food_group"),
                "why_bn": "প্রোটিনের উৎস" if language == "bn" else "Protein source",
            })

        if veg:
            v_bn, v_en = _get_cooked_name(veg["name_bn"], veg["name_en"], veg.get("food_group", "Vegetables"))
            items.append({
                "food_code": veg["code"],
                "name_bn": v_bn,
                "name_en": v_en,
                "amount_g": veg_amt,
                "calories": veg_cal,
                "food_group": veg.get("food_group"),
                "why_bn": "ভিটামিন ও আঁশ সমৃদ্ধ" if language == "bn" else "Rich in vitamins and fiber",
            })

        return {
            "slot": slot,
            "slot_bn": slot_bn,
            "target_calories": target,
            "items": items,
        }

    meals = [
        make_meal("breakfast", "সকালের নাস্তা", 0.30),
        make_meal("lunch", "দুপুরের খাবার", 0.40),
        make_meal("dinner", "রাতের খাবার", 0.30),
    ]

    total_cals = sum(sum(i["calories"] for i in m["items"]) for m in meals)

    explanation_bn = (
        f"এটি একটি টেমপ্লেট-ভিত্তিক খাবার পরিকল্পনা। "
        f"আপনার লক্ষ্য ক্যালরি {targets['target_calories']} এবং শর্ত {', '.join(conditions) if conditions else 'কোনো নেই'} অনুযায়ী তৈরি। "
        f"আরও ব্যক্তিগতকৃত পরিকল্পনার জন্য LLM সেবা চালু করুন।"
    )
    explanation_en = (
        f"This is a template-based meal plan. "
        f"Generated for your target of {targets['target_calories']} calories and conditions: {', '.join(conditions) if conditions else 'none'}. "
        f"Enable LLM service for more personalized plans."
    )

    fallback_plan = {
        "target_calories": targets["target_calories"],
        "macros": {
            "protein_g": targets["protein_g"],
            "carbs_g": targets["carbs_g"],
            "fat_g": targets["fat_g"],
            "fiber_g": targets.get("fiber_g", 25),
        },
        "explanation_bn": explanation_bn,
        "explanation_en": explanation_en,
        "meals": meals,
        "condition_rules_applied": conditions,
        "is_fallback": True,
        "actual_calories": total_cals,
    }
    # 🎨 Always enrich fallback items with emoji as well
    _ensure_item_emojis(fallback_plan)
    return fallback_plan


async def generate_daily_meal_plan(user_id: str, language: str = "bn") -> Dict[str, Any]:
    """Generate a daily meal plan for a user, using the most recent health log weight."""
    profile = await prisma.profile.find_unique(where={"userId": user_id})
    if not profile:
        raise ValueError("Profile not found")

    if not profile.weightKg or not profile.heightCm or not profile.gender or not profile.activityLevel:
        raise ValueError("Profile incomplete")

    # Use the most recent health-log weight if available (more accurate than profile's initial weight)
    current_weight = profile.weightKg
    latest_log = await prisma.healthlog.find_first(
        where={"userId": user_id},
        order={"logDate": "desc"},
    )
    if latest_log and latest_log.weightKg:
        current_weight = latest_log.weightKg

    targets = calculate_targets({
        "gender": profile.gender,
        "height_cm": profile.heightCm,
        "weight_kg": current_weight,
        "activity_level": profile.activityLevel,
        "age": profile.age,
        "goal": profile.goal,
    })

    conditions = safe_list(profile.medicalConditions)
    goal = profile.goal or "Maintain"

    rag = _get_rag()

    # ──────────────────────────────────────────────────────────────────────────
    # PRIMARY PATH: Paper's Algorithm 1 — cosine-similarity food ranking
    # Uses Disease → REQUIRES Nutrient → CONTAINS_NUTRIENT → Food graph traversal
    # ──────────────────────────────────────────────────────────────────────────
    safe_foods = []
    matched_disease = None
    disease_text = ", ".join(conditions) if conditions else goal

    rag_data = get_rag_recommended_foods(
        disease_text=disease_text,
        age=profile.age or 30,
        gender=profile.gender or "male",
        neo4j_driver=rag.get_neo4j_driver()
    )
    if rag_data and rag_data.get("recommended_foods"):
        safe_foods = rag_data["recommended_foods"]  # already full food dicts
        matched_disease = rag_data.get("matched_disease")
        print(f"🌟 RAG algorithm selected {len(safe_foods)} foods for: {matched_disease}")

    # FALLBACK: basic food filter when RAG returns nothing
    if not safe_foods:
        print("⚠️  RAG returned no foods — falling back to basic food filter")
        safe_foods = rag.get_safe_foods(conditions=conditions, goal=goal, limit=50)

    # ALWAYS supplement with staple foods to ensure caloric adequacy
    safe_foods = _ensure_balanced_food_list(rag, safe_foods)

    plan_data = None
    try:
        pairings = _get_popular_pairings(rag.get_neo4j_driver())
        safe_codes = {f.get("code") for f in safe_foods if f.get("code")}
        slot_pools = _get_slot_separated_foods(rag.get_neo4j_driver(), safe_codes)
        messages = _build_meal_plan_prompt(profile, targets, safe_foods, conditions, language, pairings, slot_pools)
        llm_response = await llm_client.chat_completion(
            messages=messages,
            temperature=0.85,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
        plan_data = json.loads(llm_response)
        plan_data = _validate_and_sanitize_meal_plan_foods(plan_data, safe_foods, rag.get_neo4j_driver(), slot_pools)
    except Exception as e:
        print(f"LLM daily meal plan error: {e}")
        plan_data = _generate_fallback_meal_plan(profile, targets, safe_foods, conditions, language)

    # Always use the server-calculated calorie target — never trust the LLM's value
    plan_data["target_calories"] = targets["target_calories"]
    plan_data.setdefault("macros", {
        "protein_g": targets["protein_g"],
        "carbs_g": targets["carbs_g"],
        "fat_g": targets["fat_g"],
        "fiber_g": targets.get("fiber_g", 25),
    })
    plan_data.setdefault("meals", [])
    plan_data.setdefault("condition_rules_applied", conditions)
    # Annotate which weight was used for transparency
    plan_data["_calculated_from_weight_kg"] = current_weight

    # ✅ Scale portions proportionally so total calories always hit the target
    plan_data = _scale_plan_to_target(plan_data, targets["target_calories"])

    # 🎨 Fill in emoji for every item (LLM may omit; helper provides fallback)
    plan_data = _ensure_item_emojis(plan_data)

    return plan_data


async def generate_weekly_meal_plan(user_id: str, language: str = "bn") -> List[Dict[str, Any]]:
    """Generate a 7-day meal plan efficiently."""
    profile = await prisma.profile.find_unique(where={"userId": user_id})
    if not profile:
        raise ValueError("Profile not found")

    if not profile.weightKg or not profile.heightCm or not profile.gender or not profile.activityLevel:
        raise ValueError("Profile incomplete")

    current_weight = profile.weightKg
    latest_log = await prisma.healthlog.find_first(
        where={"userId": user_id},
        order={"logDate": "desc"},
    )
    if latest_log and latest_log.weightKg:
        current_weight = latest_log.weightKg

    targets = calculate_targets({
        "gender": profile.gender,
        "height_cm": profile.heightCm,
        "weight_kg": current_weight,
        "activity_level": profile.activityLevel,
        "age": profile.age,
        "goal": profile.goal,
    })

    conditions = safe_list(profile.medicalConditions)
    goal = profile.goal or "Maintain"

    rag = _get_rag()

    # Use paper's algorithm for weekly plan too
    disease_text = ", ".join(conditions) if conditions else goal
    safe_foods = []
    rag_data = get_rag_recommended_foods(
        disease_text=disease_text,
        age=profile.age or 30,
        gender=profile.gender or "male",
        neo4j_driver=rag.get_neo4j_driver()
    )
    if rag_data and rag_data.get("recommended_foods"):
        safe_foods = rag_data["recommended_foods"]
        print(f"🌟 RAG weekly: {len(safe_foods)} foods for {rag_data.get('matched_disease')}")
    if not safe_foods:
        safe_foods = rag.get_safe_foods(conditions=conditions, goal=goal, limit=50)

    # ALWAYS supplement with staple foods for caloric adequacy
    safe_foods = _ensure_balanced_food_list(rag, safe_foods)

    try:
        pairings = _get_popular_pairings(rag.get_neo4j_driver())
        safe_codes = {f.get("code") for f in safe_foods if f.get("code")}
        slot_pools = _get_slot_separated_foods(rag.get_neo4j_driver(), safe_codes)
        messages = _build_weekly_meal_plan_prompt(profile, targets, safe_foods, conditions, language, pairings, slot_pools)
        llm_response = await llm_client.chat_completion(
            messages=messages,
            temperature=0.85,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
        data = json.loads(llm_response)
        weekly_plans = data.get("weekly_plan", [])
        
        # Ensure correct day numbering and add conditions
        for i, p in enumerate(weekly_plans):
            p["day"] = i + 1
            p["condition_rules_applied"] = conditions
            p.setdefault("target_calories", targets["target_calories"])
            # ✅ Validate and sanitize foods in weekly plan
            _validate_and_sanitize_meal_plan_foods(p, safe_foods, rag.get_neo4j_driver(), slot_pools)
            # ✅ Scale each day's portions so calories hit the target
            _scale_plan_to_target(p, targets["target_calories"])
            # 🎨 Fill in emoji on each item
            _ensure_item_emojis(p)
            
        if not weekly_plans:
            raise ValueError("LLM returned empty weekly plan")
    except Exception as e:
        print(f"LLM weekly meal plan error: {e}")
        # Generate 7 unique daily plans using fallback (fast, no LLM calls)
        used_codes_global = set()
        weekly_plans = []
        for day in range(7):
            plan = _generate_fallback_meal_plan(profile, targets, safe_foods, conditions, language, used_codes_global)
            plan["day"] = day + 1
            plan["day_name_bn"] = ["সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার", "রবিবার"][day]
            plan["day_name_en"] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day]
            weekly_plans.append(plan)

    return weekly_plans


async def save_meal_plan(user_id: str, plan_type: str, plan_data: Dict[str, Any], language: str, target_date: datetime = None) -> Any:
    """Save a generated meal plan to the database."""
    if target_date is None:
        target_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    ai_cal = sum(
        item.get("calories", 0)
        for m in plan_data.get("meals", [])
        for item in m.get("items", [])
    )

    plan = await prisma.mealplan.create(
        data={
            "userId": user_id,
            "planDate": target_date,
            "planType": plan_type,
            "planData": to_json_string(plan_data),
            "calorieTarget": plan_data.get("target_calories", 2000),
            "aiSuggestionCal": ai_cal,
            "language": language,
        }
    )
    return plan
