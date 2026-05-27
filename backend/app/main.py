"""FastAPI application entry point containing both Q1 journal endpoints and production routes."""

# Force UTF-8 stdout/stderr so emoji print() calls don't crash on Windows cp1252
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import lifespan
from app.routers import (
    auth, profile, health_log, meal_plan, chat, foods, report,
    meal_tracking, medicine, meal_builder, groceries, docs,
)
from app.personal_cooker.router import router as personal_cooker_router
from app.models.schemas import UserProfile as JournalUserProfile, DietPlanResponse as JournalDietPlanResponse
from app.logic.planner import generate_plan_logic

app = FastAPI(
    title="Pusti Personalized AI Nutrition API (GraphRAG Q1 Version)",
    description="Backend API serving DesiDiet React frontend and implementing Neo4j GraphRAG planning.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Production Routers for Frontend Compatibility
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(health_log.router, prefix="/health-logs", tags=["Health Log"])
app.include_router(meal_plan.router, prefix="/meal-plans", tags=["Meal Plan"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(foods.router, prefix="/foods", tags=["Foods"])
app.include_router(report.router, prefix="/reports", tags=["Reports"])
app.include_router(meal_tracking.router, prefix="/meal-tracking", tags=["Meal Tracking"])
app.include_router(medicine.router, prefix="/medicine-reminders", tags=["Medicine"])
app.include_router(meal_builder.router, prefix="/meal-builder", tags=["Meal Builder"])
app.include_router(groceries.router, prefix="/groceries", tags=["Groceries"])
app.include_router(docs.router, prefix="/docs", tags=["Documentation"])
app.include_router(personal_cooker_router, tags=["Personal Cooker"])


# --- Q1 Journal Endpoints ---

@app.post("/api/generate-plan", response_model=JournalDietPlanResponse, tags=["Q1 Journal API"])
async def generate_plan_endpoint(user_profile: JournalUserProfile, request: Request):
    """
    Q1 Journal direct endpoint.
    Receives user profile, processes it through GraphRAG, and returns a Gemini-generated diet plan.
    Also returns grocery suggestions with live prices and nearest shop locations.
    """
    neo4j_driver = request.app.state.neo4j_driver
    ai_models = request.app.state.ai_models
    
    if not neo4j_driver:
        raise HTTPException(status_code=503, detail="Neo4j Graph Database connection is not available.")
    if not ai_models:
        raise HTTPException(status_code=503, detail="AI models (SentenceTransformer) are not loaded.")

    try:
        plan_content = await generate_plan_logic(user_profile, neo4j_driver, ai_models)

        # Always extract grocery suggestions from the generated plan text
        grocery_data = None
        try:
            from app.services.grocery_service import suggest_groceries_from_chat
            grocery_data = suggest_groceries_from_chat(
                chat_text="",
                user_lat=None,
                user_lng=None,
                assistant_response=plan_content,
            )
        except Exception as e:
            print(f"⚠️ Grocery extraction failed for Q1 plan: {e}")

        return {"plan": plan_content, "grocery_suggestions": grocery_data}
    except Exception as e:
        print(f"❌ Error generating Q1 plan: {e}")
        raise HTTPException(status_code=500, detail="Internal server error occurred.")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": settings.app_name}


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Pusti AI API (GraphRAG Q1 Version)",
        "docs": "/docs",
        "health": "/health",
    }

# Live reload trigger comment

