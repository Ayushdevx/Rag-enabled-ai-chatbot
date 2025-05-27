const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// Get the Gemini 2.0 Flash model with enhanced configuration
const geminiProModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
  },
});

// Get the embedding model (using text-embedding-004 for better performance)
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

/**
 * Generate embeddings for text using Gemini API
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<Array<number>>} - The embedding vector
 */
async function generateEmbedding(text) {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate a response using the Gemini 2.0 Flash model
 * @param {string} prompt - The prompt to send to the model
 * @param {Array<Object>} context - The context from RAG
 * @returns {Promise<string>} - The generated response
 */
async function generateResponse(prompt, context = []) {
  try {
    // Construct the RAG prompt with context using improved prompting for Gemini 2.0
    let ragPrompt = prompt;

    if (context && context.length > 0) {
      ragPrompt = `
You are an intelligent AI assistant with access to relevant documents. Please answer the following question using the provided context.

**Question:** ${prompt}

**Available Context:**
${context.map((ctx, index) => `
**Document ${index + 1}:**
${ctx.text}
`).join('\n')}

**Instructions:**
- Provide a comprehensive and accurate answer based on the context provided
- If the context contains relevant information, use it to support your response
- If the context doesn't fully address the question, clearly state what information is missing
- Be conversational and helpful in your response
- Cite specific information from the documents when relevant

**Answer:**`;
    } else {
      // Enhanced prompt for general questions without context
      ragPrompt = `
You are a helpful AI assistant. Please provide a comprehensive and accurate answer to the following question:

**Question:** ${prompt}

**Answer:**`;
    }

    const result = await geminiProModel.generateContent(ragPrompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response with Gemini 2.0 Flash:', error);
    throw error;
  }
}

module.exports = {
  generateEmbedding,
  generateResponse
};
