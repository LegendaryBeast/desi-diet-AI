# Architecture

This document describes the system design, component boundaries, Graph-RAG pipeline, and data flow of the Pusti AI platform.

---

## High-Level Overview

Pusti AI is a full-stack web application with three primary runtime services:

1. A **FastAPI backend** that handles authentication, business logic, LLM orchestration, and database access.
2. A **PostgreSQL relational database** (via Prisma ORM) for user accounts, meal plans, health logs, chat history, and tracking records.
3. A **Neo4j graph database** that stores the food knowledge graph: food items, food groups, nutrients, conditions, and their relationships.

The frontend is a React single-page application communicating with the backend over HTTPS REST and Server-Sent Events (SSE).

```
+---------------------------+
|   React SPA (Vite/TS)     |
|   Deployed: Vercel CDN    |
+---------------------------+
             |
       HTTPS REST + SSE
             |
+---------------------------+
|   FastAPI Backend         |
|   Deployed: Render        |
|                           |
|  +--------+  +----------+ |
|  | Prisma |  | Neo4j    | |
|  | ORM    |  | Driver   | |
|  +--------+  +----------+ |
+---------------------------+
        |            |
  PostgreSQL        Neo4j
  (User data,       (Food KG,
   plans, logs)     Conditions)

+---------------------------+
|   OpenAI API              |
|   (LLM, Whisper, TTS,     |
|    Vision, Realtime)      |
+---------------------------+
```

---

## Backend Startup Sequence

The backend uses FastAPI's `lifespan` context manager (`app/db.py`) to initialize all resources before accepting requests:

1. **Prisma connect** — establishes the async PostgreSQL connection pool.
2. **Neo4j driver init** — creates a Bolt connection and verifies connectivity. If unreachable, the driver is set to `None` and Graph-RAG features degrade gracefully.
3. **SentenceTransformer load** — loads the embedding model into `app.state.ai_models` for the RAG planner's semantic similarity matching.

On shutdown, the Neo4j driver is closed and Prisma disconnects cleanly.

---

## Graph-RAG Pipeline

Graph-RAG (Graph-based Retrieval-Augmented Generation) is the core technical innovation. Instead of allowing the LLM to generate nutrition data from training memory, a retrieval step pulls verified data from a structured knowledge graph before prompting the model.

### Knowledge Graph Schema

**Node types:**

| Node Label | Description |
|---|---|
| `Food` | Individual food item with macronutrient properties (energy_kcal, protein_g, fat_g, carbohydrate_g, fiber_g) |
| `FoodGroup` | Category (Cereals, Pulses, Vegetables, Fish, Meat, Dairy, Oils, etc.) |
| `Nutrient` | Micronutrient (Iron, Calcium, Vitamin C, Zinc, etc.) |
| `Condition` | Medical condition or goal (Diabetes, Hypertension, Anemia, Weight Loss, etc.) |
| `FoodAlias` | Synonym or local name mapping to a canonical Food node |
| `Disease` | Disease linked to clinically required nutrients |

**Relationship types:**

| Relationship | From | To | Description |
|---|---|---|---|
| `BELONGS_TO` | Food | FoodGroup | Classifies a food into its group |
| `CONTAINS_NUTRIENT` | Food | Nutrient | Micronutrient content (amount_mg property) |
| `AVOID_GROUP` | Condition | FoodGroup | Users with this condition should avoid this group |
| `PREFER_GROUP` | Condition | FoodGroup | Users with this condition benefit from this group |
| `REQUIRES` | Disease | Nutrient | Clinically important nutrients for a disease |
| `MAPS_TO` | FoodAlias | Food | Resolves a local name to canonical food |

### Retrieval Flow for Chat

1. User's medical conditions are fetched from the Prisma `profiles` table.
2. `KhadokGraphRAG.search_food()` runs a Cypher full-text search over `Food` nodes matching Bengali and English names.
3. For each matched food, `get_chatbot_context()` returns macros, micronutrients, and all applicable `AVOID_GROUP` or `PREFER_GROUP` rules for the user's conditions.
4. The retrieved context is appended to the LLM system prompt.
5. The LLM is instructed to reference only provided database values for any nutritional claims.

