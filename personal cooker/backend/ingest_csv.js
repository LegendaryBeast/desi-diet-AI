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

function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  
  // Skip header: Disease,Recommended_Nutrients,Notes,References
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = [];
    let inQuotes = false;
    let currentField = '';
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    row.push(currentField.trim());
    
    const cleanedRow = row.map(val => {
      let cleaned = val;
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
      }
      return cleaned.replace(/""/g, '"'); // handle escaped quotes
    });
    
    if (cleanedRow.length >= 4) {
      result.push({
        disease: cleanedRow[0],
        recommendedNutrients: cleanedRow[1],
        notes: cleanedRow[2],
        references: cleanedRow[3]
      });
    }
  }
  return result;
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

async function ingest() {
  try {
    console.log('Initializing Pinecone...');
    await initPinecone();
    const index = pinecone.index(INDEX_NAME);
    
    console.log('Clearing existing vectors in Pinecone...');
    try {
      await index.namespace('').deleteAll();
      console.log('Old vectors deleted successfully.');
    } catch (e) {
      console.warn('Could not delete old vectors (index might be empty):', e.message);
    }

    console.log('Loading embedding model...');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    const csvPath = path.join(process.cwd(), 'disease_nutrients.csv');
    console.log(`Parsing CSV data file from ${csvPath}...`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    console.log(`Found ${rows.length} diseases to ingest.`);

    const chunks = rows.map((row, idx) => {
      const text = `Disease: ${row.disease}\nRecommended Nutrients: ${row.recommendedNutrients}\nNotes: ${row.notes}\nReferences: ${row.references}`;
      return {
        id: `disease-${idx}`,
        text,
        metadata: {
          condition: row.disease,
          category: 'dietary_guidelines',
          source: 'disease_nutrients.csv'
        }
      };
    });

    console.log(`Embedding and uploading ${chunks.length} chunks...`);
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
    
    console.log('Ingestion of disease_nutrients.csv complete!');
  } catch (error) {
    console.error('Error during ingestion:', error);
  }
}

ingest();
