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

async function parseChunks(filePath) {
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
        condition = line.replace('**CONDITION:**', '').trim();
      } else if (line.startsWith('**CATEGORY:**')) {
        category = line.replace('**CATEGORY:**', '').trim();
      } else if (line.startsWith('**KEYWORDS:**') || line.startsWith('**QUERY_TRIGGERS:**')) {
        // We can include these in the text for embedding, or keep as metadata. 
        // For better search, we'll include them in the content string to embed.
        contentLines.push(line);
      } else if (line.length > 0) {
        contentLines.push(line);
      }
    }
    
    chunks.push({
      id: id || `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: contentLines.join('\n'),
      metadata: {
        condition,
        category,
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
    // Wait for index to be ready
    console.log('Waiting for index to initialize...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  } else {
    console.log(`Index ${INDEX_NAME} already exists.`);
  }
}

async function ingest() {
  try {
    console.log('Initializing Pinecone...');
    await initPinecone();
    const index = pinecone.index(INDEX_NAME);
    
    console.log('Loading embedding model...');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    console.log('Parsing data file...');
    const chunks = await parseChunks(path.join(process.cwd(), '..', 'Ragdata.md'));
    console.log(`Found ${chunks.length} chunks. Embeding and uploading...`);
    
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      const vectors = [];
      for (const chunk of batch) {
        const output = await extractor(chunk.text, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);
        
        vectors.push({
          id: chunk.id,
          values: embedding,
          metadata: {
            ...chunk.metadata,
            text: chunk.text // Store text in metadata to retrieve it later
          }
        });
      }
      
      await index.upsert({ records: vectors });
    }
    
    console.log('Ingestion complete!');
  } catch (error) {
    console.error('Error during ingestion:', error);
  }
}

ingest();
