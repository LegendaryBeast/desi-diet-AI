"""Meal plan generation service — GraphRAG + Calorie Engine + Groq LLM (Llama 3.3)."""

import json
import random
import unicodedata
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import List, Dict, Any, Optional
from app.db import prisma
from app.core.llm_client import llm_client
from app.utils import safe_list, to_json_string
from rag_engine import calculate_targets, KhadokGraphRAG, NDG_DIETARY_RULES, get_rag_recommended_foods


# Singleton Neo4j connection
_rag_engine = None


def _is_plain_rice(food: Dict[str, Any]) -> bool:
    """
    Dynamically identifies plain/raw/cooked rice (ভাত / চাল) 
    while allowing processed breakfast rice products (like chira, muri, khoi).
    """
    if not food:
        return False
    food_group = food.get("food_group", "")
    if food_group not in ("Cereals and Millets", "Rice Staples"):
        return False
    
    # Read name keys
    name_en = (food.get("food_name_en") or food.get("name_en") or "").lower()
    name_bn = (food.get("food_name_bn") or food.get("name_bn") or "").lower()
    
    # Exclude processed/breakfast-friendly rice products
    processed_keywords = ["flaked", "flakes", "popped", "puffed", "flour", "vermicelli", "semolina", "semai", "suji", "muri", "chira", "khoi"]
    if any(k in name_en or k in name_bn for k in processed_keywords):
        return False
        
    # Check if it is a plain rice
    return "rice" in name_en or "ভাত" in name_bn or "চাল" in name_bn or "চাউল" in name_bn


def _is_core_staple(food: Dict[str, Any]) -> bool:
    """
    Dynamically identifies if a food is a core staple (rice, roti, whole wheat flour, etc.)
    that should bypass the variety avoidance filter.
    """
    if not food:
        return False
    food_group = food.get("food_group", "")
    if food_group not in ("Cereals and Millets", "Rice Staples"):
        return False
        
    name_en = (food.get("food_name_en") or food.get("name_en") or "").lower()
    name_bn = (food.get("food_name_bn") or food.get("name_bn") or "").lower()
    
    # Exclude sweet, processed, or snack grains
    snack_keywords = ["biscuit", "semai", "vermicelli", "popcorn", "muri", "khoi", "chira", "semolina", "suji", "halwa", "puffed", "popped", "flaked"]
    if any(k in name_en or k in name_bn for k in snack_keywords):
        return False
        
    # Match rice, wheat flour, roti, atta, mayda
    keywords = ["rice", "flour", "roti", "ruti", "atta", "mayda", "wheat", "bread", "bun", "roll", "ভাত", "চাল", "আটা", "ময়দা", "রুটি", "পাউরুটি"]
    return any(k in name_en or k in name_bn for k in keywords)


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

    # Dairy — keep as-is (milk, paneer, yogurt)
    if food_group_name in ("Milk and Milk Products", "Dairy & Milk"):
        return bn, en

    if "সিদ্ধ চাল" in raw_name_bn:
        bn = "সিদ্ধ চালের ভাত"
        en = "Cooked Parboiled Rice"
    elif "আতপ চাল" in raw_name_bn:
        bn = "আতপ চালের ভাত"
        en = "Cooked Atap Rice"
    elif "আটা" in raw_name_bn and food_group_name in ("Cereals and Millets", "Cereals", "Cereals & Grains"):
        bn = "আটা রুটি"
        en = "Atta Roti"
    elif "ময়দা" in raw_name_bn and food_group_name in ("Cereals and Millets", "Cereals", "Cereals & Grains"):
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
    elif "পোলট্রি মুরগি" in raw_name_bn or ("মুরগি" in raw_name_bn and food_group_name in ("Poultry", "Meat & Poultry")):
        bn = "মুরগির মাংসের তরকারি (কম তেল)"
        en = "Chicken Curry (Low Oil)"
    elif "গরুর মাংস" in raw_name_bn:
        bn = "গরুর মাংসের তরকারি (কম চর্বি)"
        en = "Beef Curry (Low Fat)"
    elif "পাঁঠার মাংস" in raw_name_bn or ("খাসি" in raw_name_bn and food_group_name in ("Animal Meat", "Meat & Poultry")):
        bn = "খাসির মাংসের তরকারি"
        en = "Mutton Curry"
    elif "ডাল" in raw_name_bn:
        if "(রান্না করা)" not in raw_name_bn and "Cooked" not in raw_name_en:
            bn = f"{raw_name_bn} (রান্না করা)"
            en = f"Cooked {raw_name_en}"
    elif "মটর" in raw_name_bn or "ছোলা" in raw_name_bn:
        if "র তরকারি" not in raw_name_bn and "Cooked" not in raw_name_en:
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
    # Always use our reliable name-based emoji lookup instead of trusting the LLM
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
        "breakfast": [
            {"food_code": "A019", "name_bn": "আটা রুটি", "name_en": "Atta Roti", "calories": 150.0, "protein": 5.0, "food_group": "Cereals & Grains"},
            {"food_code": "M004", "name_bn": "সিদ্ধ মুরগির ডিম", "name_en": "Boiled Egg", "calories": 155.0, "protein": 13.0, "food_group": "Eggs"},
            {"food_code": "B013", "name_bn": "মসুর ডাল (রান্না করা)", "name_en": "Cooked Masur Dal", "calories": 135.0, "protein": 24.0, "food_group": "Pulses & Legumes"},
            {"food_code": "L002", "name_bn": "গরুর দুধ", "name_en": "Cow Milk", "calories": 60.0, "protein": 3.3, "food_group": "Dairy & Milk"},
            {"food_code": "E009", "name_bn": "কলা", "name_en": "Banana", "calories": 90.0, "protein": 1.2, "food_group": "Fruits"},
            {"food_code": "A022", "name_bn": "সুজির হালুয়া", "name_en": "Semolina Halwa", "calories": 140.0, "protein": 11.0, "food_group": "Cereals & Grains"},
        ],
        "lunch": [
            {"food_code": "A015", "name_bn": "আতপ চালের ভাত", "name_en": "Cooked Atap Rice", "calories": 300.0, "protein": 8.0, "food_group": "Cereals & Grains"},
            {"food_code": "B013", "name_bn": "মসুর ডাল (রান্না করা)", "name_en": "Cooked Masur Dal", "calories": 135.0, "protein": 24.0, "food_group": "Pulses & Legumes"},
            {"food_code": "S006", "name_bn": "রুই মাছের হালকা ঝোল", "name_en": "Rohu Fish Curry", "calories": 130.0, "protein": 20.0, "food_group": "Fish & Seafood"},
            {"food_code": "N003", "name_bn": "মুরগির মাংসের তরকারি (কম তেল)", "name_en": "Chicken Curry", "calories": 140.0, "protein": 22.0, "food_group": "Meat & Poultry"},
            {"food_code": "C033", "name_bn": "পালং শাক ভাজি", "name_en": "Spinach Stir-fry", "calories": 25.0, "protein": 2.0, "food_group": "Leafy Vegetables"},
            {"food_code": "D031", "name_bn": "বেগুনের তরকারি", "name_en": "Brinjal Curry", "calories": 30.0, "protein": 1.5, "food_group": "Vegetables"},
        ],
        "dinner": [
            {"food_code": "A015", "name_bn": "আতপ চালের ভাত", "name_en": "Cooked Atap Rice", "calories": 250.0, "protein": 7.0, "food_group": "Cereals & Grains"},
            {"food_code": "B010", "name_bn": "সবুজ মুগ ডাল (রান্না করা)", "name_en": "Cooked Mung Dal", "calories": 136.0, "protein": 24.0, "food_group": "Pulses & Legumes"},
            {"food_code": "S002", "name_bn": "কাতল মাছের হালকা ঝোল", "name_en": "Catla Fish Curry", "calories": 120.0, "protein": 18.0, "food_group": "Fish & Seafood"},
            {"food_code": "O003", "name_bn": "খাসির মাংসের তরকারি", "name_en": "Mutton Curry", "calories": 130.0, "protein": 22.0, "food_group": "Meat & Poultry"},
            {"food_code": "D036", "name_bn": "ফুলকপির তরকারি", "name_en": "Cauliflower Curry", "calories": 25.0, "protein": 2.0, "food_group": "Vegetables"},
            {"food_code": "C003", "name_bn": "লাল শাক ভাজি", "name_en": "Red Amaranth Stir-fry", "calories": 20.0, "protein": 4.0, "food_group": "Leafy Vegetables"},
        ],
        "snack": [
            {"food_code": "E009", "name_bn": "কলা", "name_en": "Banana", "calories": 90.0, "protein": 1.2, "food_group": "Fruits"},
            {"food_code": "E028", "name_bn": "পেয়ারা", "name_en": "Guava", "calories": 50.0, "protein": 1.4, "food_group": "Fruits"},
            {"food_code": "H012", "name_bn": "চীনাবাদাম", "name_en": "Groundnut", "calories": 160.0, "protein": 24.0, "food_group": "Nuts & Seeds"},
            {"food_code": "L002", "name_bn": "গরুর দুধ", "name_en": "Cow Milk", "calories": 60.0, "protein": 3.3, "food_group": "Dairy & Milk"},
        ]
    }

    for meal in plan_data.get("meals", []) or []:
        slot_name = meal.get("slot", "").lower()
        items = meal.get("items", []) or []
        sanitized_items = []
        fallback_idx = 0  # Rotate through fallback list so duplicates don't all get the same food
        used_codes_in_meal = set()

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
            
            # 4. Fallback if still no match found — pick highest-similarity slot-appropriate food
            if not db_food:
                pool = slot_to_safe_foods.get(slot_name) or slot_to_safe_foods.get("breakfast") or []
                if pool:
                    # Pick the highest-similarity food from the pool instead of random
                    pool_sorted = sorted(pool, key=lambda f: f.get("similarity_score", 0), reverse=True)
                    db_food = pool_sorted[0]
                else:
                    fallbacks = standard_fallbacks.get(slot_name) or standard_fallbacks["breakfast"]
                    db_food = fallbacks[fallback_idx % len(fallbacks)]
                    fallback_idx += 1
                print(f"⚠️ Food '{name_en}' ({code}) not found. Falling back to '{db_food.get('name_en')}' ({db_food.get('code') or db_food.get('food_code')})")

            resolved_code = db_food.get("code") or db_food.get("food_code") or ""
            
            # If this code was already used in this meal, try to pick a different fallback
            if resolved_code in used_codes_in_meal:
                # Try to pick a different food of the same food group from safe_foods / slot pool first!
                pool = slot_to_safe_foods.get(slot_name) or []
                replaced = False
                if pool:
                    pool_sorted = sorted(pool, key=lambda f: f.get("similarity_score", 0), reverse=True)
                    for f in pool_sorted:
                        f_code = f.get("code") or f.get("food_code") or ""
                        if f_code and f_code not in used_codes_in_meal:
                            if f.get("food_group") == db_food.get("food_group"):
                                db_food = f
                                resolved_code = f_code
                                replaced = True
                                print(f"🔄 Duplicate avoidance (safe_foods same group): Replaced duplicate with '{resolved_code}' ({f.get('name_en')})")
                                break
                    if not replaced:
                        for f in pool_sorted:
                            f_code = f.get("code") or f.get("food_code") or ""
                            if f_code and f_code not in used_codes_in_meal:
                                db_food = f
                                resolved_code = f_code
                                replaced = True
                                print(f"🔄 Duplicate avoidance (safe_foods any group): Replaced duplicate with '{resolved_code}' ({f.get('name_en')})")
                                break
                
                # If still not replaced, fall back to standard_fallbacks
                if not replaced:
                    fallbacks = standard_fallbacks.get(slot_name) or standard_fallbacks["breakfast"]
                    for fb in fallbacks:
                        fb_code = fb.get("code") or fb.get("food_code") or ""
                        if fb_code and fb_code not in used_codes_in_meal:
                            db_food = fb
                            resolved_code = fb_code
                            print(f"🔄 Duplicate avoidance (hardcoded): Replaced duplicate with '{fb_code}' ({fb.get('name_en')})")
                            break
            
            used_codes_in_meal.add(resolved_code)
            
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


