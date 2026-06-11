"""Admin router for business dashboard — user analytics, subscriptions, token usage, grocery tracking."""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from app.db import prisma
from app.core.admin_auth import require_admin, verify_admin_password
from pydantic import BaseModel
import json

router = APIRouter(prefix="/admin-api", tags=["Admin Dashboard"])


# ─── DTOs ──────────────────────────────────────────────────────────

class AdminAuthRequest(BaseModel):
    password: str


class AdminAuthResponse(BaseModel):
    success: bool
    token: str
    expires_at: datetime


class UpdateTierRequest(BaseModel):
    tier: str  # free, basic, pro, premium


class TrackGroceryClickRequest(BaseModel):
    item_name: str
    platform: str
    price_bdt: Optional[float] = None
    chat_message_id: Optional[str] = None


class TrackGroceryPurchaseRequest(BaseModel):
    suggestion_id: str


# ─── Helpers ───────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _estimate_tokens(text: str) -> int:
    """Rough token estimation: ~4 chars per token."""
    return max(1, len(text) // 4)


# ─── Auth ──────────────────────────────────────────────────────────

@router.post("/auth", response_model=AdminAuthResponse)
async def admin_auth(req: AdminAuthRequest):
    """Validate admin password and return a session token."""
    if not await verify_admin_password(req.password):
        raise HTTPException(status_code=403, detail="Invalid admin password")
    
    expires = _now() + timedelta(hours=1)
    # Simple token = password itself (since it's hardcoded, session is just the password with expiry on frontend)
    return AdminAuthResponse(
        success=True,
        token=req.password,
        expires_at=expires,
    )


# ─── Overview / KPIs ───────────────────────────────────────────────

@router.get("/overview")
async def get_overview(admin=Depends(require_admin)):
    """Return dashboard KPIs."""
    now = _now()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    
    total_users = await prisma.user.count()
    new_users_7d = await prisma.user.count(where={"createdAt": {"gte": seven_days_ago}})
    new_users_30d = await prisma.user.count(where={"createdAt": {"gte": thirty_days_ago}})
    
    # Active subscriptions (status = active or trial)
    active_subs = await prisma.usersubscription.count(
        where={"status": {"in": ["active", "trial"]}}
    )
    
    # MRR calculation
    subs = await prisma.usersubscription.find_many(
        where={"status": {"in": ["active", "trial"]}}
    )
    mrr = sum(s.mrr_bdt or 0 for s in subs)
    
    # Token usage today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    token_usages_today = await prisma.tokenusage.find_many(
        where={"date": {"gte": today_start}}
    )
    total_tokens_today = sum(t.total_tokens or 0 for t in token_usages_today)
    total_cost_today = round(sum(t.cost_usd or 0 for t in token_usages_today), 4)
    
    # Churned (cancelled or expired)
    churned = await prisma.usersubscription.count(
        where={"status": {"in": ["cancelled", "expired"]}}
    )
    churn_rate = round(churned / max(active_subs + churned, 1) * 100, 2)
    
    # Grocery clicks today
    grocery_clicks_today = await prisma.grocerysuggestion.count(
        where={"clickedAt": {"gte": today_start}}
    )
    
    return {
        "total_users": total_users,
        "new_users_7d": new_users_7d,
        "new_users_30d": new_users_30d,
        "active_subscriptions": active_subs,
        "mrr_bdt": mrr,
        "total_tokens_today": total_tokens_today,
        "total_cost_today_usd": total_cost_today,
        "churn_rate_pct": churn_rate,
        "grocery_clicks_today": grocery_clicks_today,
    }


