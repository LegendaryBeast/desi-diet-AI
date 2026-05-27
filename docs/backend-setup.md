# Backend Setup Guide

This guide covers everything needed to install, configure, and run the Pusti AI backend from scratch.

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Python | 3.11 | 3.12 is also supported |
| PostgreSQL | 14 | Local or hosted (e.g. Supabase, Neon, Render Postgres) |
| Neo4j | 5.x | Local Desktop or AuraDB cloud |
| Node.js | 18 | Required by Prisma Client Python at build time |

An OpenAI API key is required for LLM, Whisper, vision, and TTS features. The client is fully OpenAI-compatible, so Groq, OpenRouter, or any provider implementing the OpenAI chat completions API can be substituted.

---

## Installation

### 1. Clone and enter the backend directory

```bash
cd DesiDiet/backend
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

The key packages and their roles:

| Package | Purpose |
|---|---|
| `fastapi` | Web framework and request routing |
| `uvicorn` | ASGI server |
| `prisma` | ORM and PostgreSQL client (generates typed Python client from schema) |
| `neo4j` | Official Neo4j Python driver |
| `openai` | LLM, Whisper, TTS, and vision API client |
| `python-jose[cryptography]` | JWT creation and verification |
| `passlib[bcrypt]` | Password hashing |
| `pydantic-settings` | Environment variable loading into typed Settings class |
| `python-multipart` | File upload support (meal photos, audio) |
| `httpx` | Async HTTP client (used for Realtime API calls) |
| `google-generativeai` | Optional Gemini integration for Q1 journal endpoint |
| `pandas` | Data processing in report and migration scripts |

### 4. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all required values. See the Environment Variables section below for details.

### 5. Generate the Prisma client

Prisma generates a typed Python client from `prisma/schema.prisma`. This must be run before the app can start.

```bash
python -m prisma generate
```

### 6. Apply the database schema

Push the schema to your PostgreSQL database. This creates all tables.

```bash
python -m prisma db push
```

For production migrations with a proper history, use:

```bash
python -m prisma migrate deploy
```

### 7. Start the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is now available at `http://localhost:8000`.
Interactive Swagger documentation is at `http://localhost:8000/docs`.

---

## Environment Variables

All variables are loaded from `backend/.env` via Pydantic Settings (`app/config.py`). Unknown variables are ignored.

### Database

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string in Prisma format | `postgresql://user:pass@localhost:5432/desidiet` |

For local development with SQLite (not recommended for production):
`DATABASE_URL=file:./prisma/dev.db`

### Neo4j

| Variable | Default | Description |
|---|---|---|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt connection URI |
| `NEO4J_USER` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | — | Neo4j password (required) |

For AuraDB cloud instances, the URI will be in the format `neo4j+s://xxxxxxxx.databases.neo4j.io`.

### Authentication

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | Secret key for signing JWTs. Must be at least 32 characters. Use a random 64-character hex string in production. |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime in days |

Generate a secure JWT secret:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### LLM Provider

| Variable | Default | Description |
|---|---|---|
| `LLM_API_KEY` | — | API key for the LLM provider (required) |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | Base URL of the OpenAI-compatible endpoint |
| `LLM_MODEL` | `gpt-4o-mini` | Model name to use for chat completions |
| `LLM_MAX_TOKENS` | `1024` | Maximum tokens per completion response |

To use Groq instead of OpenAI:
```env
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
LLM_API_KEY=gsk_...
```

To use OpenRouter:
```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=google/gemini-2.0-flash-001
LLM_API_KEY=sk-or-...
```

Note: Vision features (food photo logging) require a vision-capable model. Whisper transcription and TTS always use OpenAI endpoints regardless of `LLM_BASE_URL`.

### CORS and App

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGINS` | `*` | Comma-separated list of allowed origins |
| `APP_NAME` | `Pusti AI` | Application name shown in the health check response |

For production, restrict CORS to your actual frontend domain:
```env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Redis (Optional)

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL (reserved for future caching; not actively used) |

---

## Neo4j Knowledge Graph Setup

