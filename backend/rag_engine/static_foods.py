"""Static fallback food catalog — used when Neo4j GraphRAG is unavailable.

Curated from BD_food_details.csv with ~70 representative Bangladeshi foods
spanning all major food groups. Calories are per 100g.
"""

from typing import List, Dict, Any

STATIC_FOODS: List[Dict[str, Any]] = [
    # ── Cereals & Grains ──────────────────────────────────────────────
    {"code": "A019", "name_en": "Wheat flour atta", "name_bn": "আটা", "food_group": "Cereals & Grains", "calories": 134.0, "protein": 10.57, "fiber": 11.36},
    {"code": "A018", "name_en": "Wheat flour refined", "name_bn": "ময়দা", "food_group": "Cereals & Grains", "calories": 147.2, "protein": 10.36, "fiber": 2.76},
    {"code": "A015", "name_en": "Rice raw milled", "name_bn": "আতপ চাল", "food_group": "Cereals & Grains", "calories": 149.1, "protein": 7.94, "fiber": 2.81},
    {"code": "A022", "name_en": "Wheat semolina", "name_bn": "সুজি", "food_group": "Cereals & Grains", "calories": 139.6, "protein": 11.38, "fiber": 9.72},
    {"code": "A016", "name_en": "Samai", "name_bn": "সেমাই", "food_group": "Cereals & Grains", "calories": 144.9, "protein": 10.13, "fiber": 7.72},
    {"code": "A024", "name_en": "Wheat vermicelli roasted", "name_bn": "ভাজা সেমাই", "food_group": "Cereals & Grains", "calories": 142.3, "protein": 10.37, "fiber": 9.55},
    {"code": "A020", "name_en": "Wheat whole", "name_bn": "আস্ত গম", "food_group": "Cereals & Grains", "calories": 134.7, "protein": 10.59, "fiber": 11.23},

    # ── Pulses & Legumes ──────────────────────────────────────────────
    {"code": "B013", "name_en": "Lentil dal", "name_bn": "মসুর ডাল", "food_group": "Pulses & Legumes", "calories": 134.9, "protein": 24.35, "fiber": 10.43},
    {"code": "B010", "name_en": "Green gram dal", "name_bn": "সবুজ মুগ ডাল", "food_group": "Pulses & Legumes", "calories": 136.3, "protein": 23.88, "fiber": 9.37},
    {"code": "B003", "name_en": "Black gram dal", "name_bn": "বিউলির ডাল", "food_group": "Pulses & Legumes", "calories": 135.6, "protein": 23.06, "fiber": 11.93},
    {"code": "B001", "name_en": "Bengal gram dal", "name_bn": "ছোলার ডাল", "food_group": "Pulses & Legumes", "calories": 137.7, "protein": 21.55, "fiber": 15.15},
    {"code": "B017", "name_en": "Peas dry", "name_bn": "শুকনো মটর", "food_group": "Pulses & Legumes", "calories": 126.9, "protein": 20.43, "fiber": 17.01},
    {"code": "B018", "name_en": "Rajmah black", "name_bn": "কালো কিডনি বিন", "food_group": "Pulses & Legumes", "calories": 124.7, "protein": 19.01, "fiber": 17.74},

    # ── Leafy Vegetables ──────────────────────────────────────────────
    {"code": "C033", "name_en": "Spinach", "name_bn": "পালং শাক", "food_group": "Leafy Vegetables", "calories": 10.2, "protein": 2.14, "fiber": 2.38},
    {"code": "C003", "name_en": "Red Amaranth", "name_bn": "লাল শাক", "food_group": "Leafy Vegetables", "calories": 14.0, "protein": 3.93, "fiber": 4.91},
    {"code": "C007", "name_en": "Basella leaves", "name_bn": "পুঁইশাক", "food_group": "Leafy Vegetables", "calories": 8.2, "protein": 1.57, "fiber": 2.21},
    {"code": "C018", "name_en": "Colocasia leaves green", "name_bn": "কচু পাতা", "food_group": "Leafy Vegetables", "calories": 18.2, "protein": 3.42, "fiber": 5.6},
    {"code": "C026", "name_en": "Mustard leaves", "name_bn": "সরিষা শাক", "food_group": "Leafy Vegetables", "calories": 12.7, "protein": 3.52, "fiber": 3.92},
    {"code": "C020", "name_en": "Fenugreek leaves", "name_bn": "মেথি শাক", "food_group": "Leafy Vegetables", "calories": 14.4, "protein": 3.68, "fiber": 4.9},
    {"code": "C019", "name_en": "Drumstick leaves", "name_bn": "সজনে পাতা", "food_group": "Leafy Vegetables", "calories": 28.2, "protein": 6.41, "fiber": 8.21},

    # ── Vegetables ────────────────────────────────────────────────────
    {"code": "D031", "name_en": "Brinjal", "name_bn": "বেগুন", "food_group": "Vegetables", "calories": 10.6, "protein": 1.48, "fiber": 3.98},
    {"code": "D036", "name_en": "Cauliflower", "name_bn": "ফুলকপি", "food_group": "Vegetables", "calories": 9.6, "protein": 2.15, "fiber": 3.71},
    {"code": "D056", "name_en": "Ladies finger", "name_bn": "ঢেঁড়স", "food_group": "Vegetables", "calories": 11.5, "protein": 2.08, "fiber": 4.08},
    {"code": "D005", "name_en": "Bitter gourd", "name_bn": "করলা", "food_group": "Vegetables", "calories": 7.9, "protein": 1.34, "fiber": 3.49},
    {"code": "D007", "name_en": "Bottle gourd", "name_bn": "লাউ", "food_group": "Vegetables", "calories": 4.6, "protein": 0.53, "fiber": 2.12},
    {"code": "D075", "name_en": "Tomato ripe", "name_bn": "টমেটো", "food_group": "Vegetables", "calories": 7.9, "protein": 0.76, "fiber": 1.58},
    {"code": "D042", "name_en": "Corn baby", "name_bn": "কচি ভুট্টা", "food_group": "Vegetables", "calories": 30.6, "protein": 2.69, "fiber": 6.09},
    {"code": "D051", "name_en": "Jack fruit", "name_bn": "কাঁঠাল", "food_group": "Vegetables", "calories": 11.0, "protein": 1.98, "fiber": 7.69},
    {"code": "D046", "name_en": "Drumstick", "name_bn": "সজনে", "food_group": "Vegetables", "calories": 12.3, "protein": 2.62, "fiber": 6.83},
    {"code": "D060", "name_en": "Parwar", "name_bn": "পটোল", "food_group": "Vegetables", "calories": 10.1, "protein": 1.4, "fiber": 2.61},
    {"code": "D068", "name_en": "Ridge gourd", "name_bn": "ঝিঙে", "food_group": "Vegetables", "calories": 5.5, "protein": 0.91, "fiber": 1.81},
    {"code": "D058", "name_en": "Onion stalk", "name_bn": "পেঁয়াজ পাতা", "food_group": "Vegetables", "calories": 10.7, "protein": 2.07, "fiber": 5.21},

    # ── Roots & Tubers ────────────────────────────────────────────────
    {"code": "F006", "name_en": "Potato", "name_bn": "আলু", "food_group": "Roots & Tubers", "calories": 29.2, "protein": 1.54, "fiber": 1.71},
    {"code": "F002", "name_en": "Carrot orange", "name_bn": "গাজর", "food_group": "Roots & Tubers", "calories": 13.9, "protein": 0.95, "fiber": 4.18},
    {"code": "F004", "name_en": "Colocasia", "name_bn": "কচু", "food_group": "Roots & Tubers", "calories": 37.2, "protein": 3.31, "fiber": 3.22},
    {"code": "F013", "name_en": "Sweet potato", "name_bn": "মিষ্টি আলু", "food_group": "Roots & Tubers", "calories": 45.6, "protein": 1.33, "fiber": 3.99},
    {"code": "F015", "name_en": "Tapioca", "name_bn": "সাগু", "food_group": "Roots & Tubers", "calories": 33.4, "protein": 1.03, "fiber": 4.61},

    # ── Fish & Seafood ────────────────────────────────────────────────
    {"code": "S006", "name_en": "Rohu", "name_bn": "রুই মাছ", "food_group": "Fish & Seafood", "calories": 42.8, "protein": 19.71, "fiber": 0.0},
    {"code": "S002", "name_en": "Catla", "name_bn": "কাতল মাছ", "food_group": "Fish & Seafood", "calories": 39.4, "protein": 17.94, "fiber": 0.0},
    {"code": "S005", "name_en": "Pangas", "name_bn": "পাঙ্গাস মাছ", "food_group": "Fish & Seafood", "calories": 85.2, "protein": 17.12, "fiber": 0.0},
    {"code": "S001", "name_en": "Cat fish", "name_bn": "মাগুর মাছ", "food_group": "Fish & Seafood", "calories": 51.8, "protein": 15.86, "fiber": 0.0},
    {"code": "S008", "name_en": "Prawns big", "name_bn": "গলদা চিংড়ি", "food_group": "Fish & Seafood", "calories": 38.0, "protein": 19.24, "fiber": 0.0},
    {"code": "P007", "name_en": "Bombay duck", "name_bn": "লইট্টা মাছ", "food_group": "Fish & Seafood", "calories": 28.7, "protein": 13.53, "fiber": 0.0},
    {"code": "P003", "name_en": "Anchovy", "name_bn": "কাচকি মাছ", "food_group": "Fish & Seafood", "calories": 36.7, "protein": 19.88, "fiber": 0.0},
    {"code": "P011", "name_en": "Chappal", "name_bn": "পটকা মাছ", "food_group": "Fish & Seafood", "calories": 31.7, "protein": 17.17, "fiber": 0.0},

    # ── Meat & Poultry ────────────────────────────────────────────────
    {"code": "O003", "name_en": "Goat legs", "name_bn": "খাসির পা", "food_group": "Meat & Poultry", "calories": 66.9, "protein": 22.07, "fiber": 0.0},
    {"code": "O001", "name_en": "Goat shoulder", "name_bn": "খাসির কাঁধ", "food_group": "Meat & Poultry", "calories": 78.7, "protein": 20.33, "fiber": 0.0},
    {"code": "O008", "name_en": "Goat liver", "name_bn": "খাসির কলিজা", "food_group": "Meat & Poultry", "calories": 52.6, "protein": 20.32, "fiber": 0.0},
    {"code": "N003", "name_en": "Chicken breast", "name_bn": "মুরগির মাংস", "food_group": "Meat & Poultry", "calories": 70.4, "protein": 21.81, "fiber": 0.0},
    {"code": "N001", "name_en": "Chicken leg", "name_bn": "মুরগির পা", "food_group": "Meat & Poultry", "calories": 160.5, "protein": 19.44, "fiber": 0.0},
    {"code": "N011", "name_en": "Duck meat", "name_bn": "হাঁসের মাংস", "food_group": "Meat & Poultry", "calories": 54.7, "protein": 19.07, "fiber": 0.0},

    # ── Eggs ──────────────────────────────────────────────────────────
    {"code": "M004", "name_en": "Egg poultry boiled", "name_bn": "সিদ্ধ মুরগির ডিম", "food_group": "Eggs", "calories": 61.8, "protein": 13.43, "fiber": 0.0},
    {"code": "M008", "name_en": "Egg country hen", "name_bn": "দেশি মুরগির ডিম", "food_group": "Eggs", "calories": 70.4, "protein": 13.14, "fiber": 0.0},

    # ── Dairy & Milk ──────────────────────────────────────────────────
    {"code": "L002", "name_en": "Cow Milk", "name_bn": "গরুর দুধ", "food_group": "Dairy & Milk", "calories": 30.5, "protein": 3.26, "fiber": 0.0},
    {"code": "L003", "name_en": "Paneer", "name_bn": "পনির", "food_group": "Dairy & Milk", "calories": 107.9, "protein": 18.86, "fiber": 0.0},
    {"code": "L001", "name_en": "Buffalo Milk", "name_bn": "মহিষের দুধ", "food_group": "Dairy & Milk", "calories": 44.9, "protein": 3.68, "fiber": 0.0},

    # ── Fruits ────────────────────────────────────────────────────────
    {"code": "E028", "name_en": "Guava", "name_bn": "পেয়ারা", "food_group": "Fruits", "calories": 13.5, "protein": 1.44, "fiber": 8.59},
    {"code": "E009", "name_en": "Banana", "name_bn": "কলা", "food_group": "Fruits", "calories": 46.3, "protein": 1.25, "fiber": 2.21},
    {"code": "E012", "name_en": "Banana robusta", "name_bn": "সাগর কলা", "food_group": "Fruits", "calories": 44.0, "protein": 1.23, "fiber": 1.94},
    {"code": "E053", "name_en": "Pineapple", "name_bn": "আনারস", "food_group": "Fruits", "calories": 18.0, "protein": 0.52, "fiber": 3.46},
    {"code": "E049", "name_en": "Papaya ripe", "name_bn": "পাকা পেঁপে", "food_group": "Fruits", "calories": 10.0, "protein": 0.42, "fiber": 2.83},
    {"code": "E037", "name_en": "Mango ripe", "name_bn": "পাকা আম", "food_group": "Fruits", "calories": 20.9, "protein": 0.52, "fiber": 1.67},
    {"code": "E022", "name_en": "Grapes", "name_bn": "আঙুর", "food_group": "Fruits", "calories": 25.4, "protein": 0.76, "fiber": 1.35},
    {"code": "E065", "name_en": "Watermelon", "name_bn": "তরমুজ", "food_group": "Fruits", "calories": 8.5, "protein": 0.6, "fiber": 0.7},

    # ── Nuts & Seeds ──────────────────────────────────────────────────
    {"code": "H005", "name_en": "Cashew nut", "name_bn": "কাজু বাদাম", "food_group": "Nuts & Seeds", "calories": 243.8, "protein": 18.78, "fiber": 3.86},
    {"code": "H012", "name_en": "Ground nut", "name_bn": "চীনাবাদাম", "food_group": "Nuts & Seeds", "calories": 217.6, "protein": 23.65, "fiber": 10.38},
    {"code": "H001", "name_en": "Almond", "name_bn": "কাঠবাদাম", "food_group": "Nuts & Seeds", "calories": 254.9, "protein": 18.41, "fiber": 13.06},
    {"code": "H006", "name_en": "Coconut kernel dry", "name_bn": "নারকেল", "food_group": "Nuts & Seeds", "calories": 261.1, "protein": 7.27, "fiber": 15.88},
]


