"""Grocery suggestion service — combines catalog pricing with nearest shop lookup."""

from typing import List, Dict, Any, Optional
from app.data.grocery_catalog import (
    PLATFORMS,
    GROCERY_ITEMS,
    search_grocery_items,
    get_grocery_suggestions,
)
from app.data.shop_locations import get_nearby_shops, get_shops_by_platform


def build_price_comparison(item: Dict[str, Any], user_lat: float, user_lng: float) -> Dict[str, Any]:
    """Build a full price-comparison card for a single grocery item."""
    prices = item.get("prices", {})
    platform_offers = []
    best_price = None
    best_platform = None

    for platform_id, price_bdt in prices.items():
        if platform_id not in PLATFORMS:
            continue
        meta = PLATFORMS[platform_id]
        shops = get_shops_by_platform(user_lat, user_lng, platform_id, limit=1)
        nearest_shop = shops[0] if shops else None

        offer = {
            "platform_id": platform_id,
            "platform_name": meta["name"],
            "platform_name_bn": meta["name_bn"],
            "logo": meta["logo"],
            "color": meta["color"],
            "url": meta["url"],
            "price_bdt": price_bdt,
            "delivery_time": meta["delivery_time"],
            "delivery_fee": meta["delivery_fee"],
            "nearest_shop": nearest_shop,
        }
        platform_offers.append(offer)

        if best_price is None or price_bdt < best_price:
            best_price = price_bdt
            best_platform = platform_id

    platform_offers.sort(key=lambda x: x["price_bdt"])

    return {
        "item_id": item["id"],
        "name_bn": item["name_bn"],
        "name_en": item["name_en"],
        "unit": item["unit"],
        "image": item.get("image", "🛒"),
        "best_price_bdt": best_price,
        "best_platform_id": best_platform,
        "offers": platform_offers,
    }


def suggest_groceries_for_foods(
    food_names: List[str],
    user_lat: float,
    user_lng: float,
    limit_per_food: int = 2,
) -> Dict[str, Any]:
    """
    Main entry point: given food names + user location,
    return grocery suggestions + nearest shops + price comparisons.
    """
    suggestions = get_grocery_suggestions(food_names, limit_per_food=limit_per_food)
    item_cards = []
    for item in suggestions:
        card = build_price_comparison(item, user_lat, user_lng)
        item_cards.append(card)

    # Get all nearby shops (deduplicated by platform for the map)
    nearby_shops = get_nearby_shops(user_lat, user_lng, radius_km=15.0, limit=10)

    # Summary stats
    total_savings = 0
    if len(item_cards) >= 2:
        for card in item_cards:
            offers = card.get("offers", [])
            if len(offers) >= 2:
                prices = [o["price_bdt"] for o in offers]
                total_savings += max(prices) - min(prices)

    return {
        "items": item_cards,
        "nearby_shops": nearby_shops,
        "total_items": len(item_cards),
        "potential_savings_bdt": round(total_savings, 0),
    }


def extract_food_names_from_text(text: str) -> List[str]:
    """Scan text against grocery catalog keywords and return all matched food names."""
    if not text:
        return []
    text_lower = text.lower()
    matched = set()
    for item in GROCERY_ITEMS:
        for kw in item["keywords"]:
            if kw.lower() in text_lower:
                matched.add(kw)
                break
    return list(matched)


def suggest_groceries_from_chat(
    chat_text: str,
    user_lat: Optional[float],
    user_lng: Optional[float],
    parsed_food_items: Optional[List[Dict[str, Any]]] = None,
    assistant_response: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Lightweight helper called from the chat router.
    Extracts food names from parsed meal items, chat text, OR the LLM response
    and returns suggestions. The assistant_response is the PRIMARY source so that
    grocery cards appear even when the user asks vague questions like 'what should I eat?'.
    """
    food_names = []

    # Priority 1: Foods explicitly mentioned by the AI in its response
    if assistant_response:
        food_names.extend(extract_food_names_from_text(assistant_response))

    # Priority 2: Parsed food items from meal logging
    if parsed_food_items:
        for item in parsed_food_items:
            name = item.get("name") or item.get("fallback_name") or item.get("query")
            if name:
                food_names.append(name)

    # Priority 3: User's original message (fallback)
    if not food_names and chat_text:
        food_names.extend(extract_food_names_from_text(chat_text))

    if not food_names:
        return None

    # Default to Dhaka center if no location provided
    lat = user_lat if user_lat is not None else 23.8103
    lng = user_lng if user_lng is not None else 90.4125

    return suggest_groceries_for_foods(food_names, lat, lng)
