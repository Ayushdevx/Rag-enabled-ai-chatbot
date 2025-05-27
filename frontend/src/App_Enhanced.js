import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './App_Enhanced.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  // Enhanced state management
  const [user, setUser] = useState(null);
  const [sessionData, setSessionData] = useState({});
  const [showUserForm, setShowUserForm] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState('');

  // File management state
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Voice and media state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);

  // Refs
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Initialize app
  useEffect(() => {
    initializeApp();
    initializeSpeechRecognition();
    setupDragAndDrop();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeApp = () => {
    // Add enhanced greeting message
    setMessages([{
      id: 1,
      role: 'assistant',
      content: "🤖 Welcome to your Enhanced AI Assistant by RealIt Solutions! I can help you with:\n\n📄 Document analysis and Q&A\n🖼️ Image analysis and OCR\n🎤 Voice conversations\n📧 Session summaries via email\n\nTo get started, please provide some basic information about yourself.",
      timestamp: new Date().toISOString(),
      isGreeting: true,
      features: [
        { icon: '📄', text: 'Upload and analyze documents' },
        { icon: '🖼️', text: 'Image analysis with OCR' },
        { icon: '🎤', text: 'Voice input and output' },
        { icon: '📧', text: 'Email session summaries' }
      ]
    }]);

    // Show user form after a delay
    setTimeout(() => setShowUserForm(true), 2000);
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        addNotification('Voice recognition error. Please try again.', 'error');
      };
    }
  };

  const setupDragAndDrop = () => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setIsDragOver(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload({ target: { files } });
      }
    };

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const handleUserFormSubmit = async (formData) => {
    setSessionData(formData);
    setUser({
      id: '123456789012',
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company: formData.company
    });
    setShowUserForm(false);
    setSessionStarted(true);

    // Add welcome message with user details
    const welcomeMessage = {
      role: 'assistant',
      content: `Hello ${formData.name}! 👋 I've recorded your session details. How can I assist you today?`,
      timestamp: new Date().toISOString(),
      sessionStart: true
    };

    setMessages(prev => [...prev, welcomeMessage]);
    fetchFiles();
    addNotification('Session started successfully!', 'success');
  };

  const fetchFiles = async () => {
    if (!user) return;

    try {
      const response = await axios.get(`${API_URL}/files?userId=${user.id}`);
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      addNotification('Error fetching files', 'error');
    }
  };

  const handleFileUpload = async (event) => {
    const fileList = event.target.files || event.dataTransfer?.files;
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post(`${API_URL}/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      await fetchFiles();
      addNotification(`File "${response.data.filename}" uploaded successfully!`, 'success');

      // Add system message
      const systemMessage = {
        role: 'assistant',
        content: `📄 File "${response.data.filename}" has been processed and indexed. You can now ask questions about its content!`,
        timestamp: new Date().toISOString(),
        fileUpload: true
      };
      setMessages(prev => [...prev, systemMessage]);

    } catch (error) {
      console.error('Error uploading file:', error);
      addNotification(`Error uploading file: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const messageContent = input.trim();
    const hasImage = selectedImage !== null;

    // Create user message
    const userMessage = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      image: hasImage ? imagePreview : null,
      imageName: hasImage ? selectedImage.name : null
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setImagePreview(null);
    setIsLoading(true);

    try {
      // Prepare request data
      const requestData = {
        userId: user.id,
        message: messageContent,
        chatId,
        hasImage,
        sessionData
      };

      // If image is selected, convert to base64 and include
      if (hasImage) {
        const base64Image = imagePreview.split(',')[1];
        requestData.imageData = base64Image;
        requestData.imageName = selectedImage.name;
      }

      const response = await axios.post(`${API_URL}/chat/message`, requestData);

      if (!chatId) setChatId(response.data.chatId);

      const assistantMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
        sources: response.data.sources,
        confidence: response.data.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Text-to-speech if enabled
      if (isSpeaking) {
        speakText(response.data.message);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      addNotification('Error sending message', 'error');

      const errorMessage = {
        role: 'assistant',
        content: `❌ Error: ${error.response?.data?.error || error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      addNotification('Speech recognition not supported in this browser', 'error');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      addNotification('Listening... Speak now', 'info');
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFeedback = async (messageIndex, feedback, reportReason = null) => {
    try {
      await axios.post(`${API_URL}/chat/feedback`, {
        chatId,
        messageIndex,
        feedback,
        reportReason,
        sessionData
      });

      const updatedMessages = [...messages];
      updatedMessages[messageIndex].feedback = feedback;
      setMessages(updatedMessages);

      if (feedback === 'negative') {
        addNotification('Feedback submitted for review. Thank you!', 'success');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      addNotification('Error submitting feedback', 'error');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await axios.delete(`${API_URL}/files/${fileId}?userId=${user.id}`);
      await fetchFiles();
      addNotification('File deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting file:', error);
      addNotification('Error deleting file', 'error');
    }
  };

  const endSession = async () => {
    if (!chatId) return;

    try {
      const response = await axios.post(`${API_URL}/chat/end-session`, {
        chatId,
        userId: user.id,
        sessionData
      });

      setChatSummary(response.data.summary);
      addNotification('Session ended. Summary will be emailed to you.', 'success');

      // Add session end message
      const endMessage = {
        role: 'assistant',
        content: `📋 Session Summary:\n\n${response.data.summary}\n\n📧 A detailed summary has been sent to your email: ${user.email}`,
        timestamp: new Date().toISOString(),
        isSessionEnd: true
      };
      setMessages(prev => [...prev, endMessage]);

    } catch (error) {
      console.error('Error ending session:', error);
      addNotification('Error ending session', 'error');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const getFileTypeIcon = (fileType) => {
    const icons = {
      pdf: '📄', txt: '📝', md: '📋',
      png: '🖼️', jpg: '🖼️', jpeg: '🖼️', webp: '🖼️'
    };
    return icons[fileType] || '📁';
  };

  // User Form Component
  const UserForm = () => (
    <div className="modal-overlay">
      <div className="user-form-modal">
        <h2>👋 Welcome! Let's get started</h2>
        <p>Please provide some basic information to personalize your experience:</p>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handleUserFormSubmit({
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            company: formData.get('company'),
            purpose: formData.get('purpose')
          });
        }}>
          <div className="form-group">
            <label>Full Name *</label>
            <input type="text" name="name" required placeholder="Enter your full name" />
          </div>
          <div className="form-group">
            <label>Email Address *</label>
            <input type="email" name="email" required placeholder="Enter your email" />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" name="phone" placeholder="Enter your phone number" />
          </div>
          <div className="form-group">
            <label>Company/Organization</label>
            <input type="text" name="company" placeholder="Enter your company name" />
          </div>
          <div className="form-group">
            <label>Purpose of Visit</label>
            <select name="purpose" required>
              <option value="">Select purpose</option>
              <option value="research">Research & Analysis</option>
              <option value="support">Customer Support</option>
              <option value="consultation">Consultation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Start Session</button>
          </div>
        </form>
      </div>
    </div>
  );

  // Notification Component
  const NotificationContainer = () => (
    <div className="notifications">
      {notifications.map(notification => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}>
            ×
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`app ${theme}`}>
      {showUserForm && <UserForm />}
      <NotificationContainer />

      <header className="header">
        <div className="header-left">
          <h1>🤖 Enhanced AI Assistant</h1>
          <span className="powered-by">Powered by RealIt Solutions</span>
        </div>
        <div className="header-right">
          {user && (
            <div className="user-info">
              <span>👤 {user.name}</span>
              <button onClick={() => setShowSettings(!showSettings)} className="settings-btn">
                ⚙️
              </button>
              {sessionStarted && (
                <button onClick={endSession} className="end-session-btn">
                  📋 End Session
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="main-container">
        <div className="sidebar">
          <div className={`file-upload-zone ${isDragOver ? 'drag-over' : ''}`} ref={dropZoneRef}>
            <h3>📁 File Management</h3>
            <div className="upload-area">
              <div className="upload-icon">📤</div>
              <p>Drag & drop files here or click to browse</p>
              <p className="supported-formats">
                Supported: PDF, TXT, MD, PNG, JPG, JPEG, WEBP
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="upload-btn"
              >
                {uploading ? `Uploading... ${uploadProgress}%` : '📎 Select Files'}
              </button>
              {uploading && (
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
            </div>
          </div>

          <div className="file-list">
            <h3>📋 Your Documents ({files.length})</h3>
            {files.length === 0 ? (
              <div className="empty-state">
                <p>No files uploaded yet</p>
                <small>Upload documents to enable RAG-powered conversations</small>
              </div>
            ) : (
              <div className="files">
                {files.map(file => (
                  <div key={file.id} className="file-item">
                    <div className="file-icon">{getFileTypeIcon(file.fileType)}</div>
                    <div className="file-details">
                      <div className="file-name">{file.filename}</div>
                      <div className="file-meta">
                        {formatFileSize(file.fileSize)} • {formatDate(file.uploadDate)}
                      </div>
                      <div className="file-vectors">
                        {file.vectorCount} chunks indexed
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="delete-btn"
                      title="Delete file"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="chat-container">
          <div className="messages" id="messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-content">
                  {message.image && (
                    <div className="message-image">
                      <img src={message.image} alt={message.imageName} />
                      <span className="image-name">{message.imageName}</span>
                    </div>
                  )}

                  <div className="message-text">
                    {message.content}
                  </div>

                  {message.features && (
                    <div className="feature-list">
                      {message.features.map((feature, i) => (
                        <div key={i} className="feature-item">
                          <span className="feature-icon">{feature.icon}</span>
                          <span className="feature-text">{feature.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {message.sources && message.sources.length > 0 && (
                    <div className="message-sources">
                      <details>
                        <summary>📚 Sources ({message.sources.length})</summary>
                        <div className="sources-list">
                          {message.sources.map((source, i) => (
                            <div key={i} className="source-item">
                              <div className="source-text">{source.text}</div>
                              <div className="source-file">From: {source.fileId}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                <div className="message-footer">
                  <span className="message-time">{formatDate(message.timestamp)}</span>

                  {message.role === 'assistant' && !message.isGreeting && (
                    <div className="message-actions">
                      <button
                        onClick={() => handleFeedback(index, 'positive')}
                        className={`feedback-btn ${message.feedback === 'positive' ? 'active' : ''}`}
                        title="Good response"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Please describe what was wrong with this response:');
                          if (reason) handleFeedback(index, 'negative', reason);
                        }}
                        className={`feedback-btn ${message.feedback === 'negative' ? 'active' : ''}`}
                        title="Report incorrect response"
                      >
                        👎
                      </button>
                      <button
                        onClick={() => speakText(message.content)}
                        className="speak-btn"
                        title="Read aloud"
                      >
                        🔊
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            {selectedImage && (
              <div className="image-preview">
                <img src={imagePreview} alt="Selected" />
                <span>{selectedImage.name}</span>
                <button onClick={() => { setSelectedImage(null); setImagePreview(null); }}>×</button>
              </div>
            )}

            <div className="input-area">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "🎤 Listening..." : "Type your message here... (Shift+Enter for new line)"}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className={isListening ? 'listening' : ''}
              />

              <div className="input-actions">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="action-btn"
                  title="Upload image"
                >
                  🖼️
                </button>

                <button
                  onClick={handleVoiceInput}
                  className={`action-btn ${isListening ? 'active' : ''}`}
                  title="Voice input"
                >
                  🎤
                </button>

                <button
                  onClick={() => setIsSpeaking(!isSpeaking)}
                  className={`action-btn ${isSpeaking ? 'active' : ''}`}
                  title="Toggle text-to-speech"
                >
                  🔊
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  className="send-btn"
                >
                  {isLoading ? '⏳' : '📤'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
