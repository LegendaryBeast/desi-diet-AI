import fs from 'fs';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';

dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const INDEX_NAME = process.env.PINECONE_INDEX || 'bd-cooking-rag';
const DIMENSION = 384; // all-MiniLM-L6-v2 dimension

// Anthropic-style Contextual RAG Helper
// Prepends global document context to each chunk to enhance semantic retrieval precision.
function generateChunkContext(condition, category) {
  const cleanCondition = condition ? condition.replace(/\*\*/g, '').trim() : 'general health';
  const cleanCategory = category ? category.replace(/\*\*/g, '').trim() : 'dietary guidelines';
  
  return `This chunk is from the National Dietary Guidelines for Bangladesh. It outlines clinical constraints, allowed/avoided food rules, and nutritional cooking directions for individuals managing the condition: "${cleanCondition}" within the category of "${cleanCategory}".`;
}

async function parseContextualChunks(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks = content.split('---').map(b => b.trim()).filter(b => b.includes('## CHUNK:'));
  
  const chunks = [];
  
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim());
    let id = '';
    let condition = '';
    let category = '';
    let contentLines = [];
    
    for (const line of lines) {
      if (line.startsWith('## CHUNK:')) {
        id = line.replace('## CHUNK:', '').trim();
      } else if (line.startsWith('**CONDITION:**')) {
        condition = line.replace('**CONDITION:**', '').replace('**', '').trim();
      } else if (line.startsWith('**CATEGORY:**')) {
        category = line.replace('**CATEGORY:**', '').replace('**', '').trim();
      } else if (line.startsWith('**KEYWORDS:**') || line.startsWith('**QUERY_TRIGGERS:**')) {
        contentLines.push(line);
      } else if (line.length > 0) {
        contentLines.push(line);
      }
    }
    
    const originalText = contentLines.join('\n');
    const contextPrefix = generateChunkContext(condition, category);
    
    // Anthropic Contextual RAG structure: Prepend context prefix to the raw chunk text
    const contextualizedText = `<context>\n${contextPrefix}\n</context>\n\n${originalText}`;
    
    chunks.push({
      id: id || `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: contextualizedText,
      metadata: {
        condition,
        category,
        context: contextPrefix,
        source: 'Ragdata.md'
      }
    });
  }
  
  return chunks;
}

async function initPinecone() {
  const existingIndexes = await pinecone.listIndexes();
  const indexExists = existingIndexes.indexes.some(idx => idx.name === INDEX_NAME);
  
  if (!indexExists) {
    console.log(`Creating index ${INDEX_NAME}...`);
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: DIMENSION,
      metric: 'cosine',
      spec: { 
        serverless: { 
          cloud: 'aws', 
          region: 'us-east-1' 
        } 
      }
    });
    console.log('Waiting for index to initialize...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  } else {
    console.log(`Index ${INDEX_NAME} already exists.`);
  }
}

async function ingestContextual() {
  try {
    console.log('Initializing Pinecone for Contextual RAG...');
    await initPinecone();
    const index = pinecone.index(INDEX_NAME);
    
    console.log('Loading embedding model...');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    console.log('Parsing data file with Anthropic-style Contextual RAG...');
    const chunks = await parseContextualChunks(path.join(process.cwd(), 'Ragdata.md'));
    console.log(`Found ${chunks.length} chunks. Embedding and uploading contextualized vectors...`);
    
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      const vectors = [];
      for (const chunk of batch) {
        // Embed the fully contextualized text
        const output = await extractor(chunk.text, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);
        
        vectors.push({
          id: chunk.id,
          values: embedding,
          metadata: {
            ...chunk.metadata,
            text: chunk.text // Store contextualized text in metadata
          }
        });
      }
      
      await index.upsert({ records: vectors });
    }
    
    console.log('Contextual RAG Ingestion complete!');
  } catch (error) {
    console.error('Error during Contextual RAG ingestion:', error);
  }
}

ingestContextual();
