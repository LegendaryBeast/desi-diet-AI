"""
utils_portion.py
Standard Bangladeshi nutritionist household measurement engine.
Converts raw food weights (grams/milliliters) into practical household measures
(বাটি, কাপ, টুকরা, টি, গ্লাস, চামচ, মুঠো) following guidelines from
BIRDEM, INFS Dhaka University, and the National Dietary Guidelines for Bangladesh.
"""

from typing import Dict, Any, List, Optional
import re


BN_DIGITS = {
    "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
    "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"
}


def to_bn_digits(num_val: Any) -> str:
    """Convert integer, float, or string numbers to Bengali numerals (e.g. 150 -> ১৫০, 1.5 -> ১.৫)."""
    s = str(num_val)
    out = []
    for ch in s:
        out.append(BN_DIGITS.get(ch, ch))
    return "".join(out)


def compute_household_measure(
    name_bn: Optional[str] = "",
    name_en: Optional[str] = "",
    food_group: Optional[str] = "",
    amount_g: Optional[float] = 100.0,
) -> Dict[str, str]:
    """
    Compute authentic Bangladeshi nutritionist household portion measures for a food item.
    Returns:
    {
        "portion_bn": "১ কাপ (১৩০ গ্রাম)",
        "portion_en": "1 cup (130g)",
        "household_measure_bn": "১ কাপ",
        "household_measure_en": "1 cup"
    }
    """
    amt = float(amount_g or 100.0)
    amt_rounded = round(amt)
    amt_bn = to_bn_digits(amt_rounded)
    
    nb = (name_bn or "").lower()
    ne = (name_en or "").lower()
    fg = (food_group or "").lower()
    
    # Liquid check: only for beverage/soup/liquid dairy items
    liquid_keywords_en = ["milk", "water", "juice", "soup", "buttermilk", "ghol", "matha", "tea", "coffee"]
    liquid_keywords_bn = ["দুধ", "পানি", "জুস", "সুপ", "ঘোল", "মাঠা", "চা", "কফি", "ডাবের পানি"]
    is_liquid = (
        any(k in ne for k in liquid_keywords_en) or
        any(k in nb for k in liquid_keywords_bn)
    ) and not any(k in nb or k in ne for k in ["ভাত", "চাল", "rice", "রুটি", "roti", "মাংস", "meat", "curry", "তরকারি", "সবজি", "শাক"])

    unit_bn = "মিলি" if is_liquid else "গ্রাম"
    unit_en = "ml" if is_liquid else "g"

    h_bn = ""
    h_en = ""

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Rice Staples (ভাত, চাল, খিচুড়ি, পোলাও, বিরিয়ানি)
    # ──────────────────────────────────────────────────────────────────────────
    if any(k in nb or k in ne for k in ["ভাত", "bhat", "rice", "চাল", "khichuri", "খিচুড়ি", "polao", "পোলাও", "biryani", "বিরিয়ানি"]) and not any(k in nb or k in ne for k in ["muri", "মুড়ি", "chira", "চিড়া", "khoi", "খই"]):
        if amt <= 90:
            h_bn, h_en = "১/২ কাপ", "1/2 cup"
        elif amt <= 140:
            h_bn, h_en = "১ কাপ", "1 cup"
        elif amt <= 190:
            h_bn, h_en = "১ মাঝারি বাটি", "1 medium bowl"
        elif amt <= 260:
            h_bn, h_en = "১ বড় বাটি (১.৫ কাপ)", "1 large bowl (1.5 cups)"
        else:
            h_bn, h_en = "২ কাপ", "2 cups"

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Flatbreads (রুটি, চাপটি, পরোটা, নান)
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in nb or k in ne for k in ["রুটি", "roti", "ruti", "chapati", "চাপাতি", "paratha", "পরোটা", "naan", "নান"]):
        if amt <= 45:
            h_bn, h_en = "১টি", "1 pc"
        elif amt <= 85:
            h_bn, h_en = "২টি", "2 pcs"
        elif amt <= 125:
            h_bn, h_en = "৩টি", "3 pcs"
        else:
            cnt = max(1, round(amt / 35))
            h_bn, h_en = f"{to_bn_digits(cnt)}টি", f"{cnt} pcs"

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Puffed / Flaked Rice, Oats, Suji, Bread (মুড়ি, চিড়া, ওটস, সুজি, পাউরুটি)
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in nb or k in ne for k in ["মুড়ি", "muri", "puffed rice"]):
        if amt <= 35:
            h_bn, h_en = "১ কাপ", "1 cup"
        else:
            h_bn, h_en = "২ কাপ", "2 cups"

    elif any(k in nb or k in ne for k in ["চিড়া", "chira", "flattened rice", "flaked rice"]):
        if amt <= 50:
            h_bn, h_en = "১/২ কাপ", "1/2 cup"
        else:
            h_bn, h_en = "১ কাপ", "1 cup"

    elif any(k in nb or k in ne for k in ["খই", "khoi", "popped rice"]):
        h_bn, h_en = "১ মুষ্টি", "1 handful"

    elif any(k in nb or k in ne for k in ["oats", "ওটস", "suji", "সুজি", "semai", "সেমাই", "semolina"]):
        if amt <= 40:
            h_bn, h_en = "৩-৪ টেবিল চামচ", "3-4 tbsp"
        elif amt <= 85:
            h_bn, h_en = "১/২ কাপ", "1/2 cup"
        else:
            h_bn, h_en = "১ কাপ", "1 cup"

    elif any(k in nb or k in ne for k in ["পাউরুটি", "bread", "toast", "টোস্ট", "স্যান্ডউইচ"]):
        if amt <= 35:
            h_bn, h_en = "১ স্লাইস", "1 slice"
        elif amt <= 75:
            h_bn, h_en = "২ স্লাইস", "2 slices"
        else:
            cnt = max(1, round(amt / 35))
            h_bn, h_en = f"{to_bn_digits(cnt)} স্লাইস", f"{cnt} slices"

    # ──────────────────────────────────────────────────────────────────────────
    # 4. Eggs (ডিম)
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in nb or k in ne for k in ["ডিম", "egg"]) or "egg" in fg:
        is_white_only = any(k in nb or k in ne for k in ["সাদা", "white"])
        if is_white_only:
            if amt <= 45:
                h_bn, h_en = "১টি ডিমের সাদা অংশ", "1 egg white"
            else:
                h_bn, h_en = "২টি ডিমের সাদা অংশ", "2 egg whites"
        else:
            if amt <= 65:
                h_bn, h_en = "১টি সিদ্ধ ডিম", "1 boiled egg"
            elif amt <= 120:
                h_bn, h_en = "২টি ডিম", "2 eggs"
            else:
                cnt = max(1, round(amt / 55))
                h_bn, h_en = f"{to_bn_digits(cnt)}টি ডিম", f"{cnt} eggs"

    # ──────────────────────────────────────────────────────────────────────────
    # 5. Fish (মাছ)
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in nb or k in ne for k in ["মাছ", "fish", "ইলিশ", "রুই", "কাতলা", "তেলাপিয়া", "শিং", "মাগুর", "পাঙ্গাশ", "বোয়াল", "কৈ", "পাবদা", "চিংড়ি", "prawn", "shrimp"]) or "fish" in fg:
        is_small_fish = any(k in nb or k in ne for k in ["ছোট মাছ", "মলা", "ঢেলা", "কাঁচকি", "কেচকি", "small fish", "choto mach"])
        if is_small_fish:
            if amt <= 60:
                h_bn, h_en = "১/২ বাটি ছোট মাছ", "1/2 bowl small fish"
            else:
                h_bn, h_en = "১ ছোট বাটি ছোট মাছের চচ্চড়ি", "1 small bowl small fish"
        else:
            if amt <= 75:
                h_bn, h_en = "১ টুকরা মাঝারি মাছ", "1 medium piece fish"
            elif amt <= 140:
                h_bn, h_en = "২ টুকরা মাছ", "2 pieces fish"
            else:
                cnt = max(1, round(amt / 65))
                h_bn, h_en = f"{to_bn_digits(cnt)} টুকরা মাছ", f"{cnt} pieces fish"

    # ──────────────────────────────────────────────────────────────────────────
    # 6. Meat & Poultry (মুরগি, গরু, খাসি)
    # ──────────────────────────────────────────────────────────────────────────
    elif (
        any(k in nb or k in ne for k in ["মুরগি", "chicken", "মাংস", "meat", "গরুর মাংস", "beef", "খাসি", "mutton", "duck", "হাঁস"]) or
        ("গরু" in nb and "দুধ" not in nb) or
        any(k in fg for k in ["meat", "poultry"])
    ) and not any(k in nb or k in ne for k in ["দুধ", "milk", "ঘোল", "মাঠা", "দই", "ছানা"]):
        if any(k in nb or k in ne for k in ["breast", "ব্রেস্ট"]):
            h_bn, h_en = "১টি চিকেন ব্রেস্ট", "1 chicken breast piece"
        elif amt <= 55:
            h_bn, h_en = "১ টুকরা মাঝারি মাংস", "1 medium piece meat"
        elif amt <= 100:
            h_bn, h_en = "১-২ টুকরা মাংস", "1-2 pieces meat"
        elif amt <= 160:
            h_bn, h_en = "২-৩ টুকরা মাংস", "2-3 pieces meat"
        else:
            cnt = max(1, round(amt / 55))
            h_bn, h_en = f"{to_bn_digits(cnt)} টুকরা মাংস", f"{cnt} pieces meat"

    # ──────────────────────────────────────────────────────────────────────────
    # 7. Pulses & Legumes (ডাল, ছোলা, বুট, মটর)
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in nb or k in ne for k in ["ডাল", "dal", "lentil", "ছোলা", "chola", "chickpea", "বুট", "মটর", "peas", "শিম"]) or any(k in fg for k in ["pulse", "legume"]):
        is_chola = any(k in nb or k in ne for k in ["ছোলা", "chola", "chickpea", "বুট", "মটর"])
        if is_chola:
            if amt <= 45:
                h_bn, h_en = "২ টেবিল চামচ", "2 tbsp"
            elif amt <= 85:
                h_bn, h_en = "১/২ কাপ সিদ্ধ ছোলা", "1/2 cup boiled chickpeas"
            else:
                h_bn, h_en = "১ কাপ সিদ্ধ ছোলা", "1 cup boiled chickpeas"
        else:
            # Liquid dal soup
            if amt <= 90:
                h_bn, h_en = "১/২ কাপ ডাল", "1/2 cup dal"
            elif amt <= 150:
                h_bn, h_en = "১ ছোট বাটি ঘন ডাল", "1 small bowl thick dal"
            else:
                h_bn, h_en = "১ মাঝারি বাটি ডাল", "1 medium bowl dal"

    # ──────────────────────────────────────────────────────────────────────────
    # 8. Leafy Greens & Vegetables (শাক, সবজি, সালাদ)
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in nb or k in ne for k in ["শাক", "shak", "spinach", "palong", "lal shak", "leafy"]) or "leafy" in fg:
        if amt <= 65:
            h_bn, h_en = "১/২ বাটি শাক ভাজি", "1/2 bowl cooked greens"
        else:
            h_bn, h_en = "১ ছোট বাটি শাক ভাজি", "1 small bowl cooked greens"

    elif any(k in nb or k in ne for k in ["সালাদ", "salad", "শসা", "cucumber", "টমেটো", "tomato"]) and not any(k in nb or k in ne for k in ["curry", "তরকারি", "ঝোল"]):
        if amt <= 85:
            h_bn, h_en = "১ ছোট বাটি সালাদ", "1 small bowl salad"
        else:
            h_bn, h_en = "১ মাঝারি বাটি সালাদ", "1 medium bowl salad"

    elif any(k in fg for k in ["vegetable", "tubers"]) or any(k in nb or k in ne for k in ["সবজি", "sobji", "vegetable", "লাউ", "lau", "পেঁপে", "papaya", "পটোল", "পটল", "করলা", "korola", "ঝিঙে", "বেগুন", "ফুলকপি", "বাঁধাকপি", "ঢেঁড়স", "ভেন্ডি", "কুমড়া", "মিষ্টি কুমড়া"]):
        if amt <= 70:
            h_bn, h_en = "১/২ বাটি সবজি", "1/2 bowl vegetables"
        elif amt <= 130:
            h_bn, h_en = "১ ছোট বাটি সবজি", "1 small bowl vegetables"
        elif amt <= 220:
            h_bn, h_en = "১ মাঝারি বাটি সবজি", "1 medium bowl vegetables"
        else:
            h_bn, h_en = "১ বড় বাটি সবজি", "1 large bowl vegetables"

    # ──────────────────────────────────────────────────────────────────────────
    # 9. Milk & Dairy (দুধ, টক দই, ছানা, ঘোল)
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in nb or k in ne for k in ["দই", "doi", "yogurt", "curd"]):
        if amt <= 85:
            h_bn, h_en = "১/২ কাপ টক দই", "1/2 cup yogurt"
        elif amt <= 180:
            h_bn, h_en = "১ কাপ টক দই", "1 cup yogurt"
        else:
            h_bn, h_en = "১.৫ কাপ টক দই", "1.5 cups yogurt"

    elif any(k in nb or k in ne for k in ["ছানা", "chhana", "paneer", "পনির", "cheese"]):
        if amt <= 40:
            h_bn, h_en = "২ টেবিল চামচ ছানা", "2 tbsp cottage cheese"
        else:
            h_bn, h_en = "১/৪ কাপ ছানা", "1/4 cup cottage cheese"

    elif any(k in nb or k in ne for k in ["দুধ", "milk", "ঘোল", "মাঠা", "buttermilk", "ghol"]) or "milk" in fg:
        if amt <= 140:
            h_bn, h_en = "১/২ গ্লাস দুধ", "1/2 glass milk"
        elif amt <= 260:
            h_bn, h_en = "১ গ্লাস দুধ", "1 glass milk"
        else:
            h_bn, h_en = "১ বড় গ্লাস দুধ", "1 large glass milk"

    # ──────────────────────────────────────────────────────────────────────────
    # 10. Fruits (ফলমূল)
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in nb or k in ne for k in ["কলা", "banana", "kola"]):
        if amt <= 85:
            h_bn, h_en = "১টি ছোট কলা", "1 small banana"
        else:
            h_bn, h_en = "১টি মাঝারি কলা", "1 medium banana"

    elif any(k in nb or k in ne for k in ["আপেল", "apple", "পেয়ারা", "guava", "কমলা", "orange", "মাল্টা", "malta", "নাশপাতি"]):
        if amt <= 90:
            h_bn, h_en = "১টি ছোট", "1 small piece"
        elif amt <= 160:
            h_bn, h_en = "১টি মাঝারি", "1 medium piece"
        else:
            h_bn, h_en = "১-২টি", "1-2 pieces"

    elif any(k in nb or k in ne for k in ["তরমুজ", "watermelon", "পেঁপে", "papaya", "আনারস", "pineapple", "বাঙ্গি"]):
        if amt <= 85:
            h_bn, h_en = "১-২ ফালি", "1-2 slices"
        elif amt <= 160:
            h_bn, h_en = "১ কাপ কিউব", "1 cup cubed"
        else:
            h_bn, h_en = "১ বাটি কিউব", "1 bowl cubed"

    elif any(k in nb or k in ne for k in ["খেজুর", "date", "khejur"]):
        if amt <= 18:
            h_bn, h_en = "১-২টি খেজুর", "1-2 dates"
        else:
            h_bn, h_en = "৩-৪টি খেজুর", "3-4 dates"

    elif any(k in nb or k in ne for k in ["লেবু", "lemon", "lime"]):
        h_bn, h_en = "১ ফালি লেবু", "1 lemon wedge"

    elif "fruit" in fg:
        if amt <= 90:
            h_bn, h_en = "১টি ছোট ফল", "1 small fruit"
        elif amt <= 160:
            h_bn, h_en = "১টি মাঝারি ফল / ১ কাপ", "1 medium fruit / 1 cup"
        else:
            h_bn, h_en = "১ বাটি ফল", "1 bowl fruit"

    # ──────────────────────────────────────────────────────────────────────────
    # 11. Oils, Ghee, Nuts & Seeds (তেল, ঘি, বাদাম, বীজ)
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in nb or k in ne for k in ["তেল", "oil", "ঘি", "ghee", "মাখন", "butter"]) or "oil" in fg or "fat" in fg:
        if amt <= 6:
            h_bn, h_en = "১ চা চামচ", "1 tsp"
        elif amt <= 12:
            h_bn, h_en = "২ চা চামচ", "2 tsp"
        else:
            h_bn, h_en = "১ টেবিল চামচ", "1 tbsp"

    elif any(k in nb or k in ne for k in ["চিয়া", "chia", "তিসি", "flax", "ইসবগুল", "isabgol", "বীজ", "seed"]):
        if amt <= 7:
            h_bn, h_en = "১ চা চামচ", "1 tsp"
        elif amt <= 15:
            h_bn, h_en = "১ টেবিল চামচ", "1 tbsp"
        else:
            h_bn, h_en = "২ টেবিল চামচ", "2 tbsp"

    elif any(k in nb or k in ne for k in ["বাদাম", "nut", "almond", "walnut", "কাঠবাদাম", "কাজুবাদাম", "চিনাবাদাম"]):
        if amt <= 15:
            h_bn, h_en = "৪-৫টি বাদাম", "4-5 nuts"
        else:
            h_bn, h_en = "১ মুঠো বাদাম", "1 small handful nuts"

    # ──────────────────────────────────────────────────────────────────────────
    # 12. Generic Fallback
    # ──────────────────────────────────────────────────────────────────────────
    else:
        if amt <= 50:
            h_bn, h_en = "২ টেবিল চামচ", "2 tbsp"
        elif amt <= 120:
            h_bn, h_en = "১/২ কাপ বা ১ ছোট বাটি", "1/2 cup or 1 small bowl"
        elif amt <= 220:
            h_bn, h_en = "১ কাপ বা ১ মাঝারি বাটি", "1 cup or 1 medium bowl"
        else:
            h_bn, h_en = "১ বড় বাটি", "1 large bowl"

    # Compose full description: e.g. "১ কাপ (১৩০ গ্রাম)"
    portion_bn = f"{h_bn} ({amt_bn} {unit_bn})"
    portion_en = f"{h_en} ({amt_rounded}{unit_en})"

    return {
        "portion_bn": portion_bn,
        "portion_en": portion_en,
        "household_measure_bn": h_bn,
        "household_measure_en": h_en,
    }


