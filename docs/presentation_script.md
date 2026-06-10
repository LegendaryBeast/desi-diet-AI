# DesiDiet Presentation Script

**Project Title:** DesiDiet — AI-Native Clinical Nutrition & Meal Planning  
**Target Duration:** 3 Minutes (180 Seconds)  
**Presenter Tone:** Confident, professional, clear, and clinical.

---

## 1. The Problem (30 Seconds | 0:00 - 0:30)

**[Slide: Title & The Problem]**

Good morning judges and fellow builders. 

Traditional nutrition apps fail in South Asia. If a diabetic patient in Bangladesh logs "Lal Shak" or "Rui Fish bhaji," Western databases cannot recognize it. More critically, these apps completely ignore the high genetic predisposition to Type-2 Diabetes, Hypertension, and Micronutrient deficiencies prevalent in our population. 

People do not need generic Western calorie counting. They need clinically safe, culturally grounded nutrition advice that understands local foods and metabolic health risks.

---

## 2. Our Solution (30 Seconds | 0:30 - 1:00)

**[Slide: Our Solution — DesiDiet]**

That is why we built **DesiDiet**—an AI-native clinical nutrition and meal planning ecosystem. 

DesiDiet is powered by a dual-agent framework—**Pusti AI** for clinical guidance and **NutriSaathi** as a cooking companion. They are orchestrated via **LangGraph** and grounded in peer-reviewed clinical research: the National Dietary Guidelines for Bangladesh and the Bangladeshi Food Composition Tables. 

By marrying clinical guidelines with local food databases, we ensure every meal recommendation is culturally relevant and medically safe.

---

## 3. Project Demo (60 Seconds | 1:00 - 2:00)

**[Slide: Project Demonstration]**

Let's look at how it works. 

When a user signs up, our **South-Asian Adjusted Calorie Engine** calculates their BMR and TDEE using Mifflin-St Jeor, adjusting BMI ranges specifically for South Asian physiology. 

Next, the **Food Compatibility Engine** recommends balanced regional meal plans—like Rice, Dal, fish, and greens—vetting them for nutritional complementarity and medical safety. 

Users can log meals in Bengali or English. It cross-references them against our Neo4j database. hallucinated LLM values are blocked; only verified nutritional metrics are logged. 

Finally, to make healthy eating accessible, our **Grocery Compare** tool automatically finds and displays ingredient suggestions from local shops, sorted by nearest location and lowest price.

---

## 4. AI Approach & Technical Architecture (30 Seconds | 2:00 - 2:30)

**[Slide: AI Reference Architecture]**

Under the hood, we use a high-performance **5-Layer AI Architecture**:

First, **LangGraph** orchestrates the routing between our specialized agents. 

Second, we utilize a **Dual-RAG engine**: GraphRAG over Neo4j maps complex food, disease, and nutrient nodes with zero hallucinations, while Vector RAG over Pinecone uses Semantic Chunking and Contextual summaries to retrieve recipe data. 

Third, to keep operations fast and cost-effective, we implement token optimization. Pre-hashed MD5 checks and Redis semantic caches resolve similar queries instantly, dropping latencies below 50 milliseconds.

---

## 5. Business Plan & Vision (30 Seconds | 2:30 - 3:00)

**[Slide: Business Model & Roadmap]**

Our business model relies on two strategies: First, B2B collaboration, where we promote direct food sourcing from partner grocery stores. Second, a user freemium model, offering basic tracking for free while unlocking advanced clinical and planner tools in the premium tier.

Moving forward, our next release will introduce a dedicated clinical maternal health and family planning module to address pregnancy-specific dietary needs, and helping hand to the mother/cooking lead for his family wise nutrition companion. 

DesiDiet is not just another tracker—it is a production-ready, clinical-grade companion democratizing healthy living across Bangladesh. 

Thank you, and I am ready for your questions.
