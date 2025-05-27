const { Pinecone } = require('@pinecone-database/pinecone');
const config = require('../config/config');
const { generateEmbedding } = require('./geminiService');

// Initialize Pinecone client
let pineconeClient;
let pineconeIndex;

/**
 * Initialize the Pinecone client and index
 */
async function initPinecone() {
  try {
    if (!pineconeIndex) {
      // For development without actual Pinecone credentials, we'll use a mock implementation
      if (!config.pineconeApiKey || !config.pineconeEnvironment) {
        console.warn('Pinecone credentials not provided. Using mock implementation.');
        pineconeIndex = createMockPineconeIndex();
      } else {
        pineconeClient = new Pinecone({
          apiKey: config.pineconeApiKey
        });
        pineconeIndex = pineconeClient.index(config.pineconeIndex);
      }
    }
    return pineconeIndex;
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    throw error;
  }
}

/**
 * Create a mock Pinecone index for development without actual credentials
 */
function createMockPineconeIndex() {
  const mockVectors = [];
  
  return {
    upsert: async ({ vectors }) => {
      vectors.forEach(vector => {
        // Find and remove existing vector with same ID if exists
        const existingIndex = mockVectors.findIndex(v => v.id === vector.id);
        if (existingIndex !== -1) {
          mockVectors.splice(existingIndex, 1);
        }
        mockVectors.push(vector);
      });
      return { upsertedCount: vectors.length };
    },
    query: async ({ vector, topK, filter }) => {
      // Simple cosine similarity calculation
      const calculateCosineSimilarity = (vecA, vecB) => {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
          dotProduct += vecA[i] * vecB[i];
          normA += vecA[i] * vecA[i];
          normB += vecB[i] * vecB[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      };
      
      // Filter vectors if filter is provided
      let filteredVectors = mockVectors;
      if (filter) {
        const filterKeys = Object.keys(filter);
        filteredVectors = mockVectors.filter(v => {
          return filterKeys.every(key => {
            return v.metadata && v.metadata[key] === filter[key];
          });
        });
      }
      
      // Calculate similarities and sort
      const matches = filteredVectors.map(v => ({
        id: v.id,
        score: calculateCosineSimilarity(vector, v.values),
        metadata: v.metadata
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
      
      return { matches };
    },
    delete: async ({ ids }) => {
      const initialLength = mockVectors.length;
      ids.forEach(id => {
        const index = mockVectors.findIndex(v => v.id === id);
        if (index !== -1) {
          mockVectors.splice(index, 1);
        }
      });
      return { deletedCount: initialLength - mockVectors.length };
    }
  };
}

/**
 * Store document chunks in the vector database
 * @param {Array<Object>} chunks - Array of document chunks
 * @param {string} userId - User ID
 * @param {string} fileId - File ID
 * @returns {Promise<Array<string>>} - Array of vector IDs
 */
async function storeDocumentChunks(chunks, userId, fileId) {
  try {
    const index = await initPinecone();
    const vectors = [];
    const vectorIds = [];
    
    // Process chunks in batches to avoid rate limiting
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${fileId}_chunk_${i}`;
      vectorIds.push(chunkId);
      
      const embedding = await generateEmbedding(chunk.text);
      
      vectors.push({
        id: chunkId,
        values: embedding,
        metadata: {
          userId,
          fileId,
          text: chunk.text,
          chunkIndex: i
        }
      });
    }
    
    // Upsert vectors to Pinecone
    await index.upsert({ vectors });
    
    return vectorIds;
  } catch (error) {
    console.error('Error storing document chunks:', error);
    throw error;
  }
}

/**
 * Search for relevant document chunks
 * @param {string} query - The search query
 * @param {string} userId - User ID for filtering
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array<Object>>} - Array of relevant chunks
 */
async function searchRelevantChunks(query, userId, topK = 5) {
  try {
    const index = await initPinecone();
    const queryEmbedding = await generateEmbedding(query);
    
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      filter: { userId }
    });
    
    return results.matches.map(match => ({
      id: match.id,
      score: match.score,
      fileId: match.metadata.fileId,
      text: match.metadata.text
    }));
  } catch (error) {
    console.error('Error searching relevant chunks:', error);
    throw error;
  }
}

/**
 * Delete vectors associated with a file
 * @param {string} fileId - File ID
 * @returns {Promise<number>} - Number of deleted vectors
 */
async function deleteFileVectors(fileId) {
  try {
    const index = await initPinecone();
    
    // Get all vector IDs for the file
    const results = await index.query({
      vector: Array(1536).fill(0), // Dummy vector
      topK: 10000,
      filter: { fileId }
    });
    
    const vectorIds = results.matches.map(match => match.id);
    
    if (vectorIds.length > 0) {
      const result = await index.delete({ ids: vectorIds });
      return result.deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error deleting file vectors:', error);
    throw error;
  }
}

module.exports = {
  initPinecone,
  storeDocumentChunks,
  searchRelevantChunks,
  deleteFileVectors
};
