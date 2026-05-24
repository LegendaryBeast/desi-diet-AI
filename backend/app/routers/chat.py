"""Chat routes — SSE streaming endpoint with full user-context RAG."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse, Response
from app.dependencies import get_current_user
from app.db import prisma
from app.schemas import ChatRequest, DietPlanChatRequest, DietPlanChatResponse
from app.core.llm_client import llm_client
from app.utils import safe_list
from rag_engine import calculate_targets, KhadokGraphRAG
import json
import logging
import httpx
from datetime import datetime, timedelta, timezone

from app.services.diet_plan_chat_service import (
    COLLECTION_SYSTEM_PROMPT,
    extract_collected_data,
    generate_plan_from_collected,
)

router = APIRouter()
logger = logging.getLogger(__name__)


async def perform_meal_logging(user_id: str, input_text: str, meal_slot: str, language: str) -> dict:
    from app.routers.meal_tracking import MEAL_TRACKING_SYSTEM_PROMPT
    from app.utils import to_json_string

    # Fetch user profile for personalized feedback
    profile = await prisma.profile.find_unique(where={"userId": user_id})
    conditions = safe_list(profile.medicalConditions) if profile else []
    goal = profile.goal if profile else "maintain"
    target_cals = 2000  # fallback

    # Try to get real calorie target from a recent meal plan
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    plan = await prisma.mealplan.find_first(
        where={
            "userId": user_id,
            "planDate": {"gte": today, "lt": today + timedelta(days=1)},
        }
    )
    if plan:
        target_cals = plan.calorieTarget

    # Build LLM prompt
    user_context = (
        f"User conditions: {', '.join(conditions) or 'None'}. "
        f"Goal: {goal}. Daily calorie target: {target_cals} kcal. "
        f"Meal slot: {meal_slot or 'unspecified'}."
    )
    messages = [
        {"role": "system", "content": MEAL_TRACKING_SYSTEM_PROMPT},
        {"role": "user", "content": f"{user_context}\n\nUser ate: {input_text}"},
    ]

    raw = await llm_client.chat_completion(
        messages=messages,
        temperature=0.3,
        max_tokens=1024,
        response_format={"type": "json_object"},
    )

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}

    parsed_items = data.get("parsed_items", [])
    total_calories = data.get("total_calories", 0)
    macros = data.get("macros", {"protein_g": 0, "carbs_g": 0, "fat_g": 0})
    ai_feedback = data.get("ai_feedback", "")

    # Save to DB
    record = await prisma.mealtracking.create(
        data={
            "userId": user_id,
            "inputText": input_text,
            "parsedItems": to_json_string(parsed_items),
            "totalCals": int(total_calories),
            "macros": to_json_string(macros),
            "feedback": ai_feedback,
            "mealSlot": meal_slot,
            "language": language,
        }
    )

    return {
        "id": record.id,
        "parsed_items": parsed_items,
        "total_calories": int(total_calories),
        "macros": macros,
        "ai_feedback": ai_feedback,
        "meal_slot": meal_slot,
        "logged_at": record.loggedAt.isoformat(),
    }



async def _build_user_context(current_user_id: str) -> str:
    """
    Gather the full personalized context for the AI:
    - Profile + calculated nutrition targets
    - Recent meal tracking logs (7 days)
    - Latest health log (weight, BP, sugar)
    - Today's meal plan (what AI already planned)
    Returns a plain-text context block to inject into the system prompt.
    """
    lines = []

    # ── Profile & Targets ─────────────────────────────────────────────────────
    profile = await prisma.profile.find_unique(where={"userId": current_user_id})
    conditions = safe_list(profile.medicalConditions) if profile else []

    if profile:
        lines.append("=== USER PROFILE ===")
        lines.append(f"Name: {profile.nameBn or profile.nameEn or 'User'}")
        lines.append(f"Age: {profile.age}, Gender: {profile.gender}")
        lines.append(f"Weight: {profile.weightKg}kg, Height: {profile.heightCm}cm")
        lines.append(f"Goal: {profile.goal}")
        lines.append(f"Activity Level: {profile.activityLevel}")
        lines.append(f"Medical Conditions: {', '.join(conditions) if conditions else 'None'}")
        lines.append(f"Preferred Foods: {', '.join(safe_list(profile.preferredFoods)) if profile.preferredFoods else 'No preference'}")
        lines.append(f"Disliked Foods: {', '.join(safe_list(profile.dislikedFoods)) if profile.dislikedFoods else 'None'}")

        if profile.weightKg and profile.heightCm and profile.gender and profile.activityLevel:
            try:
                targets = calculate_targets({
                    "gender": profile.gender,
                    "height_cm": profile.heightCm,
                    "weight_kg": profile.weightKg,
                    "activity_level": profile.activityLevel,
                    "age": profile.age,
                    "goal": profile.goal,
                })
                lines.append(f"\n=== NUTRITION TARGETS (AI-calculated) ===")
                lines.append(f"Daily Calories: {targets['target_calories']} kcal")
                lines.append(f"Protein: {targets['protein_g']}g | Carbs: {targets['carbs_g']}g | Fat: {targets['fat_g']}g")
                lines.append(f"BMI: {targets['bmi']} ({targets.get('bmi_category', '')})")
                lines.append(f"Water: {targets['water_L']}L/day")
            except Exception:
                pass

    # ── Latest Health Log ─────────────────────────────────────────────────────
    health_log = await prisma.healthlog.find_first(
        where={"userId": current_user_id},
        order={"logDate": "desc"},
    )
    if health_log:
        lines.append("\n=== LATEST HEALTH LOG ===")
        if health_log.weightKg:
            lines.append(f"Weight: {health_log.weightKg}kg (logged {health_log.logDate.date()})")
        if health_log.bloodPressure:
            lines.append(f"Blood Pressure: {health_log.bloodPressure}")
        if health_log.bloodSugar:
            lines.append(f"Blood Sugar: {health_log.bloodSugar} mmol/L")
        if health_log.hba1c:
            lines.append(f"HbA1c: {health_log.hba1c}%")
        if health_log.notes:
            lines.append(f"Notes: {health_log.notes}")

    # ── Today's Meal Plan ─────────────────────────────────────────────────────
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_plan = await prisma.mealplan.find_first(
        where={"userId": current_user_id, "planDate": {"gte": today}},
        order={"createdAt": "desc"},
    )
    if today_plan and today_plan.planData:
        try:
            plan_data = json.loads(today_plan.planData) if isinstance(today_plan.planData, str) else today_plan.planData
            completed_slots = []
            if today_plan.completedSlots:
                completed_slots = json.loads(today_plan.completedSlots) if isinstance(today_plan.completedSlots, str) else today_plan.completedSlots
            
            lines.append("\n=== TODAY'S MEAL PLAN ===")
            for meal in plan_data.get("meals", []):
                status = "✅ Eaten" if meal.get("slot") in completed_slots else "⬜ Pending"
                items_text = ", ".join(
                    f"{i.get('name_bn') or i.get('name_en')} ({i.get('calories', '?')} kcal)"
                    for i in meal.get("items", [])
                )
                lines.append(f"[{meal.get('slot_bn') or meal.get('slot')}] {status}: {items_text or 'No items'} (~{meal.get('target_calories', '?')} kcal)")
        except Exception:
            pass

    # ── Recent Meal Tracking Logs (7 days) ────────────────────────────────────
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_logs = await prisma.mealtracking.find_many(
        where={"userId": current_user_id, "loggedAt": {"gte": week_ago}},
        order={"loggedAt": "desc"},
        take=15,
    )
    if recent_logs:
        lines.append("\n=== RECENT MEALS LOGGED (last 7 days) ===")
        for log in recent_logs:
            day = log.loggedAt.strftime("%a %d %b")
            slot = log.mealSlot or "unknown"
            cals = log.totalCals or 0
            text = log.inputText[:80] if log.inputText else "খাবার ট্র্যাক করা হয়েছে"
            lines.append(f"[{day} · {slot}] {text} → {cals} kcal")

    return "\n".join(lines)


@router.post("")
async def chat(req: ChatRequest, current_user=Depends(get_current_user)):
    """Stream an AI chat response via SSE.
    Uses full user context RAG: profile + targets + health log + today's plan + recent meal logs.
    Also supports multi-turn conversation via optional history field.
    Supports function calling to log meals directly from chat text or image upload.
    """

    async def event_generator():
        # 1. Build rich user context
        user_context = await _build_user_context(current_user.id)

        # 2. Query GraphRAG for food knowledge relevant to the message
        rag_food_context = ""
        try:
            rag = KhadokGraphRAG()
            profile = await prisma.profile.find_unique(where={"userId": current_user.id})
            conditions = safe_list(profile.medicalConditions) if profile else []
            search_results = rag.search_food(req.message) if req.message else []
            if search_results:
                rag_food_context = "\n=== FOOD KNOWLEDGE (from nutrition database) ===\n"
                for food in search_results[:6]:
                    ctx = rag.get_chatbot_context(food["code"], conditions)
                    rag_food_context += f"- {ctx}\n"
        except Exception as e:
            logger.warning("Chat GraphRAG context unavailable: %s", e)

        # 3. Build system prompt
        system_msg = (
            "You are পুষ্টি এআই (PushtiAI), a warm, knowledgeable, and proactive Bangladeshi nutrition companion. "
            "You have complete access to the user's health profile, medical conditions, nutrition targets, "
            "today's meal plan, and their recent 7-day meal history. Use all of this to give highly personalized, "
            "practical, and compassionate advice.\n\n"
            "IMPORTANT RULES:\n"
            "1. Always reply in Bengali if the user writes in Bengali. Reply in English if they write in English.\n"
            "2. If the user hasn't set up their profile, gently guide them to complete it.\n"
            "3. If the user asks for a meal plan or food suggestions, cross-reference their medical conditions, "
            "recent meal logs, and nutrition targets to give specific, personalized recommendations.\n"
            "4. If no recent meal data exists, ask the user about their preferences interactively.\n"
            "5. For calorie/macro questions, always use their calculated targets from the profile.\n"
            "6. Be proactive — mention if something they ate recently was risky given their conditions.\n"
            "7. Keep responses concise but warm. Use bullet points for lists.\n"
            "8. When discussing ANY food (e.g., banana/কলা), you MUST state the calorie count per specific quantity/weight (e.g., '১০০ গ্রাম কলায় ৮৯ ক্যালোরি থাকে' / '100g of banana contains 89 calories'). Clearly state the quantity, weight, and calorie values.\n"
            "9. Always analyze and explain the element-level pros and cons (e.g., carbohydrates, protein, fat, fiber, potassium, sodium, etc.) of the discussed food for the user's specific health goals and medical conditions.\n"
            "10. MEAL LOGGING: If the user says they ate something (e.g., 'আমি ২টা রুটি খেয়েছি', 'I had a banana for breakfast'), explicitly asks you to log/track a meal (e.g., 'add this to my log', 'আমার লগে এটি যোগ করুন'), or uploads a photo/image of food to log/track, you MUST call the `log_meal` tool to record it in their diet log. In the `description` parameter, describe the food items clearly. If they uploaded an image, analyze it, list the food items, and pass that description to the tool.\n\n"
            f"=== USER'S COMPLETE CONTEXT ===\n{user_context}\n"
            f"{rag_food_context}"
        )

        # 4. Build message list (supports multi-turn history from client)
        history = getattr(req, "history", []) or []
        messages = [{"role": "system", "content": system_msg}]

        # Re-inject last 10 turns from client-provided history
        for turn in history[-10:]:
            if turn.role in ("user", "assistant") and turn.content:
                messages.append({"role": turn.role, "content": turn.content})

        # If the client attached an image (base64 data-URL), build a multimodal
        # user message so OpenAI's vision model can see the image alongside text.
        if getattr(req, "image_data_url", None):
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": req.message or "What do you see in this image? Please identify it and log it as a meal."},
                    {"type": "image_url", "image_url": {"url": req.image_data_url}},
                ],
            })
        else:
            messages.append({"role": "user", "content": req.message})

        # Define tools for meal logging
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "log_meal",
                    "description": "Log a meal eaten by the user to their daily diet log. Use this whenever the user explicitly asks to log/track a meal, says they ate something, or uploads a photo of food to track/log.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "description": {
                                "type": "string",
                                "description": "Description of the food items eaten. Be specific. If there is an image, list all the foods visible."
                            },
                            "meal_slot": {
                                "type": "string",
                                "enum": ["breakfast", "lunch", "dinner", "snack"],
                                "description": "The meal slot. Default to 'snack' if not clear."
                            }
                        },
                        "required": ["description"]
                    }
                }
            }
        ]

        # 5. Stream LLM response
        try:
            response = await llm_client.client.chat.completions.create(
                model=llm_client.model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                stream=True,
                temperature=0.7,
            )

            tool_calls = []
            async for chunk in response:
                if len(chunk.choices) == 0:
                    continue
                delta = chunk.choices[0].delta
                if delta.content:
                    yield f"data: {json.dumps({'token': delta.content})}\n\n"
                
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        if len(tool_calls) <= tc.index:
                            tool_calls.append({
                                "id": tc.id or "",
                                "type": "function",
                                "function": {
                                    "name": tc.function.name or "",
                                    "arguments": tc.function.arguments or ""
                                }
                            })
                        else:
                            existing = tool_calls[tc.index]
                            if tc.id:
                                existing["id"] = tc.id
                            if tc.function.name:
                                existing["function"]["name"] += tc.function.name
                            if tc.function.arguments:
                                existing["function"]["arguments"] += tc.function.arguments

            # If tool calls were requested, execute them
            if tool_calls:
                # Filter out empty entries or merge them
                for tool_call in tool_calls:
                    func_name = tool_call["function"]["name"]
                    arguments_str = tool_call["function"]["arguments"]
                    try:
                        args = json.loads(arguments_str)
                    except Exception:
                        args = {}
                    
                    if func_name == "log_meal":
                        description = args.get("description", "")
                        meal_slot = args.get("meal_slot", "snack")
                        
                        # Log the meal
                        logged_meal = await perform_meal_logging(
                            user_id=current_user.id,
                            input_text=description,
                            meal_slot=meal_slot,
                            language=req.language
                        )
                        
                        # Yield the meal_logged event to the frontend
                        yield f"data: {json.dumps({'meal_logged': logged_meal})}\n\n"
                        
                        # Add tool invocation & response to conversation context
                        # Construct a list of dicts that match the API payload schema
                        # AsyncOpenAI client accepts tool_calls with exact shape
                        formatted_tool_calls = []
                        for tc in tool_calls:
                            formatted_tool_calls.append({
                                "id": tc["id"],
                                "type": "function",
                                "function": {
                                    "name": tc["function"]["name"],
                                    "arguments": tc["function"]["arguments"]
                                }
                            })

                        messages.append({
                            "role": "assistant",
                            "content": None,
                            "tool_calls": formatted_tool_calls
                        })
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "name": func_name,
                            "content": json.dumps(logged_meal)
                        })
                
                # Stream the final response after tool execution!
                second_response = await llm_client.client.chat.completions.create(
                    model=llm_client.model,
                    messages=messages,
                    stream=True,
                    temperature=0.7,
                )
                async for chunk in second_response:
                    if len(chunk.choices) > 0:
                        content = chunk.choices[0].delta.content
                        if content:
                            yield f"data: {json.dumps({'token': content})}\n\n"

        except Exception as e:
            logger.exception("LLM chat stream failed: %s", e)
            fallback = (
                "আমি এই মুহূর্তে উত্তর দিতে পারছি না — LLM সেবা সাময়িকভাবে বন্ধ আছে। "
                "আপনার পূর্ববর্তী খাবার পরিকল্পনা দেখতে 'খাবার' ট্যাব ব্যবহার করুন।"
                if req.language == "bn"
                else "LLM service is temporarily unavailable. Check your meal plan tab for today's recommendations."
            )
            for word in fallback.split():
                yield f"data: {json.dumps({'token': word + ' '})}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"


    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/diet-plan-session")
async def diet_plan_session(req: DietPlanChatRequest, current_user=Depends(get_current_user)):
    """
    Stream an AI chat response specifically for building a diet plan.
    Guided conversation to collect required profile fields, followed by plan generation.
    """

    async def event_generator():
        # 1. Start with the fixed collection system prompt
        messages = [{"role": "system", "content": COLLECTION_SYSTEM_PROMPT}]

        # 2. Add conversation history
        for turn in req.history:
            if turn.role in ("user", "assistant") and turn.content:
                messages.append({"role": turn.role, "content": turn.content})

        # 3. Add current message
        messages.append({"role": "user", "content": req.message})

        # 4. Stream LLM response & capture output to check for completion marker
        full_response = ""
        try:
            async for token in llm_client.chat_completion_stream(messages):
                full_response += token
                # Only stream the token if it's not part of the JSON marker section
                if "##DIET_DATA_COMPLETE##" not in full_response:
                    yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as e:
            fallback = "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।" if req.language == "bn" else "Sorry, I can't reply right now."
            yield f"data: {json.dumps({'token': fallback})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
            return

        # 5. Check if we reached the completion marker
        collected_data = extract_collected_data(full_response)
        
        if collected_data:
            # We have all data! Let's generate the plan
            yield f"data: {json.dumps({'status': 'generating_plan'})}\n\n"
            try:
                plan_result = await generate_plan_from_collected(collected_data, current_user.id, req.language)
                
                # Stream the special plan_ready event
                msg_bn = "আপনার ডায়েট পরিকল্পনা সফলভাবে তৈরি হয়েছে! নিচে আপনার পরিকল্পনাটি দেখুন।"
                msg_en = "Your diet plan has been successfully created! See your plan below."
                
                response_data = DietPlanChatResponse(
                    plan_id=plan_result["plan_id"],
                    plan_data=plan_result["plan_data"],
                    calorie_target=plan_result["calorie_target"],
                    message_bn=msg_bn,
                    message_en=msg_en
                )
                
                yield f"data: {json.dumps({'plan_ready': response_data.model_dump()})}\n\n"
            except Exception as e:
                err_msg = "পরিকল্পনা তৈরি করতে সমস্যা হয়েছে।" if req.language == "bn" else "Failed to generate plan."
                yield f"data: {json.dumps({'error': err_msg})}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ─── Voice: Whisper transcription (push-to-talk for meal log etc.) ───────────
@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
    current_user: dict = Depends(get_current_user),
):
    """Transcribe an uploaded audio clip to text. Used by meal-log voice input.

    Accepts: webm/ogg/wav/mp3/m4a/mp4/flac (max 25 MB).
    Returns: {"text": "..."}
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio payload")
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file exceeds 25 MB limit")

    lang = None
    if language:
        lang = "bn" if language.lower().startswith("bn") else (
            "en" if language.lower().startswith("en") else language
        )

    # Bilingual nutrition-domain prompt biases recognition toward food vocabulary.
    nutrition_prompt = (
        "এটি একটি বাংলাদেশি পুষ্টি অ্যাপ। ব্যবহারকারী খাবার লগ করছেন: "
        "ভাত, ডাল, মাছ, মুরগি, সবজি, ফল, রুটি, ডিম, দুধ, চা ইত্যাদি। "
        "Bangladeshi nutrition app. User is logging meals (rice, dal, fish, "
        "chicken, vegetables, fruits, bread, eggs, milk, tea)."
    )

    try:
        text = await llm_client.transcribe_audio(
            audio_bytes=audio_bytes,
            filename=file.filename or "audio.webm",
            language=lang,
            prompt=nutrition_prompt,
        )
    except Exception as exc:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")

    return {"text": text}


