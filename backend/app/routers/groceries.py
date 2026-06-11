"""Grocery suggestion & price-comparison routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.db import prisma
from app.services.grocery_service import suggest_groceries_for_foods, suggest_groceries_from_chat
from app.data.shop_locations import get_nearby_shops

router = APIRouter()


class TrackGroceryClickRequest(BaseModel):
    item_name: str
    platform: str
    price_bdt: Optional[float] = None
    chat_message_id: Optional[str] = None


@router.get("/search")
async def search_groceries(
    foods: str = Query(..., description="Comma-separated food names to search for"),
    lat: float = Query(23.8103, description="User latitude"),
    lng: float = Query(90.4125, description="User longitude"),
    limit: int = Query(2, ge=1, le=5),
    current_user=Depends(get_current_user),
):
    """Search grocery catalog for given food names and return price comparisons + nearest shops."""
    food_names = [f.strip() for f in foods.split(",") if f.strip()]
    if not food_names:
        raise HTTPException(status_code=400, detail="No food names provided")
    result = suggest_groceries_for_foods(food_names, lat, lng, limit_per_food=limit)
    return result


@router.get("/nearby-shops")
async def nearby_shops(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    radius: float = Query(15.0, ge=1, le=50),
    limit: int = Query(10, ge=1, le=20),
    current_user=Depends(get_current_user),
):
    """Return nearby grocery shops sorted by distance."""
    shops = get_nearby_shops(lat, lng, radius_km=radius, limit=limit)
    return {"shops": shops, "user_location": {"lat": lat, "lng": lng}}


@router.post("/from-chat")
async def groceries_from_chat(
    payload: dict,
    current_user=Depends(get_current_user),
):
    """
    Accept chat context + parsed food items and return grocery suggestions.
    Called internally by the chat SSE stream or frontend.
    """
    chat_text = payload.get("chat_text", "")
    parsed_items = payload.get("parsed_items", [])
    lat = payload.get("lat")
    lng = payload.get("lng")

    result = suggest_groceries_from_chat(chat_text, lat, lng, parsed_items)
    if result is None:
        return {"items": [], "nearby_shops": [], "total_items": 0}
    return result


@router.post("/track-click")
async def track_grocery_click(
    req: TrackGroceryClickRequest,
    current_user=Depends(get_current_user),
):
    """Track when a user clicks a grocery suggestion link."""
    suggestion = await prisma.grocerysuggestion.create(
        data={
            "userId": current_user.id,
            "chatMessageId": req.chat_message_id,
            "itemName": req.item_name,
            "platform": req.platform,
            "priceBDT": req.price_bdt,
        }
    )
    return {
        "success": True,
        "suggestion_id": suggestion.id,
        "item_name": suggestion.itemName,
        "platform": suggestion.platform,
    }


@router.post("/track-purchase/{suggestion_id}")
async def track_grocery_purchase(
    suggestion_id: str,
    current_user=Depends(get_current_user),
):
    """Mark a grocery suggestion as purchased."""
    from datetime import datetime, timezone
    suggestion = await prisma.grocerysuggestion.find_unique(
        where={"id": suggestion_id}
    )
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    if suggestion.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not your suggestion")
    
    updated = await prisma.grocerysuggestion.update(
        where={"id": suggestion_id},
        data={"purchasedAt": datetime.now(timezone.utc)},
    )
    return {"success": True, "purchased_at": updated.purchasedAt.isoformat() if updated.purchasedAt else None}