def attach_household_measurements(plan_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Traverse a meal plan dictionary (daily or weekly plan) and ensure every item
    has portion_bn, portion_en, household_measure_bn, and household_measure_en attached.
    """
    if not plan_data:
        return plan_data

    # Check if this is a weekly wrapper { "weekly_plan": [...] }
    if "weekly_plan" in plan_data and isinstance(plan_data["weekly_plan"], list):
        for day_plan in plan_data["weekly_plan"]:
            attach_household_measurements(day_plan)
        return plan_data

    # Daily plan with "meals"
    meals = plan_data.get("meals", [])
    if isinstance(meals, list):
        for meal in meals:
            items = meal.get("items", [])
            if isinstance(items, list):
                for item in items:
                    name_bn = item.get("name_bn") or ""
                    name_en = item.get("name_en") or ""
                    food_group = item.get("food_group") or ""
                    amount_g = item.get("amount_g") or item.get("amount") or 100.0

                    try:
                        amt_num = float(amount_g)
                    except (ValueError, TypeError):
                        amt_num = 100.0

                    measures = compute_household_measure(
                        name_bn=name_bn,
                        name_en=name_en,
                        food_group=food_group,
                        amount_g=amt_num,
                    )
                    
                    # Attach or update fields
                    item["portion_bn"] = measures["portion_bn"]
                    item["portion_en"] = measures["portion_en"]
                    item["household_measure_bn"] = measures["household_measure_bn"]
                    item["household_measure_en"] = measures["household_measure_en"]

    return plan_data
