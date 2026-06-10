# **DesiDiet — AI-Native Clinical Nutrition & Meal Planning** 

> **Proudly Built for Infinity AI Buildfest 2026 @ BRAC University**
> **Web Application:** Deployed at Vercel & Railway.

![DesiDiet System Infographic](docs/infografic.jpeg)

---

## Executive Summary & Core Innovation

**DesiDiet** is an enterprise-grade, culturally grounded, clinical nutrition and meal planning ecosystem engineered to solve the unique dietary health challenges of the Bangladeshi and South Asian population. 

### The Problem
Traditional nutrition applications fail in South Asia. They do not comprehend regional foods (e.g., *Shak*, *Ruti*, *Dal*, regional fish), nor do they clinically account for the high genetic predisposition to metabolic conditions like Type-2 Diabetes, Hypertension, and Micronutrient Deficiency (Anemia) prevalent in Bangladesh.

### Our Solution
DesiDiet introduces a 5-Layer AI Reference Architecture powered by a dual-agent framework (**Pusti AI** & **NutriSaathi**) orchestrated via **LangGraph**. The platform enforces strict medical compliance by grounding Large Language Models using a state-of-the-art **Hybrid RAG** engine backed by three core clinical data sources: the [National Dietary Guidelines for Bangladesh](docs/NationalDietaryGuidelinesforBangladesh-23Aug2025.pdf), the [Bangladeshi Food Composition Tables (FCT)](docs/FCT_10_2_14_final_version.pdf), and the clinical structures of the [Explainable GraphRAG Framework](docs/frai-9-1808444.pdf) (Dindukurthi et al., 2026).

| |
|:---:|
| **Target Audience**<br><img src="docs/screenshots/target_audience.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |

---

## Platform Key Features & Screenshots

| | |
|:---:|:---:|
| **1. Personalized Meal Planning**<br>AI-generated daily/weekly plans matching user profile, health status, and NDG 2025 targets.<br><br><img src="docs/screenshots/meal_plan.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **2. Conversational AI Diet Assistant**<br>Real-time streaming SSE chat with full user profile context.<br><br><img src="docs/screenshots/ai_assistant.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **3. Meal Logging via Speech & Vision**<br>Multi-lingual voice, text, or image food logging grounded in Neo4j.<br><br><img src="docs/screenshots/dashboard.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **4. Health Log & Trend Tracking**<br>Progress logging for weight, BP, blood sugar, and HbA1c with context injection.<br><br><img src="docs/screenshots/health_report.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **5. Food Knowledge Browser**<br>Multilingual search displaying full nutrition specs and medical safety warnings.<br><br><img src="docs/screenshots/food_database.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **6. Health & Nutrition Reports**<br>PDF email reports analyzing calorie trends, macros, and clinical insights.<br><br><img src="docs/screenshots/health_report.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **7. Medicine Reminder Parsing**<br>Converts natural language descriptions of prescriptions into structured in-app reminders.<br><br><img src="docs/screenshots/medicine_reminders.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **8. Interactive Meal Builder**<br>Interactive meal calculator with target matching and AI feedback.<br><br><img src="docs/screenshots/meal_plan.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **9. NutriSaathi Cooking Guide**<br>Personalized cooking assistant generating local recipes with health substitutions.<br><br><img src="docs/screenshots/ai_assistant.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **10. Bilingual Interface**<br>Entire application fully localized in Bengali and English.<br><br><img src="docs/screenshots/dashboard.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **11. Grocery Sourcing & Price Compare**<br>Price-sorted local ingredient recommendations from nearest shops via GPS with live price comparison.<br><br><img src="docs/screenshots/grocery_sourcing_web.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **12. AI Chatbot**<br>Interactive conversational agent for instant nutrition tracking and dietary advice.<br><br><img src="docs/screenshots/ai_assistant.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |

---

## Mobile App Experience

Our mobile-first web app is designed for accessibility on the go, bringing intelligent nutrition straight to the palm of your hand. 

