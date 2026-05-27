"""Static grocery catalog mapping Bangladeshi food names to products across online platforms.
Prices are representative BDT values per unit (approximate market rates)."""

from typing import List, Dict, Any

# Platform metadata
PLATFORMS: Dict[str, Dict[str, Any]] = {
    "chaldal": {
        "name": "Chaldal",
        "name_bn": "চালডাল",
        "url": "https://chaldal.com",
        "logo": "🥬",
        "color": "#16a34a",
        "delivery_time": "1-2 hours",
        "delivery_fee": 29,
    },
    "shwapno": {
        "name": "Shwapno",
        "name_bn": "স্বপ্ন",
        "url": "https://shwapno.com",
        "logo": "🏪",
        "color": "#ea580c",
        "delivery_time": "Same day",
        "delivery_fee": 49,
    },
    "meenaclick": {
        "name": "Meena Click",
        "name_bn": "মীনা ক্লিক",
        "url": "https://meenaclick.com",
        "logo": "🖱️",
        "color": "#db2777",
        "delivery_time": "Same day",
        "delivery_fee": 39,
    },
    "khaasfood": {
        "name": "Khaas Food",
        "name_bn": "খাস ফুড",
        "url": "https://khaasfood.com",
        "logo": "🌿",
        "color": "#65a30d",
        "delivery_time": "1-2 days",
        "delivery_fee": 60,
    },
    "daraz": {
        "name": "Daraz",
        "name_bn": "দারাজ",
        "url": "https://daraz.com.bd",
        "logo": "📦",
        "color": "#f97316",
        "delivery_time": "2-5 days",
        "delivery_fee": 0,
    },
}

