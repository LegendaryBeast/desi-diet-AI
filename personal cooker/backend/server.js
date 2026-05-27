import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { pipeline } from '@xenova/transformers';
import OpenAI from 'openai';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

const PORT = process.env.PORT || 3000;
const INDEX_NAME = process.env.PINECONE_INDEX || 'bd-cooking-rag';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Initialize Database
const db = new Database('chat_history.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

let extractor;

// Initialize embedding model
async function initExtractor() {
  if (!extractor) {
    console.log('Loading embedding model...');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Embedding model loaded.');
  }
}

initExtractor();

// Rewrite raw user query using LLM
async function rewriteQuery(rawQuery, condition) {
  try {
    const systemPrompt = `You are a search query optimizer for a disease and nutrition database.
Your job is to rewrite the user's raw input query into a highly optimized search query.
- Combine the user's query with their medical condition: ${condition}.
- Extract key food items, symptoms, and nutrients.
- Include both common English terms and common Bengali terms (in English script, e.g. "shak", "mach", "dosh") if relevant.
- OUTPUT ONLY the optimized search keywords. Do not include any introduction, explanations, or quotes. Keep it under 20 words.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawQuery }
      ],
      temperature: 0.1,
      max_tokens: 50
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error rewriting query:', error);
    return rawQuery;
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, condition, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    // Save user message to DB
    const insertStmt = db.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)');
    insertStmt.run(sessionId, 'user', message);

    const userCondition = condition || 'None';

    // 1. Rewrite query for RAG search
    let searchMessage = message;
    if (userCondition !== 'None') {
      searchMessage = await rewriteQuery(message, userCondition);
      console.log(`Rewritten query: "${message}" -> "${searchMessage}"`);
    }

    // 2. Embed the query
    await initExtractor();
    const output = await extractor(searchMessage, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);

    // 3. Query Pinecone with metadata filter
    const queryFilters = {};
    if (userCondition !== 'None') {
      queryFilters.condition = { $eq: userCondition };
    }

    const index = pinecone.index(INDEX_NAME);
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
      ...(Object.keys(queryFilters).length > 0 ? { filter: queryFilters } : {})
    });

    // 3. Construct Context
    const contexts = queryResponse.matches.map(match => {
      return `--- Context from Knowledge Base (Condition: ${match.metadata.condition}) ---\n${match.metadata.text}`;
    });

    const contextStr = contexts.join('\n\n');

    // 4. Construct Prompt (Layer 1 + Layer 2 Structure + Layer 3 Instructions)
    const systemPrompt = `
You are NutriSaathi — a warm, expert, and deeply trusted personal cooking and nutrition guide for Bangladeshi people managing health conditions. You combine medical nutritional knowledge with a genuine understanding of Bangladeshi food culture, ingredients, and cooking traditions.

━━━ YOUR EXPERTISE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are trained on the National Dietary Guidelines for Bangladesh 2022. You understand:
  — Which Bangladeshi foods are safe, restricted, or harmful for each medical condition
  — Local ingredient names in both English and Bengali (e.g., lau = লাউ = bottle gourd)
  — Traditional Bangladeshi cooking methods, spices, and meal patterns
  — How conditions like diabetes, hypertension, CKD, liver disease, obesity, hypothyroidism, TB, diarrhoea, kidney stones, heart disease, and cancer affect dietary needs

━━━ CORE RULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ACCURACY FIRST: Base your answers heavily on the RETRIEVED CONTEXT block below. However, if the context is empty or irrelevant (which can happen if the user speaks in Romanized Bengali/Banglish), you MAY use your general expert nutritional knowledge to answer, provided you strictly adhere to the user's selected Condition.
2. CONDITION-SPECIFIC: Every answer must be tailored to the user's specific condition(s). Always state WHY a food is safe or unsafe.
3. CULTURALLY GROUNDED: Use familiar Bangladeshi ingredient names. Suggest locally available, affordable ingredients.
4. PRECISE AND PRACTICAL: Be specific: give amounts, quantities, timing, and method.
5. LANGUAGE MATCHING: If the user writes in Bengali script (বাংলা), respond in Bengali script. If the user writes in Romanized Bengali (Banglish), respond in Bengali script or English. Always be deeply helpful.
6. FORMATTING: When you give specific suggestions or warnings directly related to the condition, you MUST format those specific sentences in **bold text**.
7. MANDATORY COOKING DETAILS: You MUST NOT provide any answer without including a specific cooking procedure and a detailed list of individual ingredients. If a user asks a general question, you must still provide a relevant recipe with ingredients and a cooking procedure. If you absolutely cannot provide a cooking procedure and ingredients, you must refuse to answer the question.

━━━ RESPONSE FORMAT INSTRUCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Determine the user's intent and follow the matching structure:

A. IF RECIPE REQUEST:
   1. OPENING: Warm acknowledge, state recipe is for ${userCondition}.
   2. RECIPE CARD: Use a box layout with Prep/Cook/Serves. List ingredients with quantities and Bengali names. Numbered steps.
   3. WHY THIS IS SAFE: 2-4 bullets on medical reasoning.
   4. AVOID: 2-3 common ingredients to specifically avoid.
   5. SAFETY NOTE: "⚕️ Always follow your doctor's or dietitian's personal advice..."

B. IF FOOD SAFETY CHECK ("Can I eat X"):
   1. DIRECT VERDICT: Start with YES, LIMITED, or AVOID.
   2. THE REASON: Explain WHY based on ${userCondition}.
   3. IF SAFE/LIMITED: How to enjoy, portion size, pairing.
   4. IF AVOIDED: 3 safe Bangladeshi alternatives.
   5. SAFETY NOTE: Mandatory closing.

C. IF GENERAL GUIDANCE:
   Structure with clear headings and bolded condition-specific advice.

━━━ CONTEXT BLOCK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATIENT PROFILE:
- Condition: ${userCondition}

RETRIEVED MEDICAL KNOWLEDGE (Use ONLY this):
${contextStr}
`;

    // 5. Prepare Messages
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    const historyStmt = db.prepare('SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id ASC');
    const history = historyStmt.all(sessionId);
    const recentHistory = history.slice(-10);

    messages.push(...recentHistory.map(msg => ({ role: msg.role === 'system' ? 'assistant' : msg.role, content: msg.content })));

    // 6. Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.3,
      max_tokens: 4096
    });

    const reply = completion.choices[0].message.content;

    // Save assistant message to DB
    insertStmt.run(sessionId, 'assistant', reply);

    res.json({ reply, contextUsed: queryResponse.matches.map(m => m.id) });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const stmt = db.prepare('SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id ASC');
    const history = stmt.all(sessionId);
    res.json({ history });
  } catch (error) {
    console.error('Error in /api/history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const stmt = db.prepare('DELETE FROM chat_messages WHERE session_id = ?');
    stmt.run(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all unique conditions from CSV
function getConditionsFromCSV() {
  try {
    const csvPath = path.join(process.cwd(), 'disease_nutrients.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split(/\r?\n/);
    const conditions = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      let disease = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          break;
        } else {
          disease += char;
        }
      }
      disease = disease.trim();
      if (disease.startsWith('"') && disease.endsWith('"')) {
        disease = disease.substring(1, disease.length - 1);
      }
      if (disease && !conditions.includes(disease)) {
        conditions.push(disease);
      }
    }
    return conditions.sort();
  } catch (error) {
    console.error('Error reading conditions CSV:', error);
    return [];
  }
}

app.get('/api/conditions', (req, res) => {
  const conditions = getConditionsFromCSV();
  res.json({ conditions });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
