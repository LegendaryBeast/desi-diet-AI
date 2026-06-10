# **DesiDiet — AI-Native Clinical Nutrition & Meal Planning** 

> **Proudly Built for Infinity AI Buildfest 2026 @ BRAC University**
> **Web Application:** Deployed at Vercel & Railway.

---

## Executive Summary & Core Innovation

**DesiDiet** is an enterprise-grade, culturally grounded, clinical nutrition and meal planning ecosystem engineered to solve the unique dietary health challenges of the Bangladeshi and South Asian population. 

### The Problem
Traditional nutrition applications fail in South Asia. They do not comprehend regional foods (e.g., *Shak*, *Ruti*, *Dal*, regional fish), nor do they clinically account for the high genetic predisposition to metabolic conditions like Type-2 Diabetes, Hypertension, and Micronutrient Deficiency (Anemia) prevalent in Bangladesh.

### Our Solution
DesiDiet introduces a 5-Layer AI Reference Architecture powered by a dual-agent framework (**Pusti AI** & **NutriSaathi**) orchestrated via **LangGraph**. The platform enforces strict medical compliance by grounding Large Language Models using a state-of-the-art **Hybrid RAG** engine backed by three core clinical data sources: the [National Dietary Guidelines for Bangladesh](docs/NationalDietaryGuidelinesforBangladesh-23Aug2025.pdf), the [Bangladeshi Food Composition Tables (FCT)](docs/FCT_10_2_14_final_version.pdf), and the clinical structures of the [Explainable GraphRAG Framework](docs/frai-9-1808444.pdf) (Dindukurthi et al., 2026).


---

## Dataset & Integration Sources

DesiDiet is powered by a diverse ingestion layer combining peer-reviewed data sources, relational inputs, and validated synthetic sets:

*   **Open Datasets:** Grounded in the [National Dietary Guidelines for Bangladesh](docs/NationalDietaryGuidelinesforBangladesh-23Aug2025.pdf), [Bangladeshi Food Composition Tables (FCT)](docs/FCT_10_2_14_final_version.pdf), and clinical schemas adapted from the peer-reviewed study, [An Explainable GraphRAG Framework for Personalized Nutrition Recommendation](docs/frai-9-1808444.pdf) (Dindukurthi et al., 2026).
*   **External APIs:** OpenAI API (used for Whispering voice inputs and chat orchestration) and Pinecone Vector Database (hosting indexed recipe data).
*   **Internal Systems:** PostgreSQL relational database (via Prisma ORM) storing user profiles, logs, and targets, and a Neo4j Graph Database mapping complex food, nutrient, and disease relationships.
*   **Synthetic Data:** Automatically generated and updated food compatibility/pairing matrices, validated programmatically via AST structures.

---

## Technical Execution & System Architecture

DesiDiet is designed around an AI-Native 5-Layer model that decouples integration, business logic, semantic optimization, and knowledge databases:

![DesiDiet System Architecture](docs/architecture_diagram.png)

### Production-Ready Features
*   **High Performance:** Sub-50ms latency for cached queries, supported by real-time streaming SSE chat.
*   **Robust Session Memory:** Uses Prisma connected to a reliable PostgreSQL instance for strict database schema verification and data integrity.
*   **Audio/Vision Input Verification:** Users can submit voice recordings (transcribed via Whisper) or food images. The system maps raw LLM visual tags back to database-verified food items—ensuring that only verified food codes are logged to the PostgreSQL database, blocking hallucinated food logs entirely.
*   **Upcoming Version Roadmap:** A clinical family planning and maternal health module is slated for the upcoming release to offer targeted nutritional plans for mother and child health.


---

## Database Schema

The system relies on a dual-schema storage design:
*   **PostgreSQL Relational Schema:** Details user profiles, daily calorie targets, weight charts, and meal tracking logs.
*   **Neo4j Graph Database Schema:** Models direct relationships between diseases, micro/macro nutrients, and local food items, serving as the source of truth for safe food verification.

Refer to the database visualization files in the `docs/` directory for full entity-relationship layouts.

---

## Token Optimization Techniques

Strict token budget management is enforced across the application to ensure low latency and reduced LLM API costs:

1.  **Redis-Backed Semantic Caching:** Caches embeddings and responses for general queries to resolve similar questions instantly under 50ms with zero API cost.
2.  **Local Exact Match Check:** Pre-hashes query strings using MD5 to check for exact cache hits, bypassing embedding and LLM API calls completely.
3.  **Sliding History Window & Summarization:** Limits active conversational history to the last 6 turns and routes older messages to a lightweight model (`gpt-4o-mini`) to build a single concise context summary.
4.  **Local Context Pruning:** Uses a lightweight Jaccard token overlap algorithm to trim long RAG food contexts and profile details locally to fit within strict prompt token budgets.

---

## RAG Architecture Details

The system employs a dual-RAG approach to handle both structured clinical data and unstructured cooking manuals:

1.  **Vector RAG (Pinecone / NutriSaathi Cooking Assistant):**
    *   **Data Source:** Unstructured dietary/cooking manuals (`ragdata.md`).
    *   **Chunking:** Cosine similarity-based Semantic Chunking (0.65 threshold, max 1000 chars) prepended with Anthropic-style Contextual RAG summaries.
    *   **Embeddings:** Local embedding generation using `all-MiniLM-L6-v2`.