| | |
|:---:|:---:|
| **1. Mobile Dashboard**<br><br><img src="docs/screenshots/app_home.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **2. Daily Meal Tracking**<br><br><img src="docs/screenshots/app_meal_plan.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **3. Pushti-AI Assistant**<br><br><img src="docs/screenshots/app_pushti_ai.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **4. Target Goals & BMI**<br><br><img src="docs/screenshots/app_target_goals.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **5. Health & Disease Setup**<br><br><img src="docs/screenshots/app_disease_selection.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **6. User Profile & Metrics**<br><br><img src="docs/screenshots/app_profile.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **7. Pro Upgrade Flow**<br><br><img src="docs/screenshots/app_pro_upgrade.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **8. Health PDF Reports**<br><br><img src="docs/screenshots/app_health_report.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |

---

## WhatsApp Bot Integration

Chat directly with Pushti AI on WhatsApp without installing any app! Log meals, ask for advice, and get full dietary planning right from your favorite messaging app.

| | |
|:---:|:---:|
| **1. WhatsApp Meal Plans**<br><br><img src="docs/screenshots/whatsapp_meal_plan.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **2. WhatsApp Meal Logs**<br><br><img src="docs/screenshots/whatsapp_meal_log.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **3. WhatsApp Nutrition Info**<br><br><img src="docs/screenshots/whatsapp_nutrition_info.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **4. WhatsApp Health Advice**<br><br><img src="docs/screenshots/whatsapp_advice.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |

---

## DesiDiet Business (B2B Admin Portal)

| | |
|:---:|:---:|
| **1. Executive Overview Dashboard**<br>Real-time tracking of MRR, Active Subscriptions, Churn Rate, and L2C Funnel.<br><br><img src="docs/screenshots/business_overview.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **2. Revenue & Churn Analytics**<br>Deep dive into subscription mix, top brands revenue share, and actionable churn signals.<br><br><img src="docs/screenshots/business_revenue.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **3. Platform Operations & AI Telemetry**<br>Live activity logs, AI token consumption tracking by feature, and geographic user distribution.<br><br><img src="docs/screenshots/business_operations.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **4. Partner Brand Management**<br>Manage storefronts, catalog listings, and track brand performance via conversion vs revenue quadrants.<br><br><img src="docs/screenshots/business_brands.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **5. Brand Performance Deep Dive**<br>Granular metrics for individual partner brands including revenue history, new customers, and product rating distribution.<br><br><img src="docs/screenshots/business_brand_performance.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **6. Advanced Analytics & Cohorts**<br>Analyze user acquisition channels, cohort retention matrices, and customer lifetime value (LTV).<br><br><img src="docs/screenshots/business_analytics.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **7. AI Usage & Cost Forecasting**<br>Monitor daily LLM token consumption, estimated costs, and API request volume by feature.<br><br><img src="docs/screenshots/business_ai_usage_overview.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **8. Token Quotas & Top Consumers**<br>Track highest token consumers and manage automatic quota alerts for heavy users.<br><br><img src="docs/screenshots/business_ai_consumers.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **9. Subscription Tier Management**<br>Manage free, basic, and premium pricing tiers while tracking MRR contribution and payment mix.<br><br><img src="docs/screenshots/business_subscriptions.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | **10. Churn Risk & Win-back Campaigns**<br>Identify cancellation reasons, predict user churn risk, and trigger automated win-back emails.<br><br><img src="docs/screenshots/business_churn.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> |
| **11. Vision — Freemium & B2B Model**<br>7-day free trial + ৳300/month Pro plan (Shwapno, Chaldal, Foodpanda B2B grocery sourcing integrations).<br><br><img src="docs/screenshots/vision_freemium_b2b.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/> | *(More B2B Integrations Coming Soon)* |

## Dataset & Integration Sources

DesiDiet is powered by a diverse ingestion layer combining peer-reviewed data sources, relational inputs, and validated synthetic sets:

