"""Static grocery shop/dark-store locations across major Bangladeshi cities.
Used for nearest-shop lookup via Haversine distance."""

from typing import List, Dict, Any
import math

SHOPS: List[Dict[str, Any]] = [
    # ── Dhaka ──
    {"id": "chaldal-dhk-1", "platform": "chaldal", "name": "Chaldal Dhanmondi Hub", "lat": 23.7461, "lng": 90.3742, "area": "Dhanmondi", "city": "Dhaka"},
    {"id": "chaldal-dhk-2", "platform": "chaldal", "name": "Chaldal Gulshan Hub", "lat": 23.7937, "lng": 90.4066, "area": "Gulshan", "city": "Dhaka"},
    {"id": "chaldal-dhk-3", "platform": "chaldal", "name": "Chaldal Mohammadpur Hub", "lat": 23.7646, "lng": 90.3530, "area": "Mohammadpur", "city": "Dhaka"},
    {"id": "chaldal-dhk-4", "platform": "chaldal", "name": "Chaldal Uttara Hub", "lat": 23.8759, "lng": 90.3795, "area": "Uttara", "city": "Dhaka"},
    {"id": "chaldal-dhk-5", "platform": "chaldal", "name": "Chaldal Mirpur Hub", "lat": 23.8103, "lng": 90.4125, "area": "Mirpur", "city": "Dhaka"},
    {"id": "chaldal-dhk-6", "platform": "chaldal", "name": "Chaldal Banani Hub", "lat": 23.7933, "lng": 90.4008, "area": "Banani", "city": "Dhaka"},

    {"id": "shwapno-dhk-1", "platform": "shwapno", "name": "Shwapno Dhanmondi", "lat": 23.7425, "lng": 90.3820, "area": "Dhanmondi", "city": "Dhaka"},
    {"id": "shwapno-dhk-2", "platform": "shwapno", "name": "Shwapno Gulshan", "lat": 23.7890, "lng": 90.4160, "area": "Gulshan", "city": "Dhaka"},
    {"id": "shwapno-dhk-3", "platform": "shwapno", "name": "Shwapno Mirpur", "lat": 23.8060, "lng": 90.3675, "area": "Mirpur", "city": "Dhaka"},
    {"id": "shwapno-dhk-4", "platform": "shwapno", "name": "Shwapno Uttara", "lat": 23.8720, "lng": 90.3880, "area": "Uttara", "city": "Dhaka"},
    {"id": "shwapno-dhk-5", "platform": "shwapno", "name": "Shwapno Bashundhara", "lat": 23.8195, "lng": 90.4380, "area": "Bashundhara", "city": "Dhaka"},

    {"id": "meenaclick-dhk-1", "platform": "meenaclick", "name": "Meena Click Mohakhali", "lat": 23.7778, "lng": 90.4056, "area": "Mohakhali", "city": "Dhaka"},
    {"id": "meenaclick-dhk-2", "platform": "meenaclick", "name": "Meena Click Malibagh", "lat": 23.7490, "lng": 90.4120, "area": "Malibagh", "city": "Dhaka"},
    {"id": "meenaclick-dhk-3", "platform": "meenaclick", "name": "Meena Click Jatrabari", "lat": 23.7100, "lng": 90.4350, "area": "Jatrabari", "city": "Dhaka"},

    {"id": "khaasfood-dhk-1", "platform": "khaasfood", "name": "Khaas Food Farm (Savar)", "lat": 23.8483, "lng": 90.2556, "area": "Savar", "city": "Dhaka"},
    {"id": "khaasfood-dhk-2", "platform": "khaasfood", "name": "Khaas Food Warehouse", "lat": 23.7920, "lng": 90.3520, "area": "Mohammadpur", "city": "Dhaka"},

    # ── Chittagong ──
    {"id": "chaldal-ctg-1", "platform": "chaldal", "name": "Chaldal Chittagong Hub", "lat": 22.3569, "lng": 91.7832, "area": "Agrabad", "city": "Chittagong"},
    {"id": "shwapno-ctg-1", "platform": "shwapno", "name": "Shwapno Chittagong", "lat": 22.3645, "lng": 91.7900, "area": "GEC", "city": "Chittagong"},
    {"id": "meenaclick-ctg-1", "platform": "meenaclick", "name": "Meena Click CTG", "lat": 22.3500, "lng": 91.8000, "area": "Nasirabad", "city": "Chittagong"},

    # ── Sylhet ──
    {"id": "chaldal-syl-1", "platform": "chaldal", "name": "Chaldal Sylhet Hub", "lat": 24.8949, "lng": 91.8687, "area": "Zindabazar", "city": "Sylhet"},
    {"id": "shwapno-syl-1", "platform": "shwapno", "name": "Shwapno Sylhet", "lat": 24.9000, "lng": 91.8750, "area": "Ambarkhana", "city": "Sylhet"},

    # ── Khulna ──
    {"id": "chaldal-khl-1", "platform": "chaldal", "name": "Chaldal Khulna Hub", "lat": 22.8456, "lng": 89.5403, "area": "Sonadanga", "city": "Khulna"},
    {"id": "shwapno-khl-1", "platform": "shwapno", "name": "Shwapno Khulna", "lat": 22.8500, "lng": 89.5500, "area": "Daulatpur", "city": "Khulna"},

    # ── Rajshahi ──
    {"id": "chaldal-raj-1", "platform": "chaldal", "name": "Chaldal Rajshahi Hub", "lat": 24.3745, "lng": 88.6042, "area": "Shaheb Bazar", "city": "Rajshahi"},
    {"id": "shwapno-raj-1", "platform": "shwapno", "name": "Shwapno Rajshahi", "lat": 24.3800, "lng": 88.6100, "area": "Boalia", "city": "Rajshahi"},

    # ── Barishal ──
    {"id": "chaldal-bar-1", "platform": "chaldal", "name": "Chaldal Barishal Hub", "lat": 22.7010, "lng": 90.3535, "area": "Natullabad", "city": "Barishal"},
]


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in km between two lat/lng points."""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# Platform metadata for logo/colour display
PLATFORM_META: Dict[str, Dict[str, str]] = {
    "chaldal":    {"logo": "🥬", "color": "#16a34a"},
    "shwapno":    {"logo": "🏪", "color": "#ea580c"},
    "meenaclick": {"logo": "🖱️", "color": "#db2777"},
    "khaasfood":  {"logo": "🌿", "color": "#65a30d"},
    "daraz":      {"logo": "📦", "color": "#f97316"},
}


def get_nearby_shops(user_lat: float, user_lng: float, radius_km: float = 15.0, limit: int = 8) -> List[Dict[str, Any]]:
    """Return shops sorted by distance from user location."""
    results = []
    for shop in SHOPS:
        dist = _haversine(user_lat, user_lng, shop["lat"], shop["lng"])
        if dist <= radius_km:
            meta = PLATFORM_META.get(shop["platform"], {})
            results.append({**shop, "distance_km": round(dist, 2), **meta})
    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]


def get_shops_by_platform(user_lat: float, user_lng: float, platform: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Return nearest shops for a specific platform."""
    results = []
    for shop in SHOPS:
        if shop["platform"] == platform:
            dist = _haversine(user_lat, user_lng, shop["lat"], shop["lng"])
            meta = PLATFORM_META.get(shop["platform"], {})
            results.append({**shop, "distance_km": round(dist, 2), **meta})
    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]