def _enforce_slot_appropriateness(plan_data: Dict[str, Any], slot_pools: Dict[str, set], safe_foods: List[Dict[str, Any]], avoid_codes: set = None) -> Dict[str, Any]:
    """
    Post-process the LLM-generated plan to ensure every food is slot-appropriate.
    If a food is not in the correct slot pool, replace it with the best slot-appropriate alternative.
    """
    if not slot_pools:
        return plan_data

    safe_by_code = {f["code"]: f for f in safe_foods if f.get("code")}

    for meal in plan_data.get("meals", []) or []:
        slot_name = meal.get("slot", "").lower()
        allowed_codes = slot_pools.get(slot_name, set()) | slot_pools.get("supplementary", set()) | slot_pools.get("all", set())
        # Ensure all Rice Staples in safe_foods are in allowed_codes for lunch and dinner
        if slot_name in ("lunch", "dinner"):
            for f in safe_foods:
                if f.get("food_group") == "Rice Staples" and f.get("code"):
                    allowed_codes.add(f["code"])

        if not allowed_codes:
            continue

        # 🍚 CULTURAL FIX: Dynamically filter allowed codes to exclude slot-inappropriate grains/staples
        filtered_allowed = set()
        for code in allowed_codes:
            if code == "code":
                continue
            food = safe_by_code.get(code)
            if not food:
                filtered_allowed.add(code)
                continue
            
            # Breakfast: exclude plain rice
            if slot_name == "breakfast" and (food.get("food_group") == "Rice Staples" or _is_plain_rice(food)):
                continue
                
            # Lunch/Dinner: exclude snack/breakfast-only grains
            if slot_name in ("lunch", "dinner") and food.get("food_group") == "Cereals and Millets":
                has_explicit_lunch_dinner = (
                    code in slot_pools.get("lunch", set()) or
                    code in slot_pools.get("dinner", set()) or
                    code in slot_pools.get("all", set())
                )
                if not has_explicit_lunch_dinner:
                    continue
            
            filtered_allowed.add(code)
        allowed_codes = filtered_allowed

        corrected_items = []
        for item in meal.get("items", []) or []:
            code = item.get("food_code") or item.get("code") or ""
            # Check if this food is allowed in this slot
            if code not in allowed_codes:
                # Find a replacement: highest-similarity food from the allowed pool
                candidates = [safe_by_code[c] for c in allowed_codes if c in safe_by_code]
                candidates.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
                
                # Apply variety cache / avoidance
                if avoid_codes:
                    filtered_candidates = [c for c in candidates if c["code"] not in avoid_codes or _is_core_staple(c)]
                    if filtered_candidates:
                        candidates = filtered_candidates

                # Try to match food group for sensible replacement
                original_group = item.get("food_group", "")
                same_group = [c for c in candidates if c.get("food_group") == original_group]
                replacement = same_group[0] if same_group else (candidates[0] if candidates else None)
                if replacement:
                    old_name = item.get("name_bn", "")
                    item["food_code"] = replacement["code"]
                    item["code"] = replacement["code"]
                    item["name_bn"] = replacement.get("name_bn", replacement.get("name_en", ""))
                    item["name_en"] = replacement.get("name_en", "")
                    item["food_group"] = replacement.get("food_group", "")
                    # Recalculate calories for the new food with same portion
                    amount_g = item.get("amount_g", 100)
                    kcal_per_100g = float(replacement.get("calories") or replacement.get("energy_kcal") or 0)
                    item["calories"] = round((kcal_per_100g * amount_g) / 100.0)
                    print(f"🔄 Slot enforcement: Replaced '{old_name}' ({code}) in {slot_name} with '{item['name_bn']}' ({replacement['code']})")
            corrected_items.append(item)
        meal["items"] = corrected_items

    return plan_data


def _deduplicate_meal_items(plan_data: Dict[str, Any], safe_foods: List[Dict[str, Any]], avoid_codes: set = None) -> Dict[str, Any]:
    """
    Post-process to ensure no duplicate food codes appear within the same meal slot.
    If duplicates are found, replace them with other foods from safe_foods of the same group.
    """
    safe_by_code = {f["code"]: f for f in safe_foods if f.get("code")}
    group_to_foods = {}
    for f in safe_foods:
        g = f.get("food_group", "Other")
        group_to_foods.setdefault(g, []).append(f)

    for meal in plan_data.get("meals", []) or []:
        slot_name = meal.get("slot", "").lower()
        items = meal.get("items", []) or []
        seen_codes = set()
        deduped = []

        for item in items:
            code = item.get("food_code") or item.get("code") or ""
            if code and code in seen_codes:
                # Find replacement of same food group
                original_group = item.get("food_group", "")
                candidates = group_to_foods.get(original_group, safe_foods)
                # Pick first candidate not already seen
                replacement = None
                for c in candidates:
                    c_code = c.get("code", "")
                    if c_code and c_code not in seen_codes:
                        if not avoid_codes or c_code not in avoid_codes or _is_core_staple(c):
                            replacement = c
                            break
                if not replacement and avoid_codes:
                    # Fallback to ignore variety cache if no options left
                    for c in candidates:
                        c_code = c.get("code", "")
                        if c_code and c_code not in seen_codes:
                            replacement = c
                            break

                if replacement:
                    old_name = item.get("name_bn", "")
                    amount_g = item.get("amount_g", 100)
                    kcal_per_100g = float(replacement.get("calories") or replacement.get("energy_kcal") or 0)
                    item["food_code"] = replacement["code"]
                    item["code"] = replacement["code"]
                    item["name_bn"] = replacement.get("name_bn", replacement.get("name_en", ""))
                    item["name_en"] = replacement.get("name_en", "")
                    item["food_group"] = replacement.get("food_group", "")
                    item["calories"] = round((kcal_per_100g * amount_g) / 100.0)
                    item["emoji"] = _validate_emoji(item)
                    code = replacement["code"]
                    print(f"🔄 Deduplication: Replaced duplicate '{old_name}' with '{item['name_bn']}' ({code}) in {slot_name}")
                else:
                    print(f"⚠️ Deduplication: Could not find replacement for duplicate {code} in {slot_name}")
            
            seen_codes.add(code)
            deduped.append(item)
        
        meal["items"] = deduped

    return plan_data