def get_static_safe_foods(conditions: List[str] = None, goal: str = "Maintain", limit: int = 50) -> List[Dict[str, Any]]:
    """Return static food list filtered by basic condition rules."""
    # Basic condition-based filtering (simple substring matching)
    avoid_groups = set()
    prefer_groups = set()

    condition_lower = " ".join([c.lower() for c in (conditions or [])])
    goal_lower = (goal or "").lower()

    if "diabetes" in condition_lower or "sugar" in condition_lower:
        avoid_groups.add("Fruits")  # Limit high-sugar fruits
        prefer_groups.add("Leafy Vegetables")
        prefer_groups.add("Fish & Seafood")

    if "pressure" in condition_lower or "hypertension" in condition_lower:
        avoid_groups.add("Meat & Poultry")
        prefer_groups.add("Leafy Vegetables")
        prefer_groups.add("Fish & Seafood")

    if "kidney" in condition_lower:
        avoid_groups.add("Pulses & Legumes")
        avoid_groups.add("Meat & Poultry")
        prefer_groups.add("Vegetables")

    if "heart" in condition_lower or "cardiac" in condition_lower:
        avoid_groups.add("Meat & Poultry")
        prefer_groups.add("Fish & Seafood")
        prefer_groups.add("Vegetables")

    if "weight loss" in goal_lower or "lose" in goal_lower:
        prefer_groups.add("Leafy Vegetables")
        prefer_groups.add("Vegetables")
        prefer_groups.add("Fish & Seafood")

    result = []
    for f in STATIC_FOODS:
        g = f.get("food_group", "")
        if g in avoid_groups:
            continue
        score = 0.0
        if g in prefer_groups:
            score = 1.0
        item = dict(f)
        item["similarity_score"] = score
        result.append(item)

    # Sort by preference score, then protein
    result.sort(key=lambda x: (x.get("similarity_score", 0), x.get("protein", 0)), reverse=True)
    return result[:limit]
