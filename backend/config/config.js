require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI,
  geminiApiKey: process.env.GEMINI_API_KEY || 'AIzaSyD-m3JmxAJmAYYOuA2CXdD8gZv1-y0P_4M',
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
  pineconeIndex: process.env.PINECONE_INDEX || 'rag-chatbot',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  fileStoragePath: process.env.FILE_STORAGE_PATH || './uploads'
};