# ─── Users ─────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    search: Optional[str] = None,
    tier: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin=Depends(require_admin),
):
    """Paginated, searchable user list with subscription info."""
    where = {}
    
    if search:
        where["OR"] = [
            {"phone": {"contains": search}},
            {"email": {"contains": search}},
            {"profile": {"nameEn": {"contains": search}}},
            {"profile": {"nameBn": {"contains": search}}},
        ]
    
    if status:
        where["role"] = status  # reusing role field for simplicity
    
    users = await prisma.user.find_many(
        skip=skip,
        take=limit,
        where=where,
        order={"createdAt": "desc"},
        include={
            "profile": True,
            "subscriptions": {"include": {"plan": True}, "order": {"startedAt": "desc"}, "take": 1},
        },
    )
    
    total = await prisma.user.count(where=where)
    
    result = []
    for u in users:
        active_sub = u.subscriptions[0] if u.subscriptions else None
        plan_tier = active_sub.plan.tier if active_sub and active_sub.plan else "free"
        
        # Count token usage for this user
        token_sum = await prisma.tokenusage.aggregate(
            where={"userId": u.id},
            sum={"total_tokens": True},
        )
        
        result.append({
            "id": u.id,
            "phone": u.phone,
            "email": u.email,
            "role": u.role,
            "language": u.language,
            "created_at": u.createdAt.isoformat() if u.createdAt else None,
            "name_bn": u.profile.nameBn if u.profile else None,
            "name_en": u.profile.nameEn if u.profile else None,
            "tier": plan_tier,
            "subscription_status": active_sub.status if active_sub else None,
            "total_tokens_used": token_sum.sum.get("total_tokens", 0) if token_sum and token_sum.sum else 0,
        })
    
    return {"data": result, "total": total, "skip": skip, "limit": limit}