# ─── Voice: Realtime API session minting ──────────────────────────────────────
@router.post("/realtime/session")
async def create_realtime_session(
    payload: dict = Body(default={}),
    current_user: dict = Depends(get_current_user),
):
    """Mint a short-lived OpenAI Realtime ephemeral session for the browser to use.

    The browser opens a WebRTC peer connection directly to OpenAI using the
    returned `client_secret.value` as a Bearer token. We never expose the main
    LLM_API_KEY to the browser.

    Body (optional): {"voice": "alloy", "language": "bn" | "en"}
    Response: full session object from OpenAI (includes client_secret + model).
    """
    voice = (payload.get("voice") or "alloy").strip() or "alloy"
    language = (payload.get("language") or "").lower()

    # Build personalised RAG context to seed the assistant's instructions.
    try:
        rag_context = await _build_user_context(current_user.id)
    except Exception:
        logger.exception("Failed building user context for realtime session")
        rag_context = ""

    lang_directive = (
        "Reply in Bangla (Bengali) by default. Switch to English only if the user speaks English."
        if language.startswith("bn")
        else "Reply in the same language the user speaks (Bangla or English)."
    )

    instructions = (
        "You are DesiDiet, a friendly Bangladeshi personalised-nutrition voice assistant. "
        "Speak naturally and conversationally — short sentences, warm tone. "
        f"{lang_directive} "
        "Ground every recommendation in the user's profile, conditions, RDA targets, and "
        "today's plan provided below. Never invent food calories or medical claims. "
        "If the user asks for a meal plan, suggest local Bangladeshi foods (ভাত, ডাল, মাছ, "
        "সবজি, রুটি) appropriate to their goal and conditions. Always include a brief "
        "medical-disclaimer reminder when discussing serious conditions.\n\n"
        f"{rag_context}"
    )

    try:
        session = await llm_client.create_realtime_session(
            instructions=instructions,
            voice=voice,
        )
    except httpx.HTTPStatusError as exc:
        logger.exception("OpenAI realtime session creation failed")
        raise HTTPException(
            status_code=502,
            detail=f"Realtime session failed: {exc.response.status_code} {exc.response.text[:200]}",
        )
    except Exception as exc:
        logger.exception("Realtime session creation failed")
        raise HTTPException(status_code=502, detail=f"Realtime session failed: {exc}")

    return session
