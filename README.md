# RAG-Enabled AI Chatbot with File Upload and Voice Support

## Project Overview
This project implements a comprehensive RAG-enabled AI chatbot using the Gemini API, with file upload capabilities and voice support. The application allows users to upload various document types, which are processed, indexed, and made available for question-answering through a chat interface with both text and voice interaction options.

## Features
- **File Upload & Management**: Support for PDF, TXT, MD, and image files with drag-and-drop interface
- **RAG-Powered Chat**: Context-aware responses using Retrieval-Augmented Generation
- **Voice Interaction**: Speech-to-text input and text-to-speech output
- **Feedback System**: User feedback collection with moderation capabilities
- **Document Management**: View and delete uploaded documents

## Technology Stack
- **Frontend**: React
- **Backend**: Node.js/Express
- **LLM**: Google Gemini API
- **Vector Database**: Pinecone (with mock implementation for development)
- **Database**: MongoDB (with in-memory option for development)
- **Voice Processing**: Web Speech API

## Project Structure
```
project/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── middleware/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
├── architecture.md
├── requirements.txt
├── requirements-validation.md
├── test-plan.md
├── test-results.md
└── todo.md
```

## Installation & Setup

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_uri (optional)
   GEMINI_API_KEY=AIzaSyD-m3JmxAJmAYYOuA2CXdD8gZv1-y0P_4M
   PINECONE_API_KEY=your_pinecone_api_key (optional)
   PINECONE_ENVIRONMENT=your_pinecone_environment (optional)
   PINECONE_INDEX=rag-chatbot
   JWT_SECRET=your_jwt_secret
   FILE_STORAGE_PATH=./uploads
   ```

4. Start the backend server:
   ```
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Update the API URL in `src/App.js` if needed:
   ```javascript
   const API_URL = 'http://localhost:5000/api';
   ```

4. Start the frontend development server:
   ```
   npm start
   ```

## Usage
1. Access the application at `http://localhost:3000`
2. Upload documents using the sidebar interface
3. Ask questions in the chat interface
4. Use the microphone button for voice input
5. Toggle the speaker button for text-to-speech output
6. Provide feedback on responses using thumbs up/down buttons

## Development Notes
- The application includes a mock implementation of Pinecone for development without actual credentials
- For production deployment, replace the mock with actual Pinecone integration
- The backend supports running without MongoDB by using in-memory storage for development
- For production, ensure proper MongoDB connection is configured

## Deployment
- Backend can be deployed to any Node.js hosting service
- Frontend can be built with `npm run build` and deployed to static hosting
- Ensure environment variables are properly set in production

## Future Enhancements
- Fine-tune Gemini model using corrected Q&A pairs
- Add multi-user support with authentication
- Implement multi-language support
- Integrate with external knowledge bases or CMS systems

## Documentation
- `architecture.md`: Detailed system architecture
- `requirements-validation.md`: Validation against original requirements
- `test-plan.md`: Comprehensive test plan
- `test-results.md`: Test results and limitations
#   R a g - e n a b l e d - a i - c h a t b o t  
 