@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, admin=Depends(require_admin)):
    """Detailed user view with subscriptions, tokens, and grocery history."""
    user = await prisma.user.find_unique(
        where={"id": user_id},
        include={
            "profile": True,
            "subscriptions": {"include": {"plan": True}, "order": {"startedAt": "desc"}},
            "healthLogs": {"order": {"logDate": "desc"}, "take": 5},
            "chatMessages": {"order": {"createdAt": "desc"}, "take": 10},
        },
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Token usage summary
    token_usages = await prisma.tokenusage.find_many(
        where={"userId": user_id},
        order={"date": "desc"},
        take=30,
    )
    total_tokens = sum(t.total_tokens or 0 for t in token_usages)
    
    # Grocery suggestions
    groceries = await prisma.grocerysuggestion.find_many(
        where={"userId": user_id},
        order={"clickedAt": "desc"},
        take=20,
    )
    
    return {
        "id": user.id,
        "phone": user.phone,
        "email": user.email,
        "role": user.role,
        "language": user.language,
        "created_at": user.createdAt.isoformat() if user.createdAt else None,
        "profile": {
            "name_bn": user.profile.nameBn if user.profile else None,
            "name_en": user.profile.nameEn if user.profile else None,
            "age": user.profile.age if user.profile else None,
            "gender": user.profile.gender if user.profile else None,
            "weight_kg": user.profile.weightKg if user.profile else None,
            "height_cm": user.profile.heightCm if user.profile else None,
            "activity_level": user.profile.activityLevel if user.profile else None,
            "goal": user.profile.goal if user.profile else None,
        } if user.profile else None,
        "subscriptions": [
            {
                "id": s.id,
                "plan_name": s.plan.name if s.plan else None,
                "tier": s.plan.tier if s.plan else None,
                "status": s.status,
                "started_at": s.startedAt.isoformat() if s.startedAt else None,
                "current_period_end": s.currentPeriodEnd.isoformat() if s.currentPeriodEnd else None,
                "mrr_bdt": s.mrr_bdt,
                "payment_method": s.paymentMethod,
            }
            for s in user.subscriptions
        ],
        "total_tokens_used": total_tokens,
        "recent_token_usages": [
            {"date": t.date.isoformat() if t.date else None, "feature": t.feature, "total_tokens": t.total_tokens}
            for t in token_usages
        ],
        "grocery_suggestions": [
            {
                "id": g.id,
                "item_name": g.itemName,
                "platform": g.platform,
                "price_bdt": g.priceBDT,
                "clicked_at": g.clickedAt.isoformat() if g.clickedAt else None,
                "purchased_at": g.purchasedAt.isoformat() if g.purchasedAt else None,
            }
            for g in groceries
        ],
    }


@router.post("/users/{user_id}/update-tier")
async def update_user_tier(user_id: str, req: UpdateTierRequest, admin=Depends(require_admin)):
    """Manually update a user's subscription tier."""
    user = await prisma.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    plan = await prisma.subscriptionplan.find_first(where={"tier": req.tier})
    if not plan:
        raise HTTPException(status_code=400, detail=f"Plan tier '{req.tier}' not found")
    
    # Cancel any active subscription
    await prisma.usersubscription.update_many(
        where={"userId": user_id, "status": {"in": ["active", "trial"]}},
        data={"status": "cancelled", "cancelledAt": _now()},
    )
    
    # Create new subscription
    now = _now()
    await prisma.usersubscription.create(
        data={
            "userId": user_id,
            "planId": plan.id,
            "status": "active",
            "startedAt": now,
            "currentPeriodStart": now,
            "currentPeriodEnd": now + timedelta(days=30),
            "mrrBDT": plan.priceMonthlyBDT,
            "paymentMethod": "manual",
        }
    )
    
    return {"success": True, "message": f"User tier updated to {req.tier}"}


# ─── Subscriptions ─────────────────────────────────────────────────

@router.get("/subscriptions")
async def list_subscriptions(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin=Depends(require_admin),
):
    """Subscription ledger."""
    where = {}
    if status:
        where["status"] = status
    
    subs = await prisma.usersubscription.find_many(
        skip=skip,
        take=limit,
        where=where,
        order={"startedAt": "desc"},
        include={"user": True, "plan": True},
    )
    
    total = await prisma.usersubscription.count(where=where)
    
    return {
        "data": [
            {
                "id": s.id,
                "user_id": s.userId,
                "user_phone": s.user.phone if s.user else None,
                "user_email": s.user.email if s.user else None,
                "plan_name": s.plan.name if s.plan else None,
                "tier": s.plan.tier if s.plan else None,
                "status": s.status,
                "started_at": s.startedAt.isoformat() if s.startedAt else None,
                "current_period_end": s.currentPeriodEnd.isoformat() if s.currentPeriodEnd else None,
                "mrr_bdt": s.mrr_bdt,
                "payment_method": s.paymentMethod,
                "auto_renew": s.autoRenew,
            }
            for s in subs
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ─── Plans ─────────────────────────────────────────────────────────

@router.get("/plans")
async def list_plans(admin=Depends(require_admin)):
    """List all subscription plans."""
    plans = await prisma.subscriptionplan.find_many(order={"priceMonthlyBDT": "asc"})
    return [
        {
            "id": p.id,
            "name": p.name,
            "tier": p.tier,
            "price_monthly_bdt": p.priceMonthlyBDT,
            "price_yearly_bdt": p.priceYearlyBDT,
            "features": json.loads(p.features) if p.features else [],
            "ai_token_quota": p.aiTokenQuota,
            "max_saved_meals": p.maxSavedMeals,
            "max_family_members": p.maxFamilyMembers,
            "is_active": p.isActive,
        }
        for p in plans
    ]


@router.put("/plans/{plan_id}")
async def update_plan(plan_id: str, payload: dict, admin=Depends(require_admin)):
    """Update plan pricing or features."""
    plan = await prisma.subscriptionplan.find_unique(where={"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    update_data = {}
    if "price_monthly_bdt" in payload:
        update_data["priceMonthlyBDT"] = payload["price_monthly_bdt"]
    if "price_yearly_bdt" in payload:
        update_data["priceYearlyBDT"] = payload["price_yearly_bdt"]
    if "features" in payload:
        update_data["features"] = json.dumps(payload["features"])
    if "ai_token_quota" in payload:
        update_data["aiTokenQuota"] = payload["ai_token_quota"]
    if "is_active" in payload:
        update_data["isActive"] = payload["is_active"]
    
    updated = await prisma.subscriptionplan.update(
        where={"id": plan_id},
        data=update_data,
    )
    return {"success": True, "plan": updated}


# ─── Token Usage ───────────────────────────────────────────────────

@router.get("/token-usage")
async def get_token_usage(
    user_id: Optional[str] = None,
    feature: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    admin=Depends(require_admin),
):
    """Aggregated token usage analytics."""
    since = _now() - timedelta(days=days)
    where = {"date": {"gte": since}}
    if user_id:
        where["userId"] = user_id
    if feature:
        where["feature"] = feature
    
    usages = await prisma.tokenusage.find_many(
        where=where,
        order={"date": "desc"},
        include={"user": True},
    )
    
    # Aggregate by feature
    feature_totals = {}
    for u in usages:
        f = u.feature or "unknown"
        if f not in feature_totals:
            feature_totals[f] = {"tokens": 0, "cost_usd": 0.0, "count": 0}
        feature_totals[f]["tokens"] += u.total_tokens or 0
        feature_totals[f]["cost_usd"] += u.cost_usd or 0
        feature_totals[f]["count"] += 1
    
    # Top users
    user_totals = {}
    for u in usages:
        uid = u.userId
        if uid not in user_totals:
            user_totals[uid] = {"phone": u.user.phone if u.user else None, "email": u.user.email if u.user else None, "tokens": 0}
        user_totals[uid]["tokens"] += u.total_tokens or 0
    
    top_users = sorted(user_totals.values(), key=lambda x: x["tokens"], reverse=True)[:10]
    
    return {
        "total_tokens": sum(u.total_tokens or 0 for u in usages),
        "total_cost_usd": round(sum(u.cost_usd or 0 for u in usages), 4),
        "by_feature": feature_totals,
        "top_users": top_users,
        "daily": [
            {"date": u.date.isoformat() if u.date else None, "feature": u.feature, "total_tokens": u.total_tokens}
            for u in usages[:100]
        ],
    }


# ─── AI Usage ──────────────────────────────────────────────────────

@router.get("/ai-usage")
async def get_ai_usage(
    days: int = Query(30, ge=1, le=365),
    admin=Depends(require_admin),
):
    """AI usage analytics for charts."""
    since = _now() - timedelta(days=days)
    usages = await prisma.tokenusage.find_many(
        where={"date": {"gte": since}},
        order={"date": "asc"},
    )
    
    # Group by date
    daily = {}
    for u in usages:
        d = u.date.strftime("%Y-%m-%d") if u.date else "unknown"
        if d not in daily:
            daily[d] = {"tokens": 0, "cost_usd": 0.0}
        daily[d]["tokens"] += u.total_tokens or 0
        daily[d]["cost_usd"] += u.cost_usd or 0
    
    return {
        "daily": [{"date": k, **v} for k, v in sorted(daily.items())],
        "total_tokens": sum(u.total_tokens or 0 for u in usages),
        "total_cost_usd": round(sum(u.cost_usd or 0 for u in usages), 4),
    }


# ─── Grocery Suggestions ───────────────────────────────────────────

@router.get("/grocery-suggestions")
async def list_grocery_suggestions(
    platform: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin=Depends(require_admin),
):
    """List grocery suggestion clicks with platform tracking."""
    since = _now() - timedelta(days=days)
    where = {"clickedAt": {"gte": since}}
    if platform:
        where["platform"] = platform
    
    items = await prisma.grocerysuggestion.find_many(
        skip=skip,
        take=limit,
        where=where,
        order={"clickedAt": "desc"},
        include={"user": True},
    )
    
    total = await prisma.grocerysuggestion.count(where=where)
    
    # Platform breakdown
    all_items = await prisma.grocerysuggestion.find_many(
        where={"clickedAt": {"gte": since}},
    )
    platform_breakdown = {}
    for i in all_items:
        p = i.platform or "unknown"
        if p not in platform_breakdown:
            platform_breakdown[p] = {"clicks": 0, "purchases": 0, "revenue_potential": 0.0}
        platform_breakdown[p]["clicks"] += 1
        if i.purchasedAt:
            platform_breakdown[p]["purchases"] += 1
        platform_breakdown[p]["revenue_potential"] += i.priceBDT or 0
    
    return {
        "data": [
            {
                "id": i.id,
                "user_id": i.userId,
                "user_phone": i.user.phone if i.user else None,
                "item_name": i.itemName,
                "platform": i.platform,
                "price_bdt": i.priceBDT,
                "clicked_at": i.clickedAt.isoformat() if i.clickedAt else None,
                "purchased_at": i.purchasedAt.isoformat() if i.purchasedAt else None,
            }
            for i in items
        ],
        "total": total,
        "platform_breakdown": platform_breakdown,
        "skip": skip,
        "limit": limit,
    }


@router.post("/track-grocery-click")
async def track_grocery_click_admin(
    req: TrackGroceryClickRequest,
    admin=Depends(require_admin),
):
    """Admin endpoint to manually log a grocery click (for testing/backfill)."""
    # This is mainly for admin testing; the main endpoint is in groceries router
    raise HTTPException(status_code=501, detail="Use POST /groceries/track-click")


# ─── Admin Access Logs ─────────────────────────────────────────────

@router.get("/access-logs")
async def get_access_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin=Depends(require_admin),
):
    """View admin access attempts."""
    logs = await prisma.adminaccesslog.find_many(
        skip=skip,
        take=limit,
        order={"accessedAt": "desc"},
    )
    total = await prisma.adminaccesslog.count()
    return {
        "data": [
            {
                "id": l.id,
                "ip_address": l.ipAddress,
                "accessed_at": l.accessedAt.isoformat() if l.accessedAt else None,
                "success": l.success,
            }
            for l in logs
        ],
        "total": total,
    }