The Neo4j graph database must be populated with food data before the application can serve food search, safe food recommendations, or meal plans.

Migration scripts are provided in `backend/`:

```bash
# Migrate food and nutrient data into Neo4j
python migrate_to_graph.py

# Migrate food compatibility and condition rules
python migrate_food_compatibility.py
```

These scripts read from the CSV and PDF data files in the project root and the `backend/data/` directory.

After migration, verify connectivity by checking the startup log for:
```
[OK] Successfully connected to Neo4j.
```

If Neo4j is unavailable at startup, the application continues to run but all food search, meal plan generation, and chat RAG features will be degraded or unavailable.

---

## Docker Deployment

The backend is fully containerized.

### Build the image

```bash
cd backend
docker build -t desi-diet-backend .
```

The Dockerfile:
1. Starts from `python:3.11-slim`
2. Installs system dependencies and Node.js 18 (required by Prisma)
3. Installs Python packages from `requirements.txt`
4. Copies the application code
5. Runs `prisma py fetch` and `prisma generate` to prepare the client
6. Exposes port 8000 and starts `start.sh`

### Run the container

```bash
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e NEO4J_URI=bolt://... \
  -e NEO4J_PASSWORD=... \
  -e JWT_SECRET=... \
  -e LLM_API_KEY=... \
  desi-diet-backend
```

Or use an env file:

```bash
docker run -p 8000:8000 --env-file .env desi-diet-backend
```

---

## Project Structure Reference

```
backend/
├── app/
│   ├── main.py            # FastAPI app, router registration, CORS
│   ├── config.py          # Pydantic Settings — all env vars
│   ├── db.py              # Prisma client, Neo4j init, lifespan
│   ├── dependencies.py    # JWT auth dependency (get_current_user)
│   ├── schemas.py         # All Pydantic request/response DTOs
│   ├── utils.py           # JSON helpers (to_json_string, from_json_string)
│   ├── core/
│   │   ├── llm_client.py  # LLMClient: chat, stream, transcribe, TTS, realtime
│   │   └── security.py    # bcrypt password hashing, JWT create/decode
│   ├── logic/
│   │   └── planner.py     # Q1 journal planner with SentenceTransformer
│   ├── models/
│   │   └── schemas.py     # Q1 journal Pydantic models
│   ├── routers/           # One file per API feature area
│   └── services/
│       ├── meal_plan_service.py       # Core meal plan generation
│       └── diet_plan_chat_service.py  # Conversational diet plan
├── rag_engine/
│   ├── __init__.py        # Public exports
│   ├── calorie_engine.py  # NDG 2025 calorie/macro calculator
│   ├── dietary_rules_data.py  # Static condition-food rules
│   ├── food_engine.py     # KhadokGraphRAG and Neo4j Cypher queries
│   └── planner.py         # SentenceTransformer RAG recommender
├── prisma/
│   └── schema.prisma      # PostgreSQL schema
├── data/                  # Seed data CSVs and migration inputs
├── scripts/               # Utility scripts
├── requirements.txt
├── Dockerfile
└── start.sh               # Entrypoint: prisma migrate + uvicorn
```

---

## Common Issues

**Prisma client not found**
Run `python -m prisma generate` after any schema change.

**DATABASE_URL format error**
Prisma requires the PostgreSQL URL in the format:
`postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
Not the `postgres://` scheme used by some cloud providers. Prefix with `postgresql://` if needed.

**Neo4j connection refused**
Ensure the Neo4j instance is running and accessible. For local Neo4j Desktop, the default Bolt port is 7687. Check that the password matches `NEO4J_PASSWORD`.

**Slow startup / cold start on Render**
Render free instances sleep after 15 minutes of inactivity. The first request after sleep takes 30 to 60 seconds. Upgrade to a paid instance or use an external uptime monitor to keep the service warm.

**SentenceTransformer model download on first run**
The RAG planner downloads the embedding model on first startup if not cached. This adds 1 to 2 minutes to the initial startup. Subsequent starts use the cached model.
