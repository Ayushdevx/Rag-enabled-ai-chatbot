# System Architecture: RAG-Enabled AI Chatbot with Gemini API

## 1. High-Level Architecture

```
[React Frontend]
   |
   |--> Upload Files --> [Node/Express API] --> [Blob Storage]
   |                                     |
   |                                     --> [Text Extraction + Embedding (Gemini API)]
   |                                                  |
   |                                                  --> [Vector DB (Pinecone)]
   |
   |--> Query --> [Node API] --> RAG Search --> Gemini API --> Response
   |                                                 |
   |                                                Feedback
   |
   |<-- TTS Audio Stream <--> STT Input --> Web Speech API
[Moderation Panel] <-- Reported QA logs from main DB
```

## 2. Component Breakdown

### 2.1 Frontend (React)
- **File Upload Component**: Drag-and-drop interface for uploading documents
- **File Management Component**: List view of uploaded files with delete functionality
- **Chat Interface**: Text input, message history, and feedback buttons
- **Voice Interface**: Microphone input and audio output controls

### 2.2 Backend (Node.js/Express)
- **API Layer**: RESTful endpoints for all operations
- **Authentication Service**: JWT-based user authentication (optional)
- **File Processing Service**: 
  - File validation and storage
  - Text extraction from different file types
  - Chunking and embedding generation
- **RAG Service**:
  - Query processing
  - Vector search
  - Context assembly
  - LLM prompt construction
- **Voice Processing Service**:
  - Speech-to-Text conversion
  - Text-to-Speech synthesis
- **Feedback & Moderation Service**:
  - Logging incorrect responses
  - Admin review interface

### 2.3 Data Storage
- **Blob Storage**: For raw file storage (local filesystem for development)
- **Vector Database**: Pinecone for storing and retrieving embeddings
- **Relational/Document Database**: MongoDB for metadata, user data, and feedback logs

### 2.4 External Services
- **Gemini API**: For embeddings and LLM responses
- **Web Speech API**: For browser-based STT/TTS
- **Optional: ElevenLabs**: For higher quality TTS

## 3. Data Flow

### 3.1 File Upload Flow
1. User uploads file through React UI
2. Frontend sends file to Express backend
3. Backend validates file type and size
4. File is stored in blob storage
5. Text is extracted based on file type:
   - Text files: Direct extraction
   - PDFs: Parsed with pdf-parse
   - Images: OCR processing
6. Text is chunked into segments
7. Gemini API generates embeddings for each chunk
8. Embeddings are stored in Pinecone with metadata
9. File metadata is stored in MongoDB
10. Success response sent to frontend

### 3.2 Chat Query Flow
1. User sends query (text or voice)
2. If voice: Web Speech API converts to text
3. Query is sent to backend
4. Backend enhances query for correctness
5. Gemini API generates embedding for query
6. Vector search in Pinecone retrieves relevant chunks
7. Relevant chunks are assembled with query in RAG prompt
8. Prompt is sent to Gemini API
9. Response is returned to frontend
10. If TTS enabled: Response is converted to speech
11. User can provide feedback on response

### 3.3 Moderation Flow
1. User marks response as incorrect
2. Query, response, and context are logged in moderation queue
3. Admin reviews incorrect response
4. Admin provides correct answer
5. Corrected answer is stored for future reference

## 4. API Endpoints

### 4.1 Authentication
- `POST /api/auth/register`: User registration
- `POST /api/auth/login`: User login
- `GET /api/auth/profile`: Get user profile

### 4.2 File Management
- `POST /api/files/upload`: Upload new file
- `GET /api/files`: List user's files
- `DELETE /api/files/:id`: Delete file

### 4.3 Chat
- `POST /api/chat/message`: Send message to chatbot
- `GET /api/chat/history`: Get chat history
- `POST /api/chat/feedback`: Submit feedback on response

### 4.4 Voice
- `POST /api/voice/stt`: Convert speech to text
- `POST /api/voice/tts`: Convert text to speech

### 4.5 Moderation
- `GET /api/moderation/reports`: Get reported responses
- `PUT /api/moderation/reports/:id`: Update report with correction

## 5. Database Schema

### 5.1 Users Collection
```json
{
  "_id": "ObjectId",
  "email": "string",
  "password": "string (hashed)",
  "name": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 5.2 Files Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "filename": "string",
  "originalName": "string",
  "fileType": "string",
  "fileSize": "number",
  "storagePath": "string",
  "vectorIds": ["string"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 5.3 Chats Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "messages": [
    {
      "role": "user|assistant",
      "content": "string",
      "timestamp": "Date",
      "feedback": "positive|negative|null",
      "sources": [
        {
          "fileId": "ObjectId",
          "chunkId": "string",
          "text": "string"
        }
      ]
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 5.4 Reports Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "query": "string",
  "response": "string",
  "sources": [
    {
      "fileId": "ObjectId",
      "chunkId": "string",
      "text": "string"
    }
  ],
  "status": "pending|reviewed",
  "correction": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## 6. Security Considerations

- JWT-based authentication
- Input validation for all API endpoints
- File type validation and scanning
- Rate limiting for API requests
- Secure storage of API keys
- CORS configuration
- XSS protection

## 7. Scalability Considerations

- Modular service architecture
- Asynchronous processing for file uploads and embeddings
- Caching of recent queries and responses
- Horizontal scaling of API servers
- Connection pooling for database access
- Efficient vector search with filtering

## 8. Deployment Considerations

- Containerization with Docker
- Environment-based configuration
- CI/CD pipeline
- Monitoring and logging
- Backup and recovery procedures