*   **Open Datasets:** Grounded in the [National Dietary Guidelines for Bangladesh](docs/NationalDietaryGuidelinesforBangladesh-23Aug2025.pdf), [Bangladeshi Food Composition Tables (FCT)](docs/FCT_10_2_14_final_version.pdf), and clinical schemas adapted from the peer-reviewed study, [An Explainable GraphRAG Framework for Personalized Nutrition Recommendation](docs/frai-9-1808444.pdf) (Dindukurthi et al., 2026).
*   **External APIs:** OpenAI API (used for Whispering voice inputs and chat orchestration) and Pinecone Vector Database (hosting indexed recipe data).
*   **Internal Systems:** PostgreSQL relational database (via Prisma ORM) storing user profiles, logs, and targets, and a Neo4j Graph Database mapping complex food, nutrient, and disease relationships.
*   **Synthetic Data:** Automatically generated and updated food compatibility/pairing matrices, validated programmatically via AST structures.

---

## System Methodology & Scientific Grounding

DesiDiet uses native South Asian nutritional formulas, structured compatibility rules, and a multi-stage workflow:

### South-Asian Adjusted Calorie Engine
*   **Basal Metabolic Rate (BMR) Formulas (Mifflin-St Jeor Equation):**
    *   *Male:* `BMR = (10 * Weight) + (6.25 * Height) - (5 * Age) + 5`
    *   *Female:* `BMR = (10 * Weight) + (6.25 * Height) - (5 * Age) - 161`
*   **Total Daily Energy Expenditure (TDEE):** `TDEE = BMR * Activity Factor`
*   **Adjusted South-Asian BMI Categories:**
    *   *Underweight:* `< 18.5`
    *   *Normal Weight:* `18.5 - 22.9`
    *   *Overweight:* `23.0 - 27.4`
    *   *Obese:* `>= 27.5`
*   **Goal Tuning:**
    *   *Loss:* `TDEE - 350 kcal`
    *   *Maintain:* `TDEE`
    *   *Gain:* `TDEE + 300 kcal`
*   **Target Macro Split (Energy):** 55% Carbohydrates | 15% Protein | 30% Fats
*   **Daily Essentials:** Fiber target of `25g/day`, Water intake target of `33 ml/kg IBW` (Ideal Body Weight)

### Food Compatibility Engine
*   **Structured Meal Assembly:** Combines local staples (Rice, Dal, Vegetables, Salad, and Fish/Meat) to suggest culturally meaningful meals rather than arbitrary ingredient lists.
*   **Compatibility Parameters:** Evaluated across six vectors: *Nutrient Complementarity, Traditional Co-occurrence, Digestibility & GI Impact, Condition Safety, Taste & Cultural Preference, and Affordability & Availability*.

### System Intelligence Pipeline
The system processes all user interactions via a 6-stage sequential workflow:
1.  **Ask / Log:** Ingress of user queries via text, voice recordings (Whisper), or food images.
2.  **Smart Routing:** The state router performs cache hits and security screening before downstream evaluation.
3.  **Data Retrieval:** Fetches real-time relational SQL data, Pinecone recipe vectors, and Neo4j graph nodes.
4.  **AI Reasoning:** LangGraph coordinates Pusti AI and NutriSaathi execution paths.
5.  **Response:** Emits real-time language-matched feedback (Bangla/English).
6.  **Learn & Improve:** Stores response characteristics for regression validation testing.

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
*   **LangSmith:** Used for LLM API monitoring, trace observability, and prompt execution tracking — covering Trace Count, Trace Latency (P50/P99), and real-time Error Rate.
*   **Custom Business & System Monitoring Dashboards:** Provides real-time metrics on user engagement, meal plans generated, and cache hit rates.

| |
|:---:|
| **LangSmith API Monitoring**<br><br><img src="docs/screenshots/langsmith_monitoring.png" width="100%" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"/> |

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
