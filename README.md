# **DesiDiet — AI-Native Clinical Nutrition & Meal Planning** 

[![Buildfest](https://img.shields.io/badge/Buildfest-2026-blueviolet?style=for-the-badge)](https://github.com/LegendaryBeast/desi-diet-AI)
[![Framework](https://img.shields.io/badge/FastAPI-0.116-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Database](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![GraphDB](https://img.shields.io/badge/Neo4j-GraphRAG-008CC1?style=flat-square&logo=neo4j)](https://neo4j.com/)

> **Proudly Built for Infinity AI Buildfest 2026 @ BRAC University**
> **Web Application:** Deployed at Vercel & Railway.

---

## 🚀 Executive Summary & Core Innovation

**DesiDiet** is an enterprise-grade, culturally grounded, clinical nutrition and meal planning ecosystem engineered to solve the unique dietary health challenges of the Bangladeshi and broader South Asian population. 

### The Problem
Traditional nutrition applications completely fail in South Asia. They do not comprehend native foods (e.g., *Shak*, *Ruti*, *Dal*, regional fish), nor do they clinically account for the high genetic predisposition to metabolic conditions like Type-2 Diabetes, Hypertension, and Micronutrient Deficiency (Anemia) prevalent in Bangladesh.

### Our Solution
DesiDiet introduces a **5-Layer AI Reference Architecture** powered by a dual-agent framework (**Pusti AI** & **NutriSaathi**) orchestrated via **LangGraph**. The platform enforces strict medical compliance by grounding Large Language Models with the **National Dietary Guidelines of Bangladesh (NDG 2025)** using a state-of-the-art **Hybrid RAG** engine.

---

## 🛠️ Technical Execution & System Architecture

DesiDiet is designed around an AI-Native 5-Layer model that decouples integration, business logic, semantic optimization, and knowledge databases:

![DesiDiet System Architecture](docs/architecture_diagram.png)

### 1. Hybrid RAG Architecture
*   **Graph RAG (Neo4j):** Houses the structured food composition database, medical compatibility constraints, and clinical relationships. Allows querying safe foods, calorie targets, and dietary combinations with zero LLM hallucination.
*   **Vector RAG (Pinecone & Fastembed):** Leverages `all-MiniLM-L6-v2` locally via ONNX Runtime (`Fastembed`) to index unstructured cooking manuals and recipes for the cooking assistant, avoiding external embedding costs.

### 2. Token & Latency Optimization
To bypass standard LLM latency and API costs, we implemented:
*   **Local Exact Match Cache:** Computes an MD5 hash of queries for exact cache hits, instantly resolving recurrent greetings or requests with zero LLM calls.
*   **Redis Semantic Cache:** Employs cosine similarity thresholds on query embeddings to retrieve previously generated responses in under 50ms.
*   **Jaccard Context Pruning:** Strips irrelevant tokens from context vectors locally before generating LLM prompts, staying strictly within the target token window.
*   **Sliding Window & Summarization:** Houses a 6-turn conversational history. Older messages are periodically condensed into a single context block via a smaller LLM (`gpt-4o-mini`).

### 3. Production-Ready Technical Details
*   **High Performance:** Latency under 50ms for cached semantic queries, with high-speed streaming SSE chat connections.
*   **Robust Session Memory:** Uses Prisma connected to a reliable PostgreSQL instance for strict database schema verification and data integrity.
*   **Audio/Vision Input Verification:** Users can submit voice recordings (transcribed via Whisper) or food images. The system maps raw LLM visual tags back to database-verified food items—ensuring that only verified food codes are logged to the PostgreSQL database, blocking hallucinated food logs entirely.

---

## 📈 Business Model & Market Viability

DesiDiet is constructed to be a sustainable, market-ready enterprise, not just a hackathon prototype.

*   **B2B Corporate Wellness:** Licensing API streams and custom dashboards to corporate firms in Dhaka for employee health metrics, meal plans, and productivity mapping.
*   **Monetization Strategy:** Freemium SaaS model. Free tier offers daily meal tracking and AI chat. Premium tier opens 7-day personalized micronutrient cycling targets, deep health reports, and direct recipe alternatives.
*   **Cross-Border / Diaspora Expansion:** Bangladesh has a vast Non-Resident Bangladeshi (NRB) community. The architecture is ready to scale globally to help South Asian communities manage their health by mapping regional ingredients to localized grocery stores.

---

## 🛡️ Real-World Impact & Clinical Guardrails

### Clinical Grounding & Toxicity Prevention
We implemented deep, rule-based clinical safeguards on top of model inferences:
*   **Weekly Nutrient Cycling:** Programmatically schedules rotations (leafy greens on days 1,3,5; yellow veggies on days 2,4,6; seeds/dairy on day 7) to guarantee 100% daily micronutrient RDA coverage.
*   **Toxicity Thresholds:** Enforces limits on toxic accumulation (e.g., capping dark leafy greens to 100g/meal, organ meat to 75g/day, and blocking consecutive-day therapeutic food repetitions).
*   **SafetyGuardNode:** Prevents out-of-scope inquiries. It intercepts and blocks jailbreaks, clinical diagnoses, and drug prescription requests prior to reaching internal agents.
*   **PII Cache Protection:** Standardized filters prevent user-specific metrics or private parameters from leaking into shared semantic cache stores.

---

## 🌐 Production Readiness & Scalability

DesiDiet is split into fully decoupled, containerized services:
*   **Backend REST/SSE API:** FastAPI running async workflows, easily scaleable horizontally behind a load balancer.
*   **WhatsApp Service:** A standalone Node.js microservice handling Twilio webhook ingress, separating chat interface traffic from core intelligence servers.
*   **Cross-Platform Clients:** Modular monorepo structuring React Vite (web app), Expo (React Native mobile application), and unified admin dashboards.

---

## 📸 Screenshots

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

## ⚙️ Quick Start

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

---

## 🧪 Evaluation & Quality Measurement

Our custom validation suite regularly runs regression checks:
1.  **Recommendation Stability:** Verifies personalization variance among various demographic groups (Age/Gender/RDA keys).
2.  **Nutrient Coverage:** Confirms top recommendations meet clinical RDA targets.
3.  **Cache hit-rate analysis:** Measures semantic cache precision and Jaccard pruning token overlap rates.
4.  **BIRDEM Audits:** Cross-references plan outputs with BIRDEM clinical guidelines.