2.  **Graph RAG (Neo4j / Pusti AI Clinical Diet Logic):**
    *   **Data Source:** Structured food composition tables and clinical nutrition databases.
    *   **Chunking:** None (data is mapped directly into discrete entity nodes and relations in the Knowledge Graph).
    *   **Embeddings:** Entity-based property matching and graph traversal. Evaluates RDA and micronutrient similarity scores natively using graph algorithms.

---

## Agent Frameworks & Orchestration

The system uses **LangGraph (StateGraph)** to orchestrate two specialized sub-agents:
1.  **Pusti AI:** Clinical agent implementing clinical diet guidelines.
2.  **NutriSaathi:** Cooking agent offering step-by-step culinary guidance.

The architecture features a conditional router, memory condensation (Redis summaries), and full tool-calling support enabling the agents to:
*   Manage meal tracking and fetch daily/weekly meal plans.
*   Update user profiles and log health metrics (weight, blood sugar, BP).
*   Compile comprehensive nutrition reports and set medicine reminders.
*   Check food safety and trigger in-app page navigation.

---

## Prompt Usage & Engineering

To guarantee reliable outputs and restrict model behavior, we enforce:

1.  **Role-Play & Persona Definitions:** Distinct clinical roles guide response tone and boundaries ("Pusti AI" as a warm health intake specialist, "NutriSaathi" as a culturally grounded cooking guide).
2.  **Unicode Banners & Section Blocks:** Prompt templates are structured with explicit unicode banners (e.g., `CORE RULES`, `CONTEXT BLOCK`) to logically separate instructions, retrieved medical RAG contexts, and user profile data.
3.  **Strict Code-switching Rules:** Prompts enforce language-matching logic (returning Bengali script responses for Bengali input, and English/Banglish instructions otherwise).
4.  **Structured Markers & JSON Outputs:** Instructions direct the models to return strictly formatted JSON matching Pydantic targets or terminate intake collection with special string markers (e.g., `##DIET_DATA_COMPLETE##`) followed by a serialized dictionary.

---

## Optimization & Building Approach

The repository structure and building mechanisms were created and accelerated using:
*   **Graphify:** Automatically maps codebase relations to analyze architectural dependencies.
*   **Kiro / AWS Kiro:** Steering configuration management to automate workspace rules and code alignment.

---

## System Monitoring & Observability

We employ enterprise tools to oversee prompt performance and application health:
*   **LangSmith:** Used for LLM API monitoring, trace observability, and prompt execution tracking.
*   **Custom Business & System Monitoring Dashboards:** Provides real-time metrics on user engagement, meal plans generated, and cache hit rates.

---

## Guardrails, Safety & Privacy

1.  **Pre-routing Safety Guardrail:** A dedicated LangGraph `SafetyGuardNode` evaluates all incoming messages using structured JSON outputs to detect and refuse prompt injection, jailbreaks, clinical diagnoses, and drug prescription queries before downstream routing.
2.  **Database Context Isolation:** Out-of-scope queries trigger immediate exit states, completely bypassing Vector (Pinecone) and Graph (Neo4j) database connections to prevent unauthorized data access/leaks.
3.  **Cache PII Protection:** The `TokenOptimizer.is_cacheable` logic parses query words to prevent user-specific metrics or personal details from entering the shared Redis semantic cache.

---

## Open Source Tools & Libraries

*   **LangGraph:** Multi-agent state management and execution graph orchestration.
*   **Fastembed (Qdrant):** Local `all-MiniLM-L6-v2` vector embeddings.
*   **Neo4j:** Clinical Knowledge Graph queries.
*   **Pinecone:** Recipe vector storage.
*   **Redis:** Semantic caching and conversational summaries.
*   **Prisma Client:** Database ORM for relational queries.
*   **FastAPI:** Server endpoints and Server-Sent Events (SSE) chat streaming.

---

## Evaluation & Quality Measurement

A custom validation suite executes regression checks:
1.  **Recommendation Stability:** Verifies personalization variance among various demographic groups (Age/Gender/RDA keys).
2.  **Nutrient Coverage:** Confirms top recommendations meet clinical RDA targets.
3.  **Regression Testing:** Measures token optimization metrics including semantic cache hit rates, Jaccard-based context pruning overlaps, and latency distribution.
4.  **Manual Safety Audits:** Ensures clinical constraints are strictly grounded in BIRDEM/WHO guidelines.

---

## Screenshots

| Dashboard Overview | AI Diet Assistant |
|:---:|:---:|
| ![Dashboard](docs/screenshots/dashboard.png) | ![AI Assistant](docs/screenshots/ai_assistant.png) |
| **Personalized Meal Plan** | **Grocery Price Compare** |
| ![Meal Plan](docs/screenshots/meal_plan.png) | ![Grocery Compare](docs/screenshots/grocery_compare.png) |
| **Medicine Reminders** | **Food Database** |
| ![Medicine Reminders](docs/screenshots/medicine_reminders.png) | ![Food Database](docs/screenshots/food_database.png) |
| **Comprehensive Health Report** | |
| ![Health Report](docs/screenshots/health_report.png) | |

---

## Quick Start

### Prerequisites
*   Python 3.11+
*   Node.js 18+
*   PostgreSQL & Redis
*   Neo4j instance (Local or AuraDB)
*   OpenAI API Key

### Backend Ingress
```bash
cd backend
python -m venv venv
source venv/bin/activate

# Install and init ORM
pip install -r requirements.txt
cp .env.example .env
python -m prisma generate
python -m prisma db push

# Start Server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Web Build
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

### WhatsApp Microservice
```bash
cd whatsapp-service
npm install
npm run dev
```
