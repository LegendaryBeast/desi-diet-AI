# API Reference

All endpoints are served from the FastAPI backend. Protected endpoints require a `Bearer` JWT in the `Authorization` header.

Base URL (production): `https://desi-diet-backend.onrender.com`
Interactive docs: `{BASE_URL}/docs`

---

## Authentication

### POST /auth/register

Register a new user.

**Request body:**
```json
{
  "phone": "01712345678",
  "email": "user@example.com",
  "password": "minimum6chars",
  "language": "bn"
}
```

Either `phone` or `email` is required (not both mandatory). `language` defaults to `bn`.

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errors:**
- `400` — Neither phone nor email provided
- `409` — User already exists

---

### POST /auth/login

Authenticate an existing user.

**Request body:**
```json
{
  "identifier": "01712345678",
  "password": "yourpassword"
}
```

`identifier` accepts either a phone number or email address.

**Response:** Same as register.

**Errors:**
- `401` — Invalid credentials

---

### POST /auth/refresh

Exchange a refresh token for a new access token.

**Request body:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response:** Same as register.

**Errors:**
- `401` — Invalid or expired refresh token

---

### GET /auth/me

Return the current authenticated user's account details.

**Response:**
```json
{
  "id": "uuid",
  "phone": "01712345678",
  "email": null,
  "language": "bn",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

## Profile

### GET /profile

Return the user's profile and computed nutrition targets.

**Response:**
```json
{
  "profile": {
    "user_id": "uuid",
    "name_bn": "আব্দুল্লাহ",
    "name_en": "Abdullah",
    "age": 35,
    "gender": "male",
    "weight_kg": 72.0,
    "height_cm": 168.0,
    "activity_level": "moderate",
    "goal": "weight_loss",
    "medical_conditions": ["Diabetes", "Hypertension"],
    "preferred_foods": ["rice", "fish"],
    "disliked_foods": ["beef"],
    "updated_at": "2025-01-01T00:00:00Z"
  },
  "targets": {
    "bmi": 25.5,
    "bmi_category": "Overweight",
    "ideal_body_weight_kg": 65.0,
    "target_calories": 1850,
    "protein_g": 69,
    "carbs_g": 255,
    "fat_g": 62,
    "fiber_g": 25,
    "water_l": 2.1
  }
}
```

---

### POST /profile

Create a user profile.

**Request body (all fields optional):**
```json
{
  "name_bn": "আব্দুল্লাহ",
  "name_en": "Abdullah",
  "age": 35,
  "gender": "male",
  "weight_kg": 72.0,
  "height_cm": 168.0,
  "activity_level": "moderate",
  "goal": "weight_loss",
  "medical_conditions": ["Diabetes"],
  "preferred_foods": ["rice", "fish"],
  "disliked_foods": ["beef"]
}
```

Valid values for `activity_level`: `sedentary`, `light`, `moderate`, `active`, `very_active`
Valid values for `goal`: `weight_loss`, `weight_gain`, `maintain`

**Response:** Profile object (same structure as profile field in GET /profile)

---

### PATCH /profile

Update an existing profile (partial update). Same body structure as POST.

---

## Health Logs

### POST /health-logs

Create a health log entry.

**Request body (all fields optional):**
```json
{
  "log_date": "2025-01-01T00:00:00Z",
  "weight_kg": 72.0,
  "blood_pressure": "120/80",
  "blood_sugar": 6.2,
  "hba1c": 6.5,
  "notes": "Feeling better today",
  "symptoms": ["fatigue", "headache"]
}
```

**Response:**
```json
{
  "log_id": "uuid",
  "user_id": "uuid",
  "log_date": "2025-01-01T00:00:00Z",
  "weight_kg": 72.0,
  "blood_pressure": "120/80",
  "blood_sugar": 6.2,
  "hba1c": 6.5,
  "notes": "Feeling better today",
  "symptoms": ["fatigue", "headache"],
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### GET /health-logs

List recent health logs.

**Query parameters:**
- `limit` (int, default 30): Maximum number of records to return.

**Response:** Array of health log objects.

---

### GET /health-logs/trends

Return weight and blood sugar trend data.

**Response:**
```json
{
  "weight_trend": {
    "data_points": 10,
    "latest_kg": 72.0,
    "change_kg": -1.5,
    "history": [["2025-01-01", 73.5], ["2025-01-08", 72.0]]
  },
  "blood_sugar_trend": {
    "data_points": 5,
    "history": [["2025-01-01", 6.5], ["2025-01-08", 6.2]]
  }
}
```

---

## Meal Plans

### GET /meal-plans/daily

Get or generate today's meal plan.

**Query parameters:**
- `language` (string, default `bn`): Response language (`bn` or `en`)
- `offset` (int, default 0): Day offset (0 = today, -1 = yesterday)
- `force` (bool, default false): Force regeneration of today's plan

**Response:** Meal plan object with `plan_data` containing the full structured plan.

```json
{
  "plan_id": "uuid",
  "user_id": "uuid",
  "plan_date": "2025-01-01T00:00:00Z",
  "plan_type": "daily",
  "plan_data": {
    "meals": [
      {
        "slot": "breakfast",
        "slot_bn": "সকালের নাস্তা",
        "target_calories": 450,
        "items": [
          {
            "food_code": "rice_white",
            "name_en": "White Rice",
            "name_bn": "ভাত",
            "amount_g": 150,
            "calories": 195,
            "protein_g": 4.0,
            "carbs_g": 43.0,
            "fat_g": 0.5
          }
        ]
      }
    ]
  },
  "calorie_target": 1850,
  "ai_suggestion_cal": 1850,
  "user_choice_cal": null,
  "language": "bn",
  "feedback": null,
  "completed_slots": ["breakfast"],
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### GET /meal-plans/weekly

Get the meal plan for the current week.

**Query parameters:**
- `language` (string, default `bn`)

**Response:** Array of daily meal plan objects.

---

### GET /meal-plans/history

List past meal plans.

**Query parameters:**
- `limit` (int, default 30)

**Response:** Array of meal plan objects.

---

### POST /meal-plans/{plan_id}/feedback

Submit a rating for a meal plan (1 to 5).

**Request body:**
```json
{ "feedback": 4 }
```

---

### PATCH /meal-plans/{plan_id}/mark-complete

Mark a meal slot as complete or incomplete.

**Request body:**
```json
{
  "slot": "breakfast",
  "completed": true
}
```

---

### PATCH /meal-plans/{plan_id}/edit

Edit a meal plan's food items and calorie target.

**Request body:**
```json
{
  "plan_data": { "meals": [...] },
  "user_choice_cal": 1900
}
```

---

## Chat

### POST /chat

Stream an AI nutrition assistant response via SSE.

**Request body:**
```json
{
  "message": "আমার কি আজকের খাবার পরিকল্পনা দেখাবেন?",
  "language": "bn",
  "history": [
    { "role": "user", "content": "হ্যালো" },
    { "role": "assistant", "content": "নমস্কার! কী সাহায্য করতে পারি?" }
  ],
  "image_data_url": "data:image/jpeg;base64,..."
}
```

`image_data_url` is optional. If provided, the image is sent to the vision-capable LLM for food identification.

**Response:** `text/event-stream`

Each line begins with `data: ` followed by a JSON object. See [architecture.md](architecture.md) for the full SSE event schema.

---

### POST /chat/diet-plan-session

Stream a guided conversational session that collects user data and generates a meal plan.

**Request body:**
```json
{
  "message": "হ্যাঁ, আমার প্রোফাইল দিয়েই পরিকল্পনা বানাও",
  "language": "bn",
  "history": [...],
  "collected": {
    "age": 35,
    "gender": "male"
  }
}
```

**Response:** `text/event-stream` with an additional `plan_ready` event when the plan is complete.

---

### GET /chat/history

Return the last 50 chat messages for the current user.

**Response:** Array of `{ "role": "user"|"assistant", "content": "..." }`

---

### POST /chat/transcribe

Transcribe an audio file to text.

**Request:** `multipart/form-data`
- `file`: Audio file (webm, mp4, ogg, or wav)
- `language` (optional): Language hint for Whisper

**Response:**
```json
{ "text": "আমি সকালে ভাত খেয়েছি" }
```

---

### POST /chat/realtime/session

Mint an ephemeral WebRTC client secret for the OpenAI Realtime API.

**Request body:**
```json
{
  "voice": "alloy",
  "language": "bn"
}
```

**Response:** Ephemeral session object with `value` (bearer token), `expires_at`, and `session` config.

---

## Foods

### GET /foods/search

Search the food database by name.

**Query parameters:**
- `q` (string, required): Search term (Bengali or English)

**Response:** Array of food search results:
```json
[
  {
    "code": "rice_white",
    "name_en": "White Rice",
    "name_bn": "ভাত",
    "calories": 130.0,
    "protein": 2.7,
    "food_group": "Cereals"
  }
]
```

---

### GET /foods/safe-foods

Return foods that are safe for the current user's medical conditions, ranked by preference score.

**Response:** Array of safe food items including fiber and preference_score fields.

---

### GET /foods/{code}

Get the full nutritional detail for a food item including macros and condition-specific dietary rules.

**Response:**
```json
{
  "code": "rice_white",
  "name_en": "White Rice",
  "name_bn": "ভাত",
  "food_group": "Cereals",
  "calories": 130.0,
  "protein": 2.7,
  "fat": 0.3,
  "carbs": 28.0,
  "fiber": 0.4,
  "rules": [
    {
      "action": "caution",
      "condition": "Diabetes",
      "reason": "High glycemic index; limit portion size"
    }
  ]
}
```

---

### GET /foods/search-with-insight

Search foods and return a personalized safety rating and one-line AI insight for each result.

**Query parameters:**
- `q` (string, required): Search term
- `slot` (string, default `any`): Meal slot context

**Response:** Array with `safety` (`safe` / `caution` / `avoid`) and `ai_insight` fields added.

---

### GET /foods/{code}/justify

Get a one-sentence explanation of why a specific food is safe or to be avoided for the current user.

**Response:** `{ "explanation": "..." }`

---

## Meal Tracking

### POST /meal-tracking

Log a meal from a natural language description.

**Request body:**
```json
{
  "input": "দুপুরে ভাত, মাছের ঝোল আর ডাল খেয়েছি",
  "meal_slot": "lunch",
  "language": "bn",
  "preview": false
}
```

If `preview` is `true`, the system calculates and returns nutritional data without saving to the database.

The following direct fields bypass LLM parsing (used for manually entered items):
- `direct_calories`, `direct_protein`, `direct_carbs`, `direct_fat`
- `direct_name`, `direct_amount_g`

**Response:**
```json
{
  "id": "uuid",
  "parsed_items": [
    {
      "name": "ভাত",
      "amount_g": 150.0,
      "calories": 195.0,
      "protein_g": 4.1,
      "carbs_g": 43.0,
      "fat_g": 0.5
    }
  ],
  "total_calories": 520,
  "macros": { "protein_g": 22.0, "carbs_g": 78.0, "fat_g": 8.0 },
  "ai_feedback": "Successfully logged to your meal tracker.",
  "meal_slot": "lunch",
  "logged_at": "2025-01-01T12:00:00Z"
}
```

---

### POST /meal-tracking/from-image

Log a meal identified from a photograph.

**Request:** `multipart/form-data`
- `file`: Image file (jpg, png, webm)
- `meal_slot` (optional)
- `language` (optional)
- `food_name` (optional override)
- `quantity_g` (optional override)
- `preview` (optional bool)

**Response:** Same as POST /meal-tracking.

---

### GET /meal-tracking/today

Return all meal tracking records logged today.

**Response:** Array of `{ id, input_text, total_calories, macros, meal_slot, logged_at }`.

---

### DELETE /meal-tracking/{log_id}

Delete a specific meal tracking record.

**Response:** `{ "message": "Deleted" }`

---

## Medicine Reminders

### POST /medicine-reminders

Parse a natural language medicine schedule and save reminders.

**Request body:**
```json
{
  "input": "Metformin 500mg দিনে দুইবার, সকাল ৮টা এবং রাত ৮টা খাবারের পরে",
  "language": "bn"
}
```

**Response:**
```json
{
  "id": "uuid",
  "medicines": [
    {
      "name": "Metformin",
      "dose": "500mg",
      "times": ["08:00", "20:00"],
      "with_food": true,
      "notes": null
    }
  ],
  "confirmation": "Metformin 500mg সকাল ৮টা এবং রাত ৮টা — খাবারের পরে নেওয়ার রিমাইন্ডার সেট করা হয়েছে।"
}
```

---

### GET /medicine-reminders

List all active medicine reminders for the current user.

**Response:** Array of reminder items with `id`, `name`, `dose`, `times`, `with_food`, `active`, `created_at`.

---

### DELETE /medicine-reminders/{id}

Delete a medicine reminder.

---

## Meal Builder

### POST /meal-builder/analyze

Analyze a custom-assembled meal against the user's nutrition targets and condition constraints.

**Request body:**
```json
{
  "meal_slot": "lunch",
  "items": [
    { "food_code": "rice_white", "amount_g": 200, "name_en": "White Rice" },
    { "food_code": "hilsa_fish", "amount_g": 100, "name_en": "Hilsa Fish" }
  ],
  "replaced_item": { "food_code": "beef", "amount_g": 100 },
  "language": "en"
}
```

**Response:**
```json
{
  "total_calories": 420,
  "macros": { "protein_g": 28.0, "carbs_g": 55.0, "fat_g": 12.0 },
  "vs_plan_target": {
    "slot_target_kcal": 450,
    "difference": -30,
    "within_range": true
  },
  "condition_safety": {
    "safe": true,
    "flags": [],
    "note": "All items are safe for your conditions."
  },
  "ai_insight": "This meal provides good lean protein from Hilsa fish and complex carbohydrates.",
  "comparison": {
    "before": { "protein_g": 18.0, "carbs_g": 55.0, "fat_g": 22.0 },
    "after":  { "protein_g": 28.0, "carbs_g": 55.0, "fat_g": 12.0 }
  },
  "meal_score": { "score": 82, "label": "Good" }
}
```

---

## Reports

### GET /reports/nutrition

Return a full nutrition report combining profile targets, latest health log, and applicable dietary rules.

---

### GET /reports/conditions

Return all medical conditions on the user's profile and associated dietary rules.

---

### GET /reports/health-summary

Return a time-windowed health and calorie adherence summary.

**Query parameters:**
- `days` (int, required): Number of days to summarize (7, 14, 30, etc.)
- `weight_kg` (float, optional): Override weight for target recalculation

**Response includes:** calorie history, weight history, macro averages vs targets, micronutrient targets, clinical insights, AI verdict, pie chart data.

---

### POST /reports/send-email

Email a health report to a specified address.

**Request body:**
```json
{
  "email": "user@example.com",
  "language": "en"
}
```

**Response:** `{ "message": "Email sent", "email": "user@example.com", "report_summary": "..." }`

---

## Q1 Journal Endpoint

### POST /api/generate-plan

Direct diet plan generation endpoint used by the Q1 journal integration. Accepts a full user profile and returns a Gemini/LLM-generated plan using the Neo4j GraphRAG pipeline.

**Request body (UserProfile schema):**
```json
{
  "age": 35,
  "gender": "male",
  "weight_kg": 72.0,
  "height_cm": 168.0,
  "activity_level": "moderate",
  "goal": "weight_loss",
  "medical_conditions": ["Diabetes"]
}
```

**Response:** `{ "plan": "Full plan text..." }`

**Errors:**
- `503` — Neo4j or AI model not available

---

## System

### GET /health

Health check endpoint.

**Response:** `{ "status": "ok", "app": "Pusti AI" }`

### GET /

Root endpoint with links to docs and health check.