# Module-level fallback pools for minimum-item enforcement
_MINIMUM_FALLBACKS = {
    "breakfast": [
        # Staples (roti/paratha/suji/semai) — multiple options for daily rotation
        {"food_code": "A019", "name_bn": "আটা রুটি", "name_en": "Atta Roti", "calories": 150.0, "protein": 5.0, "food_group": "Cereals & Grains"},
        {"food_code": "A018", "name_bn": "গোটা গমের রুটি", "name_en": "Whole Wheat Roti", "calories": 160.0, "protein": 5.5, "food_group": "Cereals & Grains"},
        {"food_code": "A022", "name_bn": "সুজির হালুয়া", "name_en": "Semolina Halwa", "calories": 140.0, "protein": 11.0, "food_group": "Cereals & Grains"},
        {"food_code": "A016", "name_bn": "রান্না করা মিষ্টি সেমাই", "name_en": "Cooked Vermicelli", "calories": 130.0, "protein": 4.0, "food_group": "Cereals & Grains"},
        # Proteins
        {"food_code": "M004", "name_bn": "সিদ্ধ মুরগির ডিম", "name_en": "Boiled Egg", "calories": 155.0, "protein": 13.0, "food_group": "Eggs"},
        {"food_code": "B013", "name_bn": "মসুর ডাল (রান্না করা)", "name_en": "Cooked Masur Dal", "calories": 135.0, "protein": 24.0, "food_group": "Pulses & Legumes"},
        # Supplementary
        {"food_code": "L002", "name_bn": "গরুর দুধ", "name_en": "Cow Milk", "calories": 60.0, "protein": 3.3, "food_group": "Dairy & Milk"},
        {"food_code": "E009", "name_bn": "কলা", "name_en": "Banana", "calories": 90.0, "protein": 1.2, "food_group": "Fruits"},
        {"food_code": "E028", "name_bn": "পেয়ারা", "name_en": "Guava", "calories": 50.0, "protein": 1.4, "food_group": "Fruits"},
        {"food_code": "H005", "name_bn": "কাজু বাদাম", "name_en": "Cashew nut", "calories": 150.0, "protein": 5.0, "food_group": "Nuts & Seeds"},
        {"food_code": "H012", "name_bn": "চীনাবাদাম", "name_en": "Groundnut", "calories": 160.0, "protein": 24.0, "food_group": "Nuts & Seeds"},
    ],
    "lunch": [
        {"food_code": "A015", "name_bn": "আতপ চালের ভাত", "name_en": "Cooked Atap Rice", "calories": 300.0, "protein": 8.0, "food_group": "Cereals & Grains"},
        {"food_code": "B013", "name_bn": "মসুর ডাল (রান্না করা)", "name_en": "Cooked Masur Dal", "calories": 135.0, "protein": 24.0, "food_group": "Pulses & Legumes"},
        {"food_code": "S006", "name_bn": "রুই মাছের হালকা ঝোল", "name_en": "Rohu Fish Curry", "calories": 130.0, "protein": 20.0, "food_group": "Fish & Seafood"},
        {"food_code": "N003", "name_bn": "মুরগির মাংসের তরকারি (কম তেল)", "name_en": "Chicken Curry", "calories": 140.0, "protein": 22.0, "food_group": "Meat & Poultry"},
        {"food_code": "C033", "name_bn": "পালং শাক ভাজি", "name_en": "Spinach Stir-fry", "calories": 25.0, "protein": 2.0, "food_group": "Leafy Vegetables"},
        {"food_code": "D031", "name_bn": "বেগুনের তরকারি", "name_en": "Brinjal Curry", "calories": 30.0, "protein": 1.5, "food_group": "Vegetables"},
    ],
    "dinner": [
        {"food_code": "A015", "name_bn": "আতপ চালের ভাত", "name_en": "Cooked Atap Rice", "calories": 250.0, "protein": 7.0, "food_group": "Cereals & Grains"},
        {"food_code": "B010", "name_bn": "সবুজ মুগ ডাল (রান্না করা)", "name_en": "Cooked Mung Dal", "calories": 136.0, "protein": 24.0, "food_group": "Pulses & Legumes"},
        {"food_code": "S002", "name_bn": "কাতল মাছের হালকা ঝোল", "name_en": "Catla Fish Curry", "calories": 120.0, "protein": 18.0, "food_group": "Fish & Seafood"},
        {"food_code": "O003", "name_bn": "খাসির মাংসের তরকারি", "name_en": "Mutton Curry", "calories": 130.0, "protein": 22.0, "food_group": "Meat & Poultry"},
        {"food_code": "D036", "name_bn": "ফুলকপির তরকারি", "name_en": "Cauliflower Curry", "calories": 25.0, "protein": 2.0, "food_group": "Vegetables"},
        {"food_code": "C003", "name_bn": "লাল শাক ভাজি", "name_en": "Red Amaranth Stir-fry", "calories": 20.0, "protein": 4.0, "food_group": "Leafy Vegetables"},
    ],
    "snack": [
        {"food_code": "E009", "name_bn": "কলা", "name_en": "Banana", "calories": 90.0, "protein": 1.2, "food_group": "Fruits"},
        {"food_code": "E028", "name_bn": "পেয়ারা", "name_en": "Guava", "calories": 50.0, "protein": 1.4, "food_group": "Fruits"},
        {"food_code": "H012", "name_bn": "চীনাবাদাম", "name_en": "Groundnut", "calories": 160.0, "protein": 24.0, "food_group": "Nuts & Seeds"},
        {"food_code": "L002", "name_bn": "গরুর দুধ", "name_en": "Cow Milk", "calories": 60.0, "protein": 3.3, "food_group": "Dairy & Milk"},
    ],
}