# Grocery items with cross-platform pricing
# Each item maps to food keywords from our Neo4j database
GROCERY_ITEMS: List[Dict[str, Any]] = [
    # ── Staples / Grains ──
    {
        "id": "g-chal-atop-1",
        "keywords": ["আতপ চাল", "atap rice", "atop chal", "rice", "ভাত", "চাল", "chaler bhat"],
        "name_bn": "আতপ চাল (প্রিমিয়াম)",
        "name_en": "Atap Rice (Premium)",
        "unit": "1 kg",
        "image": "🍚",
        "prices": {"chaldal": 72, "shwapno": 75, "meenaclick": 73, "khaasfood": 85, "daraz": 78},
    },
    {
        "id": "g-chal-siddho-1",
        "keywords": ["সিদ্ধ চাল", "sidhdho chal", "parboiled rice", "siddha chal", "ভাত", "চাল"],
        "name_bn": "সিদ্ধ চাল (নাজিরশাইল)",
        "name_en": "Siddha Chal (Nazirshail)",
        "unit": "1 kg",
        "image": "🍚",
        "prices": {"chaldal": 78, "shwapno": 80, "meenaclick": 79, "khaasfood": 92, "daraz": 82},
    },
    {
        "id": "g-atta-1",
        "keywords": ["আটা", "atta", "wheat flour", "flour"],
        "name_bn": "আটা (ব্রাঞ্ডেড)",
        "name_en": "Atta (Branded)",
        "unit": "1 kg",
        "image": "🫓",
        "prices": {"chaldal": 68, "shwapno": 70, "meenaclick": 69, "khaasfood": 80, "daraz": 72},
    },
    {
        "id": "g-maida-1",
        "keywords": ["ময়দা", "maida", "white flour"],
        "name_bn": "ময়দা",
        "name_en": "Maida",
        "unit": "1 kg",
        "image": "🫓",
        "prices": {"chaldal": 65, "shwapno": 67, "meenaclick": 66, "khaasfood": 75, "daraz": 68},
    },
    {
        "id": "g-suji-1",
        "keywords": ["সুজি", "suji", "semolina"],
        "name_bn": "সুজি",
        "name_en": "Semolina (Suji)",
        "unit": "500 g",
        "image": "🥣",
        "prices": {"chaldal": 45, "shwapno": 48, "meenaclick": 46, "khaasfood": 55, "daraz": 50},
    },
    # ── Lentils / Dal ──
    {
        "id": "g-mosur-dal-1",
        "keywords": ["মসুর ডাল", "mosur dal", "red lentil", "masoor dal", "dal", "ডাল"],
        "name_bn": "মসুর ডাল (প্রিমিয়াম)",
        "name_en": "Masoor Dal (Premium)",
        "unit": "500 g",
        "image": "🍲",
        "prices": {"chaldal": 85, "shwapno": 88, "meenaclick": 86, "khaasfood": 95, "daraz": 90},
    },
    {
        "id": "g-mug-dal-1",
        "keywords": ["মুগ ডাল", "mug dal", "moong dal", "mung dal", "ডাল"],
        "name_bn": "মুগ ডাল",
        "name_en": "Moong Dal",
        "unit": "500 g",
        "image": "🍲",
        "prices": {"chaldal": 120, "shwapno": 125, "meenaclick": 122, "khaasfood": 140, "daraz": 128},
    },
    {
        "id": "g-chola-dal-1",
        "keywords": ["ছোলা", "chola", "chickpea", "chana", "ডাল"],
        "name_bn": "ছোলা (ড্রাই)",
        "name_en": "Chickpea (Dry)",
        "unit": "500 g",
        "image": "🫘",
        "prices": {"chaldal": 95, "shwapno": 98, "meenaclick": 96, "khaasfood": 110, "daraz": 100},
    },
    # ── Proteins ──
    {
        "id": "g-egg-1",
        "keywords": ["ডিম", "dim", "egg", "poultry egg", "dim er halua"],
        "name_bn": "ফার্ম ফ্রেশ ডিম (ব্রাউন)",
        "name_en": "Farm Fresh Brown Eggs",
        "unit": "12 pcs",
        "image": "🥚",
        "prices": {"chaldal": 165, "shwapno": 170, "meenaclick": 168, "khaasfood": 190, "daraz": 175},
    },
    {
        "id": "g-chicken-1",
        "keywords": ["মুরগি", "murgi", "chicken", "poultry", "মাংস", "mangsho"],
        "name_bn": "ব্রয়লার মুরগি (কাটা)",
        "name_en": "Broiler Chicken (Curry Cut)",
        "unit": "1 kg",
        "image": "🍗",
        "prices": {"chaldal": 320, "shwapno": 330, "meenaclick": 325, "khaasfood": 380, "daraz": 340},
    },
    {
        "id": "g-beef-1",
        "keywords": ["গরুর মাংস", "gorur mangsho", "beef", "cow meat", "মাংস", "goru"],
        "name_bn": "গরুর মাংস (বোনলেস)",
        "name_en": "Beef (Boneless)",
        "unit": "1 kg",
        "image": "🥩",
        "prices": {"chaldal": 750, "shwapno": 780, "meenaclick": 760, "khaasfood": 850, "daraz": 790},
    },
    {
        "id": "g-mutton-1",
        "keywords": ["খাসি", "khasi", "mutton", "goat meat", "patha", "মাংস"],
        "name_bn": "খাসির মাংস",
        "name_en": "Mutton (Goat Meat)",
        "unit": "1 kg",
        "image": "🍖",
        "prices": {"chaldal": 950, "shwapno": 980, "meenaclick": 960, "khaasfood": 1100, "daraz": 990},
    },
    {
        "id": "g-ilish-1",
        "keywords": ["ইলিশ", "ilish", "hilsa", "hilsa fish", "মাছ", "mach"],
        "name_bn": "ইলিশ মাছ (বরো সাইজ)",
        "name_en": "Hilsa Fish (Large)",
        "unit": "1 kg",
        "image": "🐟",
        "prices": {"chaldal": 1200, "shwapno": 1250, "meenaclick": 1220, "khaasfood": 1400, "daraz": 1280},
    },
    {
        "id": "g-rui-1",
        "keywords": ["রুই", "rui", "rohu", "rui fish", "মাছ", "mach"],
        "name_bn": "রুই মাছ (কাটা)",
        "name_en": "Rohu Fish (Curry Cut)",
        "unit": "1 kg",
        "image": "🐟",
        "prices": {"chaldal": 380, "shwapno": 395, "meenaclick": 385, "khaasfood": 450, "daraz": 400},
    },
    {
        "id": "g-tilapia-1",
        "keywords": ["তেলাপিয়া", "tilapia", "tilapia fish", "মাছ", "mach"],
        "name_bn": "তেলাপিয়া মাছ",
        "name_en": "Tilapia Fish",
        "unit": "1 kg",
        "image": "🐟",
        "prices": {"chaldal": 280, "shwapno": 290, "meenaclick": 285, "khaasfood": 320, "daraz": 295},
    },
    # ── Vegetables ──
    {
        "id": "g-alu-1",
        "keywords": ["আলু", "alu", "potato", "alu vorta", "aloo"],
        "name_bn": "আলু (দেশি)",
        "name_en": "Potato (Local)",
        "unit": "1 kg",
        "image": "🥔",
        "prices": {"chaldal": 45, "shwapno": 48, "meenaclick": 46, "khaasfood": 55, "daraz": 50},
    },
    {
        "id": "g-tomato-1",
        "keywords": ["টমেটো", "tomato", "tometo", "টমেটোর চাটনি"],
        "name_bn": "টমেটো",
        "name_en": "Tomato",
        "unit": "500 g",
        "image": "🍅",
        "prices": {"chaldal": 35, "shwapno": 38, "meenaclick": 36, "khaasfood": 45, "daraz": 40},
    },
    {
        "id": "g-gajor-1",
        "keywords": ["গাজর", "gajor", "carrot"],
        "name_bn": "গাজর",
        "name_en": "Carrot",
        "unit": "500 g",
        "image": "🥕",
        "prices": {"chaldal": 30, "shwapno": 32, "meenaclick": 31, "khaasfood": 40, "daraz": 35},
    },
    {
        "id": "g-begun-1",
        "keywords": ["বেগুন", "begun", "eggplant", "brinjal"],
        "name_bn": "বেগুন",
        "name_en": "Eggplant (Brinjal)",
        "unit": "500 g",
        "image": "🍆",
        "prices": {"chaldal": 35, "shwapno": 38, "meenaclick": 36, "khaasfood": 45, "daraz": 40},
    },
    {
        "id": "g-fulkopi-1",
        "keywords": ["ফুলকপি", "fulkopi", "cauliflower"],
        "name_bn": "ফুলকপি",
        "name_en": "Cauliflower",
        "unit": "1 pc",
        "image": "🥦",
        "prices": {"chaldal": 45, "shwapno": 50, "meenaclick": 48, "khaasfood": 60, "daraz": 52},
    },
    {
        "id": "g-palong-1",
        "keywords": ["পালং শাক", "palong shak", "spinach", "palong", "শাক", "shak"],
        "name_bn": "পালং শাক",
        "name_en": "Spinach (Palong Shak)",
        "unit": "1 bunch",
        "image": "🥬",
        "prices": {"chaldal": 20, "shwapno": 22, "meenaclick": 21, "khaasfood": 28, "daraz": 24},
    },
    {
        "id": "g-lal-shak-1",
        "keywords": ["লাল শাক", "lal shak", "red amaranth", "lal shak", "শাক", "shak"],
        "name_bn": "লাল শাক",
        "name_en": "Red Amaranth (Lal Shak)",
        "unit": "1 bunch",
        "image": "🥬",
        "prices": {"chaldal": 18, "shwapno": 20, "meenaclick": 19, "khaasfood": 25, "daraz": 22},
    },
    {
        "id": "g-piyaj-1",
        "keywords": ["পেঁয়াজ", "peyaj", "onion", "piyaj", "peyaj bhorta"],
        "name_bn": "পেঁয়াজ (দেশি)",
        "name_en": "Onion (Local)",
        "unit": "1 kg",
        "image": "🧅",
        "prices": {"chaldal": 55, "shwapno": 58, "meenaclick": 56, "khaasfood": 65, "daraz": 60},
    },
    {
        "id": "g-rosun-1",
        "keywords": ["রসুন", "rosun", "garlic"],
        "name_bn": "রসুন (দেশি)",
        "name_en": "Garlic (Local)",
        "unit": "250 g",
        "image": "🧄",
        "prices": {"chaldal": 65, "shwapno": 70, "meenaclick": 68, "khaasfood": 80, "daraz": 72},
    },
    # ── Dairy ──
    {
        "id": "g-dudh-1",
        "keywords": ["দুধ", "dudh", "milk", "liquid milk", "doodh"],
        "name_bn": "তরল দুধ (ফুল ক্রিম)",
        "name_en": "Liquid Milk (Full Cream)",
        "unit": "1 L",
        "image": "🥛",
        "prices": {"chaldal": 95, "shwapno": 98, "meenaclick": 96, "khaasfood": 110, "daraz": 100},
    },
    {
        "id": "g-doi-1",
        "keywords": ["দই", "doi", "yogurt", "curd", "yoghurt", "mishti doi"],
        "name_bn": "টক দই",
        "name_en": "Sour Yogurt",
        "unit": "500 g",
        "image": "🥣",
        "prices": {"chaldal": 85, "shwapno": 90, "meenaclick": 88, "khaasfood": 100, "daraz": 92},
    },
    {
        "id": "g-ghee-1",
        "keywords": ["ঘি", "ghi", "ghee", "clarified butter"],
        "name_bn": "খাঁটি ঘি",
        "name_en": "Pure Ghee",
        "unit": "200 g",
        "image": "🧈",
        "prices": {"chaldal": 280, "shwapno": 290, "meenaclick": 285, "khaasfood": 320, "daraz": 295},
    },
    # ── Fruits ──
    {
        "id": "g-kola-1",
        "keywords": ["কলা", "kola", "banana", "কলার বরা"],
        "name_bn": "সাগর কলা",
        "name_en": "Banana (Sagar)",
        "unit": "4 pcs",
        "image": "🍌",
        "prices": {"chaldal": 35, "shwapno": 38, "meenaclick": 36, "khaasfood": 45, "daraz": 40},
    },
    {
        "id": "g-apple-1",
        "keywords": ["আপেল", "apel", "apple"],
        "name_bn": "আপেল (ইম্পোর্টেড)",
        "name_en": "Apple (Imported)",
        "unit": "4 pcs",
        "image": "🍎",
        "prices": {"chaldal": 180, "shwapno": 190, "meenaclick": 185, "khaasfood": 220, "daraz": 195},
    },
    {
        "id": "g-komola-1",
        "keywords": ["কমলা", "komola", "orange"],
        "name_bn": "মাল্টা / কমলা",
        "name_en": "Orange / Malta",
        "unit": "1 kg",
        "image": "🍊",
        "prices": {"chaldal": 150, "shwapno": 160, "meenaclick": 155, "khaasfood": 180, "daraz": 165},
    },
    {
        "id": "g-peyara-1",
        "keywords": ["পেয়ারা", "peyara", "guava"],
        "name_bn": "পেয়ারা",
        "name_en": "Guava",
        "unit": "1 kg",
        "image": "🍐",
        "prices": {"chaldal": 90, "shwapno": 95, "meenaclick": 92, "khaasfood": 110, "daraz": 98},
    },
    {
        "id": "g-aam-1",
        "keywords": ["আম", "am", "mango"],
        "name_bn": "হিমসাগর আম",
        "name_en": "Mango (Himsagor)",
        "unit": "1 kg",
        "image": "🥭",
        "prices": {"chaldal": 250, "shwapno": 280, "meenaclick": 260, "khaasfood": 320, "daraz": 270},
    },
    # ── Oils & Spices ──
    {
        "id": "g-soyabin-tel-1",
        "keywords": ["তেল", "tel", "oil", "soybean oil", "soyabin tel", "cooking oil"],
        "name_bn": "সয়াবিন তেল",
        "name_en": "Soybean Oil",
        "unit": "1 L",
        "image": "🫒",
        "prices": {"chaldal": 165, "shwapno": 170, "meenaclick": 168, "khaasfood": 185, "daraz": 175},
    },
    {
        "id": "g-holud-1",
        "keywords": ["হলুদ", "holud", "turmeric", "turmeric powder"],
        "name_bn": "হলুদ গুঁড়া",
        "name_en": "Turmeric Powder",
        "unit": "100 g",
        "image": "🟡",
        "prices": {"chaldal": 55, "shwapno": 58, "meenaclick": 56, "khaasfood": 70, "daraz": 60},
    },
    {
        "id": "g-morich-1",
        "keywords": ["মরিচ", "morich", "chili", "chilli powder", "chili powder"],
        "name_bn": "লাল মরিচ গুঁড়া",
        "name_en": "Red Chili Powder",
        "unit": "100 g",
        "image": "🌶️",
        "prices": {"chaldal": 65, "shwapno": 68, "meenaclick": 66, "khaasfood": 80, "daraz": 70},
    },
    {
        "id": "g-garam-masala-1",
        "keywords": ["গরম মসলা", "garam masala", "garam masala powder"],
        "name_bn": "গরম মসলা",
        "name_en": "Garam Masala",
        "unit": "50 g",
        "image": "🌶️",
        "prices": {"chaldal": 45, "shwapno": 48, "meenaclick": 46, "khaasfood": 60, "daraz": 50},
    },
    # ── Nuts & Seeds ──
    {
        "id": "g-badam-1",
        "keywords": ["বাদাম", "badam", "almond", "nuts", "peanut"],
        "name_bn": "কাঁচা বাদাম",
        "name_en": "Raw Almonds",
        "unit": "250 g",
        "image": "🥜",
        "prices": {"chaldal": 320, "shwapno": 340, "meenaclick": 330, "khaasfood": 380, "daraz": 350},
    },
    {
        "id": "g-kaju-1",
        "keywords": ["কাজু", "kaju", "cashew", "cashew nut"],
        "name_bn": "কাজু বাদাম",
        "name_en": "Cashew Nuts",
        "unit": "200 g",
        "image": "🥜",
        "prices": {"chaldal": 380, "shwapno": 400, "meenaclick": 390, "khaasfood": 450, "daraz": 410},
    },
]


def search_grocery_items(query: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Search grocery catalog by keyword (BN or EN). Returns best matches."""
    query_lower = query.lower().strip()
    results = []
    for item in GROCERY_ITEMS:
        score = 0
        for kw in item["keywords"]:
            if query_lower == kw.lower():
                score = 100
                break
            elif query_lower in kw.lower() or kw.lower() in query_lower:
                score = max(score, 50)
        if score > 0:
            results.append({"item": item, "score": score})
    results.sort(key=lambda x: x["score"], reverse=True)
    return [r["item"] for r in results[:limit]]


def get_grocery_suggestions(food_names: List[str], limit_per_food: int = 2) -> List[Dict[str, Any]]:
    """Given a list of food names, return grocery suggestions with prices for each."""
    suggestions = []
    seen_ids = set()
    for name in food_names:
        matches = search_grocery_items(name, limit=limit_per_food)
        for m in matches:
            if m["id"] not in seen_ids:
                seen_ids.add(m["id"])
                suggestions.append(m)
    return suggestions
