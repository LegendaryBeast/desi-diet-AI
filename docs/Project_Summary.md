# DesiDiet AI - Project Summary & Architecture

**DesiDiet AI** is a localized, AI-driven nutrition and health platform tailored for the Bangladeshi population. It leverages a cutting-edge Graph-RAG architecture and modern web/mobile technologies to offer culturally accurate, medically sound meal planning and dietary tracking.

## Project Structure

The monorepo is well-organized into modular domains:

- **`/frontend`**: The React 18 Web App built with Vite, TypeScript, and Tailwind CSS. It features a premium "Magazine-Brutalist" UI, state-of-the-art Framer Motion animations, and communicates via REST/SSE to the backend.
- **`/mobile`**: The cross-platform Mobile App built with React Native and Expo Router. It mirrors the web's design language, offering a unified user experience on iOS and Android devices.
- **`/backend`**: The robust FastAPI service written in Python. It manages authentication, coordinates complex Graph-RAG (Retrieval-Augmented Generation) queries, handles the Personal Cooker assistant, and communicates with OpenAI models.
- **`/docs`**: A comprehensive directory containing technical specs, database schemas, API references, and architecture guides.

## System Architecture

The architecture spans 4 distinct layers. *(Note: API routes are abstracted into high-level functional groups)*:

1. **Layer 1 - Client Layer**: React Web App and Expo Mobile App presenting personalized dashboards, chat interfaces, and health trackers.
2. **Layer 2 - API Gateway Layer**: FastAPI acts as the orchestrator, containing functional groups like **Auth Services**, **Feature Services** (Profiles, Health Logs, Foods), **Meal & Cooking Services**, and **Chat Services** (SSE Streaming).
3. **Layer 3 - Intelligence Layer**: Contains Core AI Services:
   - **Meal Plan Service & Calorie Engine**
   - **Diet Chat Service**
   - **Personal Cooker Service (NutriSaathi)**
   - **GraphRAG Planner**
4. **Layer 4 - Data Layer**: A hybrid storage and intelligence backend:
   - **Neo4j Graph DB**: Acts as a **food compatibility store** that is utilized to **suggest traditional meal combinations**.
   - **Pinecone Vector DB**: Stores embedded recipe vectors for the Personal Cooker retrieval pipeline.
   - **PostgreSQL**: Stores relational user state, meal plans, chat history, and profiles using Prisma ORM.
   - **OpenAI LLM API**: Processes text generation, image parsing, and conversational chat responses.

## Architecture & Data Models

**1. Graph RAG Pipeline & Architecture:**  
![Graph RAG Architecture](./graph_rag_architecture.png)

**2. PostgreSQL Relational Schema (Prisma):**  
![PostgreSQL Schema](./postgres_schema.png)

**3. Neo4j Graph Database Schema:**  
![Neo4j Schema](./neo4j_schema.png)

## Key Features

- **NutriSaathi / Personal Cooker**: A condition-specific personalized cooking assistant that provides culturally grounded Bangladeshi recipes, ingredient alternatives, and safety checks based on the user's medical profile.
- **Graph-RAG Integration**: Prevents LLM hallucinations by injecting verified nutritional constraints from the National Dietary Guidelines (NDG) of Bangladesh.
- **Bilingual Chat Interface**: Real-time streaming SSE chat assistant fluent in Bengali and English.
