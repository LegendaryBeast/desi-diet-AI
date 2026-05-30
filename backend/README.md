# DesiDiet AI Backend

This is the central API Gateway and Intelligence Layer for **DesiDiet AI**, a localized AI-driven nutrition platform for Bangladesh. 

The backend orchestrates REST APIs, real-time Server-Sent Events (SSE) for chat streaming, and complex Retrieval-Augmented Generation (RAG) pipelines utilizing PostgreSQL, Neo4j, and Pinecone.

## Tech Stack

- **Framework:** FastAPI (Python 3.11+)
- **Server:** Uvicorn
- **Relational DB / ORM:** PostgreSQL + Prisma Client Python
- **Graph DB:** Neo4j (Used as a Food Compatibility & Nutritional Rules Store)
- **Vector DB:** Pinecone (Used for the NutriSaathi Personal Cooker Recipe Vectors)
- **AI & LLMs:** OpenAI API (GPT-4 for Chat & Parsing, Whisper for Audio Transcriptions)
- **Authentication:** JWT (JSON Web Tokens) with bcrypt password hashing

---

## Directory Structure

```text
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Environment variable validation via Pydantic
│   ├── db.py                # Database connections (Prisma & Neo4j)
│   ├── routers/             # API Endpoints (auth, chat, foods, health_log, etc.)
│   ├── services/            # Core business logic (meal_plan_service, diet_plan_chat_service)
│   ├── core/                # LLM Clients, Security, and Auth Logic
│   └── models/              # Pydantic schemas for request/response validation
├── rag_engine/              # GraphRAG Intelligence Layer (planner, food_engine, calorie_engine)
├── prisma/                  # Prisma ORM Schema definitions
├── data/                    # Static datasets / seed data
├── scripts/                 # Utility scripts for database migrations
└── requirements.txt         # Python dependencies
```

---

## Installation & Local Setup

### 1. Prerequisites
Ensure you have the following installed:
- Python 3.11 or higher
- Node.js (Required by Prisma CLI to generate the Python client)
- Access to a PostgreSQL Database
- Access to a Neo4j Database (Local or AuraDB)
- Access to a Pinecone Index
- OpenAI API Key

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials.
```bash
cp .env.example .env
```
Key variables include:
- `DATABASE_URL` (Postgres URL)
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX_NAME`
- `LLM_API_KEY` (OpenAI API Key)
- `JWT_SECRET` (A strong, random string)

### 3. Install Dependencies
Set up your virtual environment and install the required Python packages.
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Database Setup (Prisma)
Generate the Prisma Python Client and push the schema to your PostgreSQL database.
```bash
python -m prisma generate
python -m prisma db push
```

### 5. Run the Server
Start the FastAPI development server using Uvicorn.
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
The API will be available at `http://localhost:8000`. 
Interactive API documentation (Swagger UI) is available at `http://localhost:8000/docs`.

---

## Core Intelligence Services

### GraphRAG Pipeline
We use Neo4j to enforce the **National Dietary Guidelines (NDG) of Bangladesh**. When users ask questions or track meals, the system queries Neo4j via Cypher to retrieve condition-specific rules (e.g., "Avoid sugary foods if Diabetic") and micronutrient contents to ground the LLM's responses and prevent hallucinations.

### NutriSaathi / Personal Cooker
A dedicated pipeline that searches a **Pinecone Vector Database** for culturally relevant, safe Bangladeshi recipes tailored to the user's specific health profile (e.g., Hypertension, CKD). 