def _ensure_meal_minimum_items(
    plan_data: Dict[str, Any], 
    safe_foods: List[Dict[str, Any]], 
    slot_pools: Dict[str, set] = None, 
    avoid_codes: set = None
) -> Dict[str, Any]:
    """
    Ensures every meal slot meets its minimum item requirement with smart dynamic fallback selection.
    - Breakfast: min 3 items (staple + protein + supplementary)
    - Lunch: min 4 items (grain + pulse + protein + vegetable)
    - Dinner: min 4 items (grain + pulse + protein + vegetable)
    """
    SLOT_MINIMUMS = {"breakfast": 3, "lunch": 4, "dinner": 4, "snack": 2}
    SUPP_GROUPS = {"Fruits", "Dairy & Milk", "Nuts & Seeds"}
    STAPLE_GROUPS = {"Cereals & Grains", "Cereals", "Cereals and Millets", "Cereals and Cereal Products", "Rice Staples"}
    PULSE_GROUPS = {"Pulses & Legumes", "Grain Legumes", "Pulse and Pulse Products"}
    PROTEIN_GROUPS = {"Fish & Seafood", "Meat & Poultry", "Eggs", "Egg and Egg Products",
                      "Animal Meat", "Poultry", "Fresh Water Fish and Shellfish", "Marine Fish",
                      "Marine Shellfish", "Marine Mollusks", "Fish and Fish Products"}
    VEG_GROUPS = {"Vegetables", "Leafy Vegetables", "Other Vegetables", "Roots & Tubers",
                  "Green Leafy Vegetables", "Roots and Tubers"}

    def _group_of(item):
        return item.get("food_group", "")

    def _has_group(items, groups):
        return any(_group_of(i) in groups for i in items)

    def _make_item(fb, amount_g=100):
        kcal_per_100g = float(fb.get("calories") or fb.get("energy_kcal") or 0)
        fb_code = fb.get("food_code") or fb.get("code") or ""
        raw_bn = fb.get("name_bn") or fb.get("name_en") or ""
        raw_en = fb.get("name_en") or ""
        raw_group = fb.get("food_group") or ""
        cooked_bn, cooked_en = _get_cooked_name(raw_bn, raw_en, raw_group)
        return {
            "food_code": fb_code,
            "code": fb_code,
            "name_bn": cooked_bn,
            "name_en": cooked_en,
            "food_group": raw_group,
            "calories": round((kcal_per_100g * amount_g) / 100.0),
            "amount_g": amount_g,
            "amount": f"{int(amount_g)}g",
            "emoji": _validate_emoji({"name_en": cooked_en, "food_group": raw_group}),
        }

    for meal in plan_data.get("meals", []) or []:
        slot_name = meal.get("slot", "").lower()
        items = meal.get("items", []) or []
        existing_codes = {item.get("food_code") or item.get("code") or "" for item in items}
        existing_codes.discard("")
        min_items = SLOT_MINIMUMS.get(slot_name, 3)

        # Build dynamic fallbacks from safe_foods for this slot
        allowed_codes = set()
        if slot_pools:
            allowed_codes = slot_pools.get(slot_name, set()) | slot_pools.get("supplementary", set()) | slot_pools.get("all", set())
        
        slot_candidates = [f for f in safe_foods if f.get("code") in allowed_codes] if allowed_codes else safe_foods[:]
        slot_candidates.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)

        def pick_dynamic_candidate(groups, excluded):
            # 1. Try safe_foods in slot_candidates
            for f in slot_candidates:
                f_code = f.get("code") or f.get("food_code") or ""
                if not f_code or f_code in excluded:
                    continue
                if f.get("food_group") in groups:
                    if not avoid_codes or f_code not in avoid_codes or _is_core_staple(f):
                        return f
            
            # 2. Try standard fallback list as backup
            fallbacks = _MINIMUM_FALLBACKS.get(slot_name) or _MINIMUM_FALLBACKS.get("breakfast", [])
            for fb in fallbacks:
                fb_code = fb.get("food_code") or fb.get("code") or ""
                if not fb_code or fb_code in excluded:
                    continue
                if fb.get("food_group") in groups:
                    if not avoid_codes or fb_code not in avoid_codes or _is_core_staple(fb):
                        return fb
            
            # 3. Last resort fallback (ignore variety constraints)
            for fb in fallbacks:
                fb_code = fb.get("food_code") or fb.get("code") or ""
                if fb_code and fb_code not in excluded:
                    if fb.get("food_group") in groups:
                        return fb
            return None

        # ── Phase 1: Enforce REQUIRED categories even if count is already met ──
        # BREAKFAST: MUST have a staple grain (roti/paratha/suji/semai)
        if slot_name == "breakfast":
            has_staple = _has_group(items, STAPLE_GROUPS)
            if not has_staple:
                chosen_staple = pick_dynamic_candidate(STAPLE_GROUPS, existing_codes)
                if chosen_staple:
                    items.append(_make_item(chosen_staple))
                    existing_codes.add(chosen_staple.get("code") or chosen_staple.get("food_code"))
                    print(f"📦 Staple fix: Added '{chosen_staple.get('name_bn')}' to breakfast (no staple found)")

        # LUNCH/DINNER: MUST have staple + pulse + protein + vegetable
        if slot_name in ("lunch", "dinner"):
            has_staple = _has_group(items, STAPLE_GROUPS)
            has_pulse = _has_group(items, PULSE_GROUPS)
            has_protein = _has_group(items, PROTEIN_GROUPS)
            has_veg = _has_group(items, VEG_GROUPS)

            if not has_staple:
                fb = pick_dynamic_candidate(STAPLE_GROUPS, existing_codes)
                if fb:
                    items.append(_make_item(fb)); existing_codes.add(fb.get("code") or fb.get("food_code"))
                    print(f"📦 Staple fix: Added '{fb.get('name_bn')}' to {slot_name}")
            if not has_pulse:
                fb = pick_dynamic_candidate(PULSE_GROUPS, existing_codes)
                if fb:
                    items.append(_make_item(fb)); existing_codes.add(fb.get("code") or fb.get("food_code"))
                    print(f"📦 Pulse fix: Added '{fb.get('name_bn')}' to {slot_name}")
            if not has_protein:
                fb = pick_dynamic_candidate(PROTEIN_GROUPS, existing_codes)
                if fb:
                    items.append(_make_item(fb)); existing_codes.add(fb.get("code") or fb.get("food_code"))
                    print(f"📦 Protein fix: Added '{fb.get('name_bn')}' to {slot_name}")
            if not has_veg:
                fb = pick_dynamic_candidate(VEG_GROUPS, existing_codes)
                if fb:
                    items.append(_make_item(fb)); existing_codes.add(fb.get("code") or fb.get("food_code"))
                    print(f"📦 Veg fix: Added '{fb.get('name_bn')}' to {slot_name}")

        # ── Phase 2: Reach minimum item count ──
        for f in slot_candidates:
            if len(items) >= min_items:
                break
            f_code = f.get("code") or f.get("food_code") or ""
            if not f_code or f_code in existing_codes:
                continue
            if avoid_codes and f_code in avoid_codes and not _is_core_staple(f):
                continue
            
            f_group = f.get("food_group", "")
            if slot_name == "breakfast":
                has_staple = _has_group(items, STAPLE_GROUPS)
                if has_staple and f_group not in SUPP_GROUPS and len(items) >= 2:
                    continue

            if slot_name in ("lunch", "dinner"):
                has_staple = _has_group(items, STAPLE_GROUPS)
                has_pulse = _has_group(items, PULSE_GROUPS)
                has_protein = _has_group(items, PROTEIN_GROUPS)
                has_veg = _has_group(items, VEG_GROUPS)
                if not has_pulse and f_group not in PULSE_GROUPS:
                    continue
                if not has_protein and f_group not in PROTEIN_GROUPS:
                    continue
                if not has_veg and f_group not in VEG_GROUPS:
                    continue
                if not has_staple and f_group not in STAPLE_GROUPS:
                    continue

            items.append(_make_item(f))
            existing_codes.add(f_code)
            print(f"📦 Minimum items: Added '{f.get('name_bn')}' ({f_code}) to {slot_name} (now {len(items)} items)")

        # Third pass: if still below minimum, add any non-duplicate fallback from standard fallback pool
        fallbacks = _MINIMUM_FALLBACKS.get(slot_name) or _MINIMUM_FALLBACKS.get("breakfast", [])
        for fb in fallbacks:
            if len(items) >= min_items:
                break
            fb_code = fb.get("food_code") or fb.get("code") or ""
            if fb_code and fb_code not in existing_codes:
                if not avoid_codes or fb_code not in avoid_codes or _is_core_staple(fb):
                    items.append(_make_item(fb))
                    existing_codes.add(fb_code)
                    print(f"📦 Minimum items (3rd pass): Added '{fb.get('name_bn')}' ({fb_code}) to {slot_name} (now {len(items)} items)")

        # Fourth pass: ignore variety constraints for static fallbacks if we still can't satisfy the minimum
        for fb in fallbacks:
            if len(items) >= min_items:
                break
            fb_code = fb.get("food_code") or fb.get("code") or ""
            if fb_code and fb_code not in existing_codes:
                items.append(_make_item(fb))
                existing_codes.add(fb_code)
                print(f"📦 Minimum items (4th pass): Added '{fb.get('name_bn')}' ({fb_code}) to {slot_name} (now {len(items)} items)")

        if len(items) < min_items:
            print(f"⚠️ Could not reach {min_items} items for {slot_name} (has {len(items)}). All fallbacks exhausted.")

        meal["items"] = items

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
                OPTIONAL MATCH (f)-[:BELONGS_TO]->(fg:FoodGroup)
                RETURN f.code AS code, 
                       f.name_en AS name_en, 
                       f.name_bn AS name_bn, 
                       fg.name_en AS food_group,
                       ms.name AS slot, 
                       r.role AS role
            """, codes=list(safe_food_codes)).data()

            food_by_code = {}
            for row in rows:
                code = row["code"]
                if code and code not in food_by_code:
                    food_by_code[code] = {
                        "code": code,
                        "name_en": row.get("name_en") or "",
                        "name_bn": row.get("name_bn") or "",
                        "food_group": row.get("food_group") or ""
                    }

            for row in rows:
                slot = row["slot"]
                code = row["code"]
                if slot in result:
                    result[slot].add(code)
                if slot == "all":
                    result["breakfast"].add(code)
                    result["lunch"].add(code)
                    result["dinner"].add(code)
            
            # 🍚 CULTURAL FIX: Remove rice from breakfast pool
            for code in list(result["breakfast"]):
                food = food_by_code.get(code)
                if food and _is_plain_rice(food):
                    result["breakfast"].discard(code)
                    print(f"🍚 Cultural fix: Removed {food['name_bn']} ({code}) from breakfast slot pool (rice is not a breakfast food)")

            # Remove breakfast/snack-only grains from lunch and dinner
            for slot_name in ("lunch", "dinner"):
                for code in list(result[slot_name]):
                    food = food_by_code.get(code)
                    if food and food.get("food_group") == "Cereals and Millets":
                        # If a cereal/grain is in lunch/dinner pool, check if it had a direct HAS_MEAL_SLOT relation to lunch/dinner/all in Neo4j.
                        slots_for_food = {r["slot"] for r in rows if r["code"] == code}
                        has_explicit_lunch_dinner = "lunch" in slots_for_food or "dinner" in slots_for_food or "all" in slots_for_food
                        if not has_explicit_lunch_dinner:
                            result[slot_name].discard(code)
                            print(f"🍚 Cultural fix: Removed {food['name_bn']} ({code}) from {slot_name} slot pool (snack/sweet grain)")

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
    # 0. Always ensure plain rice (Rice Staples) is present in safe_foods
    # This is critical so the LLM always has authentic rice options for lunch/dinner.
    # We also update any existing plain rice foods to have food_group = "Rice Staples".
    for f in rag_foods:
        if _is_plain_rice(f):
            f["food_group"] = "Rice Staples"

    driver = rag.get_neo4j_driver()
    supplemental = []

    try:
        with driver.session() as session:
            rice_result = session.run("""
                MATCH (f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
                WHERE fg.name_en IN ["Cereals and Millets", "Cereals", "Cereals & Grains"]
                  AND (toLower(f.name_en) CONTAINS "rice" OR f.name_bn CONTAINS "ভাত" OR f.name_bn CONTAINS "চাল" OR f.name_bn CONTAINS "চাউল")
                  AND NOT toLower(f.name_en) CONTAINS "puffed"
                  AND NOT toLower(f.name_en) CONTAINS "popped"
                  AND NOT toLower(f.name_en) CONTAINS "flaked"
                  AND NOT toLower(f.name_en) CONTAINS "flakes"
                  AND NOT toLower(f.name_en) CONTAINS "flour"
                  AND NOT toLower(f.name_en) CONTAINS "bran"
                  AND NOT toLower(f.name_en) CONTAINS "pulao"
                  AND NOT toLower(f.name_en) CONTAINS "biryani"
                  AND NOT toLower(f.name_en) CONTAINS "khichuri"
                  AND NOT toLower(f.name_en) CONTAINS "payesh"
                  AND f.is_partial = false
                RETURN f.code AS code, f.name_en AS name_en,
                       coalesce(f.name_bn, f.name_en) AS name_bn,
                       f.energy_kcal AS calories, f.protein_g AS protein,
                       f.fiber_g AS fiber
                LIMIT 6
            """)
            for rec in rice_result:
                code = rec["code"]
                # Update/override existing food if it is already in safe_foods
                existing_found = False
                for f in rag_foods:
                    if f.get("code") == code:
                        f["food_group"] = "Rice Staples"
                        existing_found = True
                        break
                
                # If not present, add it to supplemental list
                if not existing_found and code not in {f.get("code") for f in rag_foods if f.get("code")}:
                    supplemental.append({
                        "code":       code or "",
                        "name_en":    rec["name_en"] or "",
                        "name_bn":    rec["name_bn"] or rec["name_en"] or "",
                        "calories":   round(float(rec["calories"] or 0), 1),
                        "protein":    round(float(rec["protein"]  or 0), 2),
                        "fiber":      round(float(rec["fiber"]    or 0), 2),
                        "food_group": "Rice Staples",
                        "similarity_score": 0.0,
                    })
    except Exception as e:
        print(f"⚠️ Failed to ensure Rice Staples in food list: {e}")

    existing_codes = {f["code"] for f in (rag_foods + supplemental) if f.get("code")}
    existing_groups = {f["food_group"] for f in (rag_foods + supplemental)}

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


def _scale_plan_to_target(plan_data: Dict[str, Any], target_calories: int, completed_slots: set = None) -> Dict[str, Any]:
    """Scale all food item portions proportionally so the total calories exactly hit the target.
    This fixes the common issue where the LLM under-generates food portions.
    """
    meals = plan_data.get("meals", [])
    if not meals:
        return plan_data

    if completed_slots is None:
        completed_slots = set()
    else:
        completed_slots = {s.lower() for s in completed_slots}

    # Calculate calories for completed and non-completed meals separately
    completed_total = 0
    non_completed_total = 0

    for meal in meals:
        slot = meal.get("slot", "").lower()
        meal_cal = sum(item.get("calories", 0) for item in meal.get("items", []))
        if slot in completed_slots:
            completed_total += meal_cal
        else:
            non_completed_total += meal_cal

    # Remaining calorie target for non-completed meals
    remaining_target = max(100, target_calories - completed_total)

    if non_completed_total <= 0:
        return plan_data

    # Only scale if there's a meaningful gap (>3% off target) for non-completed meals
    gap_pct = abs(non_completed_total - remaining_target) / remaining_target
    if gap_pct < 0.03:
        return plan_data

    scale = remaining_target / non_completed_total
    print(f"⚖️  Scaling plan (excluding completed slots {completed_slots}): non-completed generated {non_completed_total} kcal → scaling by {scale:.3f} to reach remaining {remaining_target} kcal")

    meal_targets = [0.30, 0.40, 0.30]  # breakfast / lunch / dinner fractions
    for i, meal in enumerate(meals):
        slot = meal.get("slot", "").lower()
        if slot in completed_slots:
            meal_cal = sum(item.get("calories", 0) for item in meal.get("items", []))
            meal["target_calories"] = meal_cal
            continue

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
    avoid_codes: set = None,
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
        
        # 🍚 CULTURAL FIX: Rice must NEVER appear in breakfast food list; breakfast/snack-only grains must NEVER appear in lunch/dinner
        if slot == "breakfast":
            allowed = [f for f in allowed if not _is_plain_rice(f) and f.get("food_group") != "Rice Staples"]
        elif slot in ("lunch", "dinner"):
            # Ensure all Rice Staples in safe_foods are in allowed
            allowed_codes_set = {f.get("code") for f in allowed if f.get("code")}
            for f in safe_foods:
                if f.get("food_group") == "Rice Staples" and f.get("code") not in allowed_codes_set:
                    allowed.append(f)

            # Exclude grains/cereals unless they are explicitly in the slot's codes (not just supplementary)
            allowed_codes_for_slot = slot_pools.get(slot, set()) if slot_pools else set()
            allowed_codes_for_all = slot_pools.get("all", set()) if slot_pools else set()
            filtered_allowed = []
            for f in allowed:
                f_code = f.get("code")
                # Rice Staples are always allowed in lunch/dinner
                if f.get("food_group") == "Rice Staples":
                    filtered_allowed.append(f)
                    continue
                if f.get("food_group") == "Cereals and Millets":
                    if f_code not in allowed_codes_for_slot and f_code not in allowed_codes_for_all:
                        continue
                filtered_allowed.append(f)
            allowed = filtered_allowed

        # 🔄 VARIETY CACHE / AVOIDANCE:
        # Exclude previously suggested codes from the allowed pool to force variety on regeneration.
        # But do NOT avoid core staples (Plain Rice/Roti/Paratha) to prevent meal plan generation failures due to lack of staples.
        if avoid_codes:
            allowed = [f for f in allowed if f.get("code") not in avoid_codes or _is_core_staple(f) or f.get("food_group") == "Rice Staples"]
        
        # Categorize allowed foods
        rice_staples = []
        staples = []
        proteins = []
        veggies = []
        others = []
        
        for f in allowed:
            g = f.get("food_group", "Other")
            if g == "Rice Staples":
                rice_staples.append(f)
            elif g in ["Cereals and Millets", "Cereals", "Cereals & Grains"]:
                staples.append(f)
            elif g in ["Poultry", "Animal Meat", "Marine Fish", "Fresh Water Fish and Shellfish", "Marine Shellfish", "Egg and Egg Products", "Eggs", "Grain Legumes", "Pulses & Legumes"]:
                proteins.append(f)
            elif g in ["Green Leafy Vegetables", "Other Vegetables", "Roots and Tubers", "Leafy Vegetables", "Vegetables", "Roots & Tubers"]:
                veggies.append(f)
            else:
                others.append(f)
                
        # Sort by graph similarity score (highest first) so LLM sees best-ranked foods
        rice_staples.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
        staples.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
        proteins.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
        veggies.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
        others.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
        
        # 🔄 VARIETY: Slightly shuffle within each category so LLM sees different top options daily
        # This prevents the LLM from always picking the #1 ranked food
        import random as _vrand
        def _light_shuffle(lst, swap_prob=0.3):
            """Shuffle adjacent items with given probability to preserve ranking but add variety."""
            result = list(lst)
            for i in range(len(result) - 1):
                if _vrand.random() < swap_prob:
                    result[i], result[i+1] = result[i+1], result[i]
            return result
        
        rice_staples = _light_shuffle(rice_staples)
        staples = _light_shuffle(staples)
        proteins = _light_shuffle(proteins)
        veggies = _light_shuffle(veggies)
        others = _light_shuffle(others)
        
        # Build structured text block — show more foods so LLM has full range
        lines = []
        if rice_staples:
            lines.append("  RICE STAPLES (ভাত / পোলাও / চাল) - (Highly recommended/preferred for Lunch and Dinner):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in rice_staples[:8]])
        if staples:
            lines.append("  WHEAT & OTHER STAPLES (রুটি / পরোটা / সুজি / সেমাই):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in staples[:12]])
        if proteins:
            lines.append("  PROTEINS (meat/poultry/fish/eggs/lentils):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in proteins[:20]])
        if veggies:
            lines.append("  VEGETABLES & GREENS:")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in veggies[:15]])
        if others and slot in ["breakfast", "snack"]:
            lines.append("  OTHER (supplementary/dairy/fruits):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in others[:10]])
            
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
        # Use top pairings sorted by popularity (no shuffle — deterministic)
        display_pairings = sorted(pairings, key=lambda p: p.get("popularity", 0), reverse=True)[:30]
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
11. Lunch and dinner MUST include a staple grain, strongly trending towards choosing a rice staple from the RICE STAPLES list (Rice/ভাত) for lunch and dinner. Roti/রুটি is acceptable for dinner but rice is highly preferred. Breakfast staple grain MUST be chosen from the WHEAT & OTHER STAPLES list (রুটি, পরোটা, সুজি, সেমাই), NEVER plain rice.
12. Respect traditional Bangladeshi food pairings. For example, pair Rice (ভাত) with curry (Chicken/Beef/Fish) and Dal (মসুর ডাল), or Roti (রুটি) with Eggs/Dal. Refer to the POPULAR FOOD COMBINATIONS guide provided in the prompt. Do not pair unrelated or mismatching items in a single meal.
13. VARIETY: Ensure you select different curries, vegetables, and proteins than a typical default plan. Mix it up and provide creative, appetizing combinations!
13b. DAILY ROTATION (CRITICAL): Do NOT generate the same meal plan every day. Rotate staple grains and proteins across days:
    - If yesterday's breakfast was Atta Roti, today's breakfast should be Suji Halwa or Semai.
    - If yesterday's lunch had Rohu Fish, today's lunch should have Chicken or Beef or a different fish.
    - If yesterday's dinner had Rice + Chicken, today's dinner should have Rice + a different protein (Fish/Beef/Egg) or Roti + Protein.
    - NEVER repeat the exact same combination of foods on consecutive days.
    - Each day's plan should feel DIFFERENT and appetizing.
14. MEAL SLOT RULES — STRICTLY ENFORCED:
    - BREAKFAST (সকালের নাস্তা): Light morning food. Typical Bangladeshi breakfast = Roti/Paratha + Egg/Dal + Tea/Milk. May also include: Semai, Suji, Bread, Banana, seasonal fruits, nuts, milk. MUST choose the staple grain from WHEAT & OTHER STAPLES list. NEVER serve plain rice + fish curry or heavy dal + bhorta for breakfast. Breakfast should NOT look like lunch.
    - LUNCH (দুপুরের খাবার): Heavy main meal. MUST include: a plain rice staple chosen from the RICE STAPLES list + Dal (মসুর/মুগ ডাল) + Protein curry (Fish/Chicken/Beef/Egg) + Vegetable bhaji/torkari. This is the biggest meal of the day.
    - DINNER (রাতের খাবার): Substantial but can be lighter than lunch. MUST include: either a plain rice staple from the RICE STAPLES list (preferred) or a roti/flour bread from the WHEAT & OTHER STAPLES list + Dal + Protein curry + Veg. Do NOT serve only fruits or only bread for dinner.
    - SNACK: Fruits, nuts, milk, small portions.
15. MINIMUM ITEMS PER MEAL (CRITICAL): Every meal slot MUST contain at least 3 items, ideally 4. Do NOT generate meals with only 1 or 2 items.
    - BREAKFAST must have: 1 staple (Roti/Paratha/Suji/Semai) + 1 protein (Egg/Dal) + 1 supplementary (Milk/Fruit/Nuts). That's 3 items minimum.
    - LUNCH must have: 1 grain (Rice) + 1 pulse (Dal) + 1 protein (Fish/Chicken/Beef/Egg) + 1 vegetable. That's 4 items.
    - DINNER must have: 1 grain (Rice/Roti) + 1 pulse (Dal) + 1 protein (Fish/Chicken/Beef/Egg) + 1 vegetable. That's 4 items.
    If you generate fewer than 3 items for any meal, the plan will be rejected.
16. BREAKFAST VEGETABLE RULE (CRITICAL): Vegetables (শাক/সবজি) are ONLY acceptable at breakfast when the breakfast includes Ruti (রুটি) or Paratha (পরোটা) as the staple. If breakfast uses Semolina (সুজি), Semai (সেমাই), or any non-roti grain, DO NOT include any vegetables in that breakfast slot. NOTE: Rice (ভাত/চাল) is NEVER a breakfast food in Bangladesh. Breakfast staple must be Roti, Paratha, Suji, or Semai only. This is authentic Bangladeshi morning food culture.
17. COOKED BANGLADESHI FOOD NAMING REASONING (CRITICAL): Do NOT return raw ingredient names in the final plan. Perform culinary reasoning to convert the raw ingredients you choose from the list into realistic, cooked Bangladeshi dishes for the `name_bn` field. 
  - If you choose `সিদ্ধ চাল` (raw parboiled rice), list it as `সিদ্ধ চালের ভাত` (cooked rice).
  - If you choose `আটা` (wheat flour), list it as `আটা রুটি` (atta roti).
  - If you choose `কচু পাতা` (colocasia leaves), list it as `কচু পাতার ভর্তা` (colocasia leaf bhorta) or `কচু পাতার তরকারি`.
  - If you choose `পোলট্রি মুরগি` (chicken), list it as `মুরগির মাংসের তরকারি (কম তেল)` (chicken curry).
  - If you choose a leafy vegetable like `লাল শাক` or `পালং শাক`, list it as `লাল শাক ভাজি` or `পালং শাকের তরকারি`.
  - If you choose lentils like `মসুর ডাল`, list it as `মসুর ডাল (রান্না করা)`.
  This makes the meal plan highly practical and realistic for daily eating.
16. FOOD CODE REQUIREMENT: The `food_code` field for every item MUST be an exact code from the provided food lists (e.g. "A019", "B013", "M004"). Never invent codes. Every item must trace back to a real food in the dataset.
17. NO DUPLICATE FOODS: Within a single meal slot (breakfast / lunch / dinner), every item MUST have a UNIQUE `food_code`. Do NOT repeat the same food code twice in the same meal. For example, if breakfast already has A019 (Atta Roti), the next item must be a different code like M004 (Egg) or B013 (Dal).
18. MICRONUTRIENT PORTION SAFETY & TOXICITY PREVENTION: Some micronutrients can become toxic if overconsumed. To prevent toxicity and safely manage upper intake limits:
  - Limit the portion of any single dark leafy green (e.g. Spinach/Palang Shak) to a maximum of 100g.
  - Do not use liver or organ meat exceeding 75g in a day.
  - Balance out vitamins/minerals by including a diverse variety of minor food categories (grains, pulses, proteins, dairy/fruits, vegetables) in moderate amounts.
19. ONLINE PLATFORM SUGGESTIONS: At the end of the meal plan, add a short "Shopping Tips" section. For each main ingredient category, suggest where to buy it online in Bangladesh:
  - Fresh vegetables, fish, meat, dairy, rice, dal, atta → Chaldal (chaldal.com)
  - Groceries, cooking oil, spices, daily essentials → Shwapno (shwapno.com) or Meena Click (meenaclick.com)
  - Organic / farm-fresh items → Khaas Food (khaasfood.com)
  - Packaged foods, snacks, supplements → Daraz (daraz.com.bd)
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
                
        # Sort by graph similarity score (highest first)
        staples.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
        proteins.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
        veggies.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
        others.sort(key=lambda f: f.get("similarity_score", 0), reverse=True)
        
        # Build structured text block
        lines = []
        if staples:
            lines.append("  STAPLES (grains/roti/rice):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in staples[:12]])
        if proteins:
            lines.append("  PROTEINS (meat/poultry/fish/eggs/lentils):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in proteins[:20]])
        if veggies:
            lines.append("  VEGETABLES & GREENS:")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in veggies[:15]])
        if others and slot in ["breakfast", "snack"]:
            lines.append("  OTHER (supplementary/dairy/fruits):")
            lines.extend([f"  - {f['name_bn']} ({f['name_en']}): {f.get('calories','N/A')} kcal/100g, {f.get('protein','N/A')}g protein, code: {f['code']}" for f in others[:10]])
            
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
        display_pairings = sorted(pairings, key=lambda p: p.get("popularity", 0), reverse=True)[:30]
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
14. MEAL SLOT RULES — STRICTLY ENFORCED (applies to EVERY day):
    - BREAKFAST (সকালের নাস্তা): Light morning food. Typical Bangladeshi breakfast = Roti/Paratha + Egg/Dal + Tea/Milk. May also include: Semai, Suji, Bread, Banana, seasonal fruits, nuts, milk. NEVER serve rice + fish curry or heavy dal + bhorta for breakfast. Breakfast should NOT look like lunch.
    - LUNCH (দুপুরের খাবার): Heavy main meal. MUST include: Rice (ভাত) as staple + Dal (মসুর/মুগ ডাল) + Protein curry (Fish/Chicken/Beef/Egg) + Vegetable bhaji/torkari. This is the biggest meal of the day.
    - DINNER (রাতের খাবার): Substantial but can be lighter than lunch. Options: Rice + Dal + Protein + Veg, OR Roti + Protein curry + Veg. Do NOT serve only fruits or only bread for dinner.
15. MINIMUM ITEMS PER MEAL (CRITICAL): Every meal slot MUST contain at least 3 items, ideally 4. Do NOT generate meals with only 1 or 2 items.
    - BREAKFAST must have: 1 staple (Roti/Paratha/Suji/Semai) + 1 protein (Egg/Dal) + 1 supplementary (Milk/Fruit/Nuts). That's 3 items minimum.
    - LUNCH must have: 1 grain (Rice) + 1 pulse (Dal) + 1 protein (Fish/Chicken/Beef/Egg) + 1 vegetable. That's 4 items.
    - DINNER must have: 1 grain (Rice/Roti) + 1 pulse (Dal) + 1 protein (Fish/Chicken/Beef/Egg) + 1 vegetable. That's 4 items.
    If you generate fewer than 3 items for any meal on any day, the plan will be rejected.
16. BREAKFAST VEGETABLE RULE (CRITICAL): Vegetables (শাক/সবজি) are ONLY acceptable at breakfast when the breakfast includes Ruti (রুটি) or Paratha (পরোটা) as the staple. If breakfast uses Semolina (সুজি), Semai (সেমাই), Rice (ভাত), or any non-roti grain, DO NOT include any vegetables in that breakfast slot. This applies for every single day in the 7-day plan. This is authentic Bangladeshi morning food culture.
17. COOKED BANGLADESHI FOOD NAMING REASONING (CRITICAL): Do NOT return raw ingredient names in the final plan. Perform culinary reasoning to convert the raw ingredients you choose from the list into realistic, cooked Bangladeshi dishes for the `name_bn` field. 
  - If you choose `সিদ্ধ চাল` (raw parboiled rice), list it as `সিদ্ধ চালের ভাত` (cooked rice).
  - If you choose `আটা` (wheat flour), list it as `আটা রুটি` (atta roti).
  - If you choose `কচু পাতা` (colocasia leaves), list it as `কচু পাতার ভর্তা` (colocasia leaf bhorta) or `কচু পাতার তরকারি`.
  - If you choose `পোলট্রি মুরগি` (chicken), list it as `মুরগির মাংসের তরকারি (কম তেল)` (chicken curry).
  - If you choose a leafy vegetable like `লাল শাক` or `পালং শাক`, list it as `লাল শাক ভাজি` or `পালং শাকের তরকারি`.
  - If you choose lentils like `মসুর ডাল`, list it as `মসুর ডাল (রান্না করা)`.
  This makes the meal plan highly practical and realistic for daily eating.
18. FOOD CODE REQUIREMENT: The `food_code` field for every item MUST be an exact code from the provided food lists (e.g. "A019", "B013", "M004"). Never invent codes. Every item must trace back to a real food in the dataset.
19. NO DUPLICATE FOODS: Within a single meal slot on any given day, every item MUST have a UNIQUE `food_code`. Do NOT repeat the same food code twice in the same meal.
20. WEEKLY MICRONUTRIENT CYCLING (CRITICAL): To achieve 100% of all required micronutrients across the 7-day period without exceeding daily calorie limits, you must cycle key nutrient-dense categories across the days:
  - Days 1, 3, and 5: Prioritize dark leafy greens (Spinach, Lal Shak, Pui Shak) to satisfy Folate, Iron, and Calcium needs.
  - Days 2, 4, and 6: Prioritize orange/yellow vegetables and fresh fruits (Carrot, Sweet Pumpkin, Guava) to satisfy Vitamin A and Vitamin C needs.
  - Day 7: Include dairy/nuts/seeds to cover Calcium, Zinc, and Vitamin E needs.
21. TOXICITY & OVER-INTAKE PREVENTION (CRITICAL): High intake of certain micronutrients (e.g., Vitamin A, Vitamin D, Iron) can be toxic. To ensure safety:
  - Never include liver or organ meats more than once in the entire 7-day plan, capped at 75g.
  - Limit individual portions of concentrated greens (e.g., Spinach) to a maximum of 100g in a single meal.
  - Do not repeat the exact same high-micronutrient therapeutic food on consecutive days. Maintain a diverse food rotation.
22. ONLINE PLATFORM SUGGESTIONS: At the end of the meal plan, add a short "Shopping Tips" section. For each main ingredient category, suggest where to buy it online in Bangladesh:
  - Fresh vegetables, fish, meat, dairy, rice, dal, atta → Chaldal (chaldal.com)
  - Groceries, cooking oil, spices, daily essentials → Shwapno (shwapno.com) or Meena Click (meenaclick.com)
  - Organic / farm-fresh items → Khaas Food (khaasfood.com)
  - Packaged foods, snacks, supplements → Daraz (daraz.com.bd)
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
    day_seed: int = None,
) -> Dict[str, Any]:
    """Generate a template-based meal plan when LLM is unavailable.
    
    day_seed: used to seed random for daily variety (e.g. day_of_month).
    """

    if used_codes_global is None:
        used_codes_global = set()
    
    # Create a local random instance for daily variety so each day gets a different meal
    # without affecting global random state
    _rng = random.Random(day_seed) if day_seed is not None else random

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
            chosen = _rng.choice(pool)
            used.add(chosen["code"])
            used_codes_global.add(chosen["code"])
            return chosen
        
        # Fallback to any safe food in the category, ignoring used constraints
        pool_any = categories.get(cat, [])
        if pool_any:
            chosen = _rng.choice(pool_any)
            return chosen
            
        # Fallback to any safe food not used
        pool_all = [f for f in safe_foods if f["code"] not in used and f["code"] not in used_codes_global]
        if pool_all:
            chosen = _rng.choice(pool_all)
            used.add(chosen["code"])
            used_codes_global.add(chosen["code"])
            return chosen
            
        return _rng.choice(safe_foods) if safe_foods else None

    used_codes = set()

    def pick_slot_specific(cat, slot, used):
        pool = categories.get(cat, [])
        
        # 1. Slot-based filtering
        if slot in ["lunch", "dinner"]:
            # Exclude snack/breakfast-only grains from lunch/dinner
            # i.e. exclude non-core staples from the cereals category
            pool = [f for f in pool if not (cat == "Cereals & Grains" and not _is_core_staple(f))]
        elif slot == "breakfast":
            # Exclude rice from breakfast
            pool = [f for f in pool if not _is_plain_rice(f)]
            
            # For breakfast cereals, ONLY allow preferred breakfast grains (non-rice grains)
            if cat == "Cereals & Grains":
                bfast_pool = [f for f in pool if not _is_plain_rice(f)]
                if bfast_pool:
                    pool = bfast_pool

        # 2. Protein slot preference
        if cat in ["Fish & Seafood", "Meat & Poultry"] and slot == "breakfast":
            # Do not serve heavy fish/meat curry at breakfast
            return None

        # Filter used codes
        eligible = [f for f in pool if f["code"] not in used and f["code"] not in used_codes_global]
        if eligible:
            chosen = _rng.choice(eligible)
            used.add(chosen["code"])
            used_codes_global.add(chosen["code"])
            return chosen

        # Fallback to any in category matching slot constraints
        if pool:
            chosen = _rng.choice(pool)
            return chosen

        # absolute fallback
        return _rng.choice(safe_foods) if safe_foods else None

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
            _rng.shuffle(categories_to_try)
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

        # Ensure minimum 3 items per meal — add supplementary if needed
        if len(items) < 3:
            # Pick a supplementary item (fruit, dairy, nuts) not already in this meal
            existing_codes = {i.get("food_code") or i.get("code") or "" for i in items}
            for supp_cat in ["Fruits", "Dairy & Milk", "Nuts & Seeds"]:
                candidate = pick_slot_specific(supp_cat, slot, used_codes)
                if candidate and candidate["code"] not in existing_codes:
                    s_cal_per_100 = candidate.get("calories", 60)
                    s_amt = 100 if supp_cat != "Nuts & Seeds" else 30
                    s_cal = round(s_cal_per_100 * s_amt / 100)
                    s_bn, s_en = _get_cooked_name(
                        candidate["name_bn"], candidate["name_en"], candidate.get("food_group", supp_cat)
                    )
                    items.append({
                        "food_code": candidate["code"],
                        "name_bn": s_bn,
                        "name_en": s_en,
                        "amount_g": s_amt,
                        "calories": s_cal,
                        "food_group": candidate.get("food_group"),
                        "why_bn": "সহায়ক খাবার" if language == "bn" else "Supplementary food",
                    })
                    print(f"📦 Fallback minimum: Added '{s_bn}' to {slot} (now {len(items)} items)")
                    break

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


def _enforce_variety_cache(plan_data: Dict[str, Any], safe_foods: List[Dict[str, Any]], avoid_codes: set, completed_slots_set: set) -> Dict[str, Any]:
    """
    Ensure that no non-staple foods from avoid_codes are present in non-completed slots.
    If they are, replace them with alternative foods from safe_foods of the same group.
    """
    if not avoid_codes or not plan_data:
        return plan_data

    safe_by_code = {f["code"]: f for f in safe_foods if f.get("code")}
    group_to_foods = {}
    for f in safe_foods:
        g = f.get("food_group", "Other")
        group_to_foods.setdefault(g, []).append(f)

    # Track all codes in the plan to avoid duplicate assignments
    all_current_codes = set()
    for meal in plan_data.get("meals", []):
        for item in meal.get("items", []):
            code = item.get("food_code") or item.get("code")
            if code:
                all_current_codes.add(code)

    for meal in plan_data.get("meals", []):
        slot_name = meal.get("slot", "").lower()
        if slot_name in completed_slots_set:
            continue  # Do not touch completed meals

        new_items = []
        for item in meal.get("items", []):
            code = item.get("food_code") or item.get("code") or ""
            food = safe_by_code.get(code)
            if code in avoid_codes and not (food and _is_core_staple(food)):
                original_group = item.get("food_group", "")
                candidates = group_to_foods.get(original_group, safe_foods)
                
                replacement = None
                # Sort candidates by similarity score to get the best match first
                candidates_sorted = sorted(candidates, key=lambda f: f.get("similarity_score", 0), reverse=True)
                for c in candidates_sorted:
                    c_code = c.get("code") or c.get("food_code")
                    if c_code and c_code not in avoid_codes and c_code not in all_current_codes:
                        replacement = c
                        break
                
                # Relax all_current_codes if no perfect option is found
                if not replacement:
                    for c in candidates_sorted:
                        c_code = c.get("code") or c.get("food_code")
                        if c_code and c_code not in avoid_codes:
                            replacement = c
                            break

                if replacement:
                    old_name = item.get("name_bn", "")
                    amount_g = item.get("amount_g", 100)
                    kcal_per_100g = float(replacement.get("calories") or replacement.get("energy_kcal") or 0)
                    item["food_code"] = replacement["code"]
                    item["code"] = replacement["code"]
                    item["name_bn"] = replacement.get("name_bn", replacement.get("name_en", ""))
                    item["name_en"] = replacement.get("name_en", "")
                    item["food_group"] = replacement.get("food_group", "")
                    item["calories"] = round((kcal_per_100g * amount_g) / 100.0)
                    item["emoji"] = _validate_emoji(item)
                    all_current_codes.discard(code)
                    all_current_codes.add(replacement["code"])
                    print(f"🔄 Variety Cache: Replaced '{old_name}' ({code}) in {slot_name} with '{item['name_bn']}' ({replacement['code']})")
            new_items.append(item)
        meal["items"] = new_items

    return plan_data


async def generate_daily_meal_plan(user_id: str, language: str = "bn", existing_plan_data: Dict[str, Any] = None, completed_slots: List[str] = None) -> Dict[str, Any]:
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

    # Build avoid_codes for variety based on existing plan's non-completed slots
    completed_slots_set = {s.lower() for s in completed_slots} if completed_slots else set()
    avoid_codes = set()
    if existing_plan_data:
        for meal in existing_plan_data.get("meals", []):
            if meal.get("slot", "").lower() not in completed_slots_set:
                for item in meal.get("items", []):
                    code = item.get("food_code") or item.get("code")
                    if code:
                        avoid_codes.add(code)

    plan_data = None
    try:
        pairings = _get_popular_pairings(rag.get_neo4j_driver())
        safe_codes = {f.get("code") for f in safe_foods if f.get("code")}
        slot_pools = _get_slot_separated_foods(rag.get_neo4j_driver(), safe_codes)
        messages = _build_meal_plan_prompt(
            profile, targets, safe_foods, conditions, language, pairings, slot_pools,
            avoid_codes=avoid_codes
        )
        llm_response = await llm_client.chat_completion(
            messages=messages,
            temperature=0.35,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
        plan_data = json.loads(llm_response)
        plan_data = _validate_and_sanitize_meal_plan_foods(plan_data, safe_foods, rag.get_neo4j_driver(), slot_pools)
        plan_data = _enforce_slot_appropriateness(plan_data, slot_pools, safe_foods, avoid_codes=avoid_codes)
        plan_data = _deduplicate_meal_items(plan_data, safe_foods, avoid_codes=avoid_codes)
        plan_data = _ensure_meal_minimum_items(plan_data, safe_foods, slot_pools, avoid_codes=avoid_codes)
        plan_data = _enforce_variety_cache(plan_data, safe_foods, avoid_codes, completed_slots_set)
    except Exception as e:
        print(f"LLM daily meal plan error: {e}")
        import datetime as _dt
        day_seed = _dt.datetime.now().day
        plan_data = _generate_fallback_meal_plan(
            profile, targets, safe_foods, conditions, language,
            used_codes_global=avoid_codes,
            day_seed=day_seed
        )

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

    # Restore completed meals to guarantee they are unchanged
    completed_slots_set = {s.lower() for s in completed_slots} if completed_slots else set()
    completed_meals = []
    if existing_plan_data and completed_slots_set:
        for meal in existing_plan_data.get("meals", []):
            if meal.get("slot", "").lower() in completed_slots_set:
                completed_meals.append(meal)

    if completed_slots_set and completed_meals:
        completed_map = {m["slot"].lower(): m for m in completed_meals}
        new_meals = []
        restored_slots = set()
        for meal in plan_data.get("meals", []):
            slot_name = meal.get("slot", "").lower()
            if slot_name in completed_map:
                new_meals.append(completed_map[slot_name])
                restored_slots.add(slot_name)
            else:
                new_meals.append(meal)
        for slot_name, comp_meal in completed_map.items():
            if slot_name not in restored_slots:
                new_meals.append(comp_meal)
        plan_data["meals"] = new_meals

    # ✅ Scale portions proportionally so total calories always hit the target
    plan_data = _scale_plan_to_target(plan_data, targets["target_calories"], completed_slots=completed_slots_set)

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
            temperature=0.35,
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
            _enforce_slot_appropriateness(p, slot_pools, safe_foods)
            _deduplicate_meal_items(p, safe_foods)
            _ensure_meal_minimum_items(p)
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
            plan = _generate_fallback_meal_plan(profile, targets, safe_foods, conditions, language, used_codes_global, day_seed=day)
            plan["day"] = day + 1
            plan["day_name_bn"] = ["সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার", "রবিবার"][day]
            plan["day_name_en"] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day]
            weekly_plans.append(plan)

    return weekly_plans


async def save_meal_plan(user_id: str, plan_type: str, plan_data: Dict[str, Any], language: str, target_date: datetime = None) -> Any:
    """Save a generated meal plan to the database."""
    if target_date is None:
        target_date = datetime.now(ZoneInfo("Asia/Dhaka")).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)

    ai_cal = sum(
        item.get("calories", 0)
        for m in plan_data.get("meals", [])
        for item in m.get("items", [])
    )

    # Look for the latest existing meal plan for this user, type, and date to update it.
    # Consistent ordering with all other meal-plan readers (chat, meal-plan page, etc.)
    existing = await prisma.mealplan.find_first(
        where={
            "userId": user_id,
            "planType": plan_type,
            "planDate": {"gte": target_date, "lt": target_date + timedelta(days=1)},
        },
        order={"createdAt": "desc"},
    )

    if existing:
        plan = await prisma.mealplan.update(
            where={"planId": existing.planId},
            data={
                "planData": to_json_string(plan_data),
                "calorieTarget": plan_data.get("target_calories", 2000),
                "aiSuggestionCal": ai_cal,
                "language": language,
            }
        )
    else:
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
