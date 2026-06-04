# n8n Integration Specs — WhatsApp (Twilio) → Pushti AI

> Answering the two blockers before wiring up the n8n workflow nodes.

---

## 1. Phone Number Format in the Database

### How it is stored
- The `User` table has a **`phone String? @unique`** column (see `backend/prisma/schema.prisma`).
- During registration (`POST /auth/register`) the phone is stored **exactly as the user typed it** — there is **no server-side normalization** (no `+880` prefix stripping, no `whatsapp:` prefix stripping).
- Login (`POST /auth/login`) and user lookup both do an **exact string match** against that column.

### What this means for the Twilio → n8n transformation
Twilio sends the sender ID as:
```
whatsapp:+8801XXXXXXXXX
```

**You must strip the `whatsapp:` prefix** before any DB lookup. What remains after that depends on how your users registered:

| If users registered with… | Transformation in n8n (before DB lookup) |
|---|---|
| `+8801XXXXXXXXX` | Strip `whatsapp:` → `+8801XXXXXXXXX` (no further change) |
| `01XXXXXXXXX` | Strip `whatsapp:` **and** strip `+880` → `01XXXXXXXXX` |
| Mixed / unknown | **Recommended:** normalize to `01XXXXXXXXX` (strip `whatsapp:` and `+880`) and store phones the same way during registration. |

> ⚠️ **Current state:** the DB does **not** enforce a uniform format. If you already have users in the DB, check a few rows first (`SELECT phone FROM users;`) to see which format they used. If formats are mixed, you may need an n8n Function node that tries both variants.

---

## 2. RAG / Chat Server Endpoints

Pushti AI exposes **three** chat/RAG-related endpoints. Choose the one that fits your WhatsApp flow.

### A. Main AI Chat (SSE streaming) — `POST /chat`
- **Full URL:** `POST https://<your-backend>/chat`
- **Auth:** Bearer token (`Authorization: Bearer <JWT>`)
- **Content-Type:** `application/json`
- **Request body (JSON):**

```json
{
  "message": "আমি আজ সকালে ভাত আর ডাল খেয়েছি",
  "language": "bn",
  "history": [
    { "role": "user", "content": "আমার কত ক্যালোরি দরকার?" },
    { "role": "assistant", "content": "আপনার দৈনিক ক্যালোরি লক্ষ্য ১৮০০।" }
  ],
  "image_data_url": null,
  "lat": null,
  "lng": null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | `string` | ✅ | The user's natural-language message |
| `language` | `string` | ❌ (default `"bn"`) | `"bn"` for Bengali, `"en"` for English |
| `history` | `array[{role, content}]` | ❌ | Last N turns for multi-turn memory |
| `image_data_url` | `string` (base64 data-URL) | ❌ | For food-photo vision input |
| `lat` / `lng` | `float` | ❌ | For nearest grocery-shop lookup |

- **Response format:** `text/event-stream` (SSE), not regular JSON. Each line looks like:
  ```
  data: {"token": "some text fragment"}
  ```
  You will need to collect tokens and concatenate them for the WhatsApp reply.

> **Important:** Because this endpoint returns SSE, an n8n HTTP Request node must be configured to handle streaming / raw response, or you can use an n8n Function node with `axios`/`fetch` to read the stream.

---

### B. Conversational Diet-Plan Intake — `POST /chat/diet-plan-chat`
- **Full URL:** `POST https://<your-backend>/chat/diet-plan-chat`
- **Auth:** Bearer token
- **Request body (JSON):**

```json
{
  "message": "আমার বয়স ৩৫",
  "language": "bn",
  "history": [],
  "collected": {
    "age": 35,
    "gender": "male",
    "height_cm": 170,
    "weight_kg": 72,
    "activity_level": "moderate",
    "goal": "Lose Weight",
    "medical_conditions": ["Diabetes"]
  },
  "lat": null,
  "lng": null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | `string` | ✅ | User's reply in the conversational flow |
| `language` | `string` | ❌ | `"bn"` or `"en"` |
| `history` | `array[{role, content}]` | ❌ | Prior turns |
| `collected` | `object` | ❌ | Already-confirmed profile fields from previous turns |
| `lat` / `lng` | `float` | ❌ | Grocery shop location |

- **Response format:** Also SSE stream.

---

### C. Personal Cooker (NutriSaathi) — `POST /personal-cooker/chat`
- **Full URL:** `POST https://<your-backend>/personal-cooker/chat`
- **Auth:** Bearer token
- **Request body (JSON):**

```json
{
  "message": "ডায়াবেটিসের জন্য ইলিশ মাছ ভাজা কি নিরাপদ?",
  "condition": "Diabetes",
  "session_id": "user-session-123"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | `string` | ✅ | Recipe / cooking / safety question |
| `condition` | `string` | ❌ (default `"None"`) | Medical condition to tailor the answer |
| `session_id` | `string` | ✅ | Any string for continuity; same `session_id` resumes history |

- **Response format:** Regular JSON (`application/json`)
  ```json
  {
    "reply": "ইলিশ মাছে ওমেগা-৩ আছে, কিন্তু ভাজা রান্নায় তেল বেশি...",
    "context_used": ["rule_1", "rule_2"]
  }
  ```

> ✅ **Best for n8n:** This is the easiest endpoint to call from n8n because it returns plain JSON (no SSE streaming).

---

## Quick Decision Matrix for n8n

| WhatsApp User Intent | Endpoint to Call | Why |
|---|---|---|
| General nutrition chat / meal logging / health report | `POST /chat` | Full-featured, but you must parse SSE |
| First-time onboarding / collecting profile data | `POST /chat/diet-plan-chat` | Conversational form-filling, SSE |
| Recipe / cooking / condition-specific food safety | `POST /personal-cooker/chat` | Simple JSON response, easiest in n8n |

---

## Open Questions for You

1. **Do your existing users have phones stored as `01XXXXXXXXX` or `+8801XXXXXXXXX`?**  
   Run: `sqlite3 backend/prisma/dev.db "SELECT phone FROM users LIMIT 5;"` (or query your PostgreSQL DB if deployed).

2. **Which chat endpoint do you want the WhatsApp bot to hit?**
   - If general chat → `POST /chat` (you'll need an SSE-to-text helper in n8n).
   - If recipe/condition Q&A → `POST /personal-cooker/chat` (simplest).
   - If onboarding new users → `POST /chat/diet-plan-chat`.

Once you confirm these two points, the n8n node config is straightforward.