### Retrieval Flow for Meal Plans

1. The calorie engine computes the user's TDEE and macronutrient targets.
2. `KhadokGraphRAG.get_safe_foods()` retrieves foods filtered by condition constraints.
3. The RAG planner (`rag_engine/planner.py`) uses a SentenceTransformer embedding model for semantic similarity, enabling disease-aware prioritization for conditions not captured by keyword rules.
4. The filtered, ranked food list is passed to the LLM with macro targets, producing a JSON meal plan.
5. The plan is validated and stored in PostgreSQL.

### Meal Logging Verification

1. The LLM identifies food items and portion sizes from text or image. No calorie or macro values are generated at this step.
2. The system attempts to match items against today's planned meals (plan-database match).
3. If no plan match, `KhadokGraphRAG.search_food()` performs a Neo4j lookup.
4. If found, per-100g values are scaled to the portion size. These database values are used exclusively.
5. If not found, the item is excluded and the user is notified. No LLM-estimated values are substituted.

---

## Authentication Flow

1. User registers or logs in, receiving a short-lived access token (default: 30 min) and a long-lived refresh token (default: 7 days).
2. Both tokens are stored in `localStorage` on the client.
3. The frontend API client attaches the access token as `Bearer` on every request.
4. On a 401 response, the client automatically exchanges the refresh token and retries once.
5. On refresh failure, tokens are cleared and a logout event is dispatched.

---

## Streaming Architecture (SSE)

The AI chat endpoint returns a `StreamingResponse` with `media_type="text/event-stream"`. Each frame is a JSON object:

| Event shape | Meaning |
|---|---|
| `{"token": "..."}` | A token chunk from the LLM |
| `{"meal_logged": {...}}` | A meal was logged via the `log_meal` function tool |
| `{"status": "generating_plan"}` | Diet plan session is generating the final plan |
| `{"plan_ready": {...}}` | Diet plan is complete |
| `{"done": true}` | Stream is complete |
| `{"error": "..."}` | A recoverable error occurred |

The frontend reads the stream using the Fetch API and a `ReadableStream` reader (not `EventSource`, which does not support POST requests).

---

## LLM Tool Use (Function Calling)

The chat endpoint passes a `log_meal` function definition to the LLM. When the model detects meal logging intent, it outputs a tool call. The backend:

1. Collects the streamed tool call arguments.
2. Executes the meal logging logic (item extraction, Neo4j lookup, database write).
3. Appends the tool result to the conversation and makes a second LLM call for natural language confirmation.
4. Yields the `meal_logged` SSE event alongside response tokens.

---

## Calorie Engine (NDG 2025)

The `calculate_targets` function in `rag_engine/calorie_engine.py` implements:

- **BMR**: Mifflin-St Jeor equation (gender-specific)
- **TDEE**: BMR multiplied by activity factor (1.2 sedentary to 1.9 extremely active)
- **Goal adjustment**: +300 kcal for gain, -350 kcal for loss (with safe minimums)
- **IBW**: Devine formula adapted for South Asian populations
- **BMI thresholds**: South Asian cutoffs (overweight at 23.0, obese at 27.5)
- **Macros**: Protein 15%, Fat 30%, Carbohydrates 55%, Fiber 25g (NDG defaults)
- **Water**: 33 ml per kg of ideal body weight

---

## Deployment Architecture

**Backend (Render)**
- Docker container running `uvicorn app.main:app` on port 8000
- Prisma client generated at Docker build time with binary query engines
- Environment variables configured in Render dashboard

**Frontend (Vercel)**
- Static files from `npm run build`
- `vercel.json` rewrites all routes to `index.html` for React Router
- `VITE_API_URL` set to the Render backend URL
- Pure client-side SPA with no server-side rendering
