const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');

// Import routes
const chatRoutes = require('./routes/chatRoutes');
const fileRoutes = require('./routes/fileRoutes');
const voiceRoutes = require('./routes/voiceRoutes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, config.fileStoragePath)));

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/voice', voiceRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Connect to MongoDB (with fallback to in-memory mode for development)
const startServer = async () => {
  try {
    if (config.mongoURI) {
      await mongoose.connect(config.mongoURI);
      console.log('Connected to MongoDB');
    } else {
      console.warn('MongoDB URI not provided. Running in development mode without database.');
    }
    
    // Start server
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
