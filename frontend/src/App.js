// Frontend implementation for the React application
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// API configuration
const API_URL = 'http://localhost:5000/api';

function App() {
  // State for user authentication
  const [user, setUser] = useState({ id: '123456789012', name: 'Demo User' }); // Mock user for demo
  
  // State for chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for file management
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // State for voice
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Refs
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Initialize with greeting message
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant. You can ask me questions, and I\'ll use your uploaded documents to provide relevant answers. You can also speak to me by clicking the microphone button.',
        timestamp: new Date(),
      }
    ]);
    
    // Fetch user's files
    fetchFiles();
  }, []);
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Fetch user's files
  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/files?userId=${user.id}`);
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const response = await axios.post(`${API_URL}/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      // Add new file to files list
      setFiles([...files, {
        id: response.data.fileId,
        filename: response.data.filename,
        fileType: response.data.fileType,
        fileSize: response.data.fileSize,
        uploadDate: new Date(),
        vectorCount: response.data.chunkCount
      }]);
      
      // Add system message about successful upload
      setMessages([...messages, {
        role: 'assistant',
        content: `File "${response.data.filename}" uploaded successfully. You can now ask questions about its content.`,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Add error message
      setMessages([...messages, {
        role: 'assistant',
        content: `Error uploading file: ${error.response?.data?.error || error.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Handle file deletion
  const handleDeleteFile = async (fileId) => {
    try {
      await axios.delete(`${API_URL}/files/${fileId}?userId=${user.id}`);
      
      // Remove file from files list
      setFiles(files.filter(file => file.id !== fileId));
      
      // Add system message about successful deletion
      setMessages([...messages, {
        role: 'assistant',
        content: 'File deleted successfully.',
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Error deleting file:', error);
      
      // Add error message
      setMessages([...messages, {
        role: 'assistant',
        content: `Error deleting file: ${error.response?.data?.error || error.message}`,
        timestamp: new Date(),
      }]);
    }
  };
  
  // Handle sending message
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/chat/message`, {
        userId: user.id,
        message: userMessage.content,
        chatId
      });
      
      // Update chat ID if not set
      if (!chatId) {
        setChatId(response.data.chatId);
      }
      
      // Add assistant response to chat
      const assistantMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date(),
        sources: response.data.sources
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Convert response to speech if TTS is enabled
      if (isSpeaking) {
        speakText(response.data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.response?.data?.error || error.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle voice input
  const handleVoiceInput = async () => {
    if (!isListening) {
      setIsListening(true);
      
      try {
        // In a real implementation, this would use the Web Speech API
        // For this demo, we'll simulate voice input
        
        // Add "listening" message
        setMessages([...messages, {
          role: 'assistant',
          content: 'Listening...',
          timestamp: new Date(),
        }]);
        
        // Simulate delay for speech recognition
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate recognized text
        const recognizedText = "This is a simulated voice input. In a real implementation, this would use the Web Speech API.";
        
        // Update input field with recognized text
        setInput(recognizedText);
        
        // Remove "listening" message
        setMessages(messages => messages.slice(0, -1));
      } catch (error) {
        console.error('Error with voice input:', error);
        
        // Add error message
        setMessages(messages => [...messages.slice(0, -1), {
          role: 'assistant',
          content: `Error with voice input: ${error.message}`,
          timestamp: new Date(),
        }]);
      } finally {
        setIsListening(false);
      }
    } else {
      setIsListening(false);
      
      // Remove "listening" message if present
      if (messages[messages.length - 1]?.content === 'Listening...') {
        setMessages(messages => messages.slice(0, -1));
      }
    }
  };
  
  // Handle text-to-speech
  const speakText = async (text) => {
    try {
      // In a real implementation, this would use the Web Speech API or ElevenLabs
      // For this demo, we'll just log the text
      console.log('Speaking:', text);
      
      // Simulate TTS with browser's built-in speech synthesis if available
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
    }
  };
  
  // Toggle text-to-speech
  const toggleTTS = () => {
    setIsSpeaking(!isSpeaking);
  };
  
  // Handle feedback
  const handleFeedback = async (messageIndex, feedback, reportReason = null) => {
    try {
      await axios.post(`${API_URL}/chat/feedback`, {
        chatId,
        messageIndex,
        feedback,
        reportReason
      });
      
      // Update message with feedback
      const updatedMessages = [...messages];
      updatedMessages[messageIndex].feedback = feedback;
      setMessages(updatedMessages);
      
      // Add feedback confirmation message
      if (feedback === 'negative' && reportReason) {
        setMessages([...updatedMessages, {
          role: 'assistant',
          content: 'Thank you for your feedback. Your report has been submitted for review.',
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Format date
  const formatDate = (date) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Get file type icon
  const getFileTypeIcon = (fileType) => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'txt': return '📝';
      case 'md': return '📋';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return '🖼️';
      default: return '📁';
    }
  };
  
  return (
    <div className="app">
      <header className="header">
        <h1>RAG-Enabled AI Chatbot</h1>
        <div className="user-info">
          <span>Logged in as: {user.name}</span>
        </div>
      </header>
      
      <div className="main-container">
        <div className="sidebar">
          <div className="file-upload">
            <h2>Upload Files</h2>
            <p>Supported formats: PDF, TXT, MD, PNG, JPG, JPEG, WEBP</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
              disabled={uploading}
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              className="upload-button"
            >
              {uploading ? `Uploading... ${uploadProgress}%` : 'Select File'}
            </button>
            {uploading && (
              <div className="progress-bar">
                <div 
                  className="progress" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
          
          <div className="file-list">
            <h2>Your Files</h2>
            {files.length === 0 ? (
              <p>No files uploaded yet.</p>
            ) : (
              <ul>
                {files.map(file => (
                  <li key={file.id} className="file-item">
                    <div className="file-info">
                      <span className="file-icon">{getFileTypeIcon(file.fileType)}</span>
                      <div className="file-details">
                        <span className="file-name">{file.filename}</span>
                        <span className="file-meta">
                          {formatFileSize(file.fileSize)} • {formatDate(file.uploadDate)}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteFile(file.id)}
                      className="delete-button"
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="chat-container">
          <div className="messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-content">
                  {message.content}
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="message-sources">
                      <details>
                        <summary>Sources ({message.sources.length})</summary>
                        <ul>
                          {message.sources.map((source, i) => (
                            <li key={i}>{source.text}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
                
                <div className="message-meta">
                  <span className="message-time">
                    {formatDate(message.timestamp)}
                  </span>
                  
                  {message.role === 'assistant' && index > 0 && (
                    <div className="message-feedback">
                      <button 
                        onClick={() => handleFeedback(index, 'positive')}
                        className={`feedback-button ${message.feedback === 'positive' ? 'active' : ''}`}
                      >
                        👍
                      </button>
                      <button 
                        onClick={() => {
                          const reason = prompt('Please provide a reason for reporting this response:');
                          if (reason) {
                            handleFeedback(index, 'negative', reason);
                          }
                        }}
                        className={`feedback-button ${message.feedback === 'negative' ? 'active' : ''}`}
                      >
                        👎
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message assistant-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="input-container">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message here..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading || isListening}
            />
            
            <div className="input-buttons">
              <button 
                onClick={handleVoiceInput}
                className={`voice-button ${isListening ? 'listening' : ''}`}
                title="Voice input"
              >
                🎤
              </button>
              
              <button 
                onClick={toggleTTS}
                className={`tts-button ${isSpeaking ? 'active' : ''}`}
                title="Text-to-speech"
              >
                🔊
              </button>
              
              <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="send-button"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
