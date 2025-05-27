const express = require('express');
const { searchRelevantChunks } = require('../services/vectorDbService');
const { generateResponse } = require('../services/geminiService');
const config = require('../config/config');

const router = express.Router();

// In-memory storage for development mode
let inMemoryChats = [];
let inMemoryReports = [];
let chatIdCounter = 1;

// Conditionally require models only if MongoDB is available
let Chat, Report;
if (config.mongoURI) {
  Chat = require('../models/Chat');
  Report = require('../models/Report');
}

/**
 * Send a message to the chatbot
 * POST /api/chat/message
 */
router.post('/message', async (req, res) => {
  try {
    const { userId, message, chatId } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'User ID and message are required' });
    }

    // Search for relevant chunks in the vector database
    const relevantChunks = await searchRelevantChunks(message, userId);

    // Generate response using Gemini API with RAG context
    const response = await generateResponse(message, relevantChunks);

    // Create or update chat
    let chat;

    if (config.mongoURI && Chat) {
      // Use MongoDB
      if (chatId) {
        // Update existing chat
        chat = await Chat.findById(chatId);

        if (!chat) {
          return res.status(404).json({ error: 'Chat not found' });
        }

        // Add user message
        chat.messages.push({
          role: 'user',
          content: message,
          timestamp: new Date()
        });

        // Add assistant response
        chat.messages.push({
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          sources: relevantChunks.map(chunk => ({
            fileId: chunk.fileId,
            chunkId: chunk.id,
            text: chunk.text
          }))
        });

        await chat.save();
      } else {
        // Create new chat
        chat = await Chat.create({
          userId,
          messages: [
            {
              role: 'user',
              content: message,
              timestamp: new Date()
            },
            {
              role: 'assistant',
              content: response,
              timestamp: new Date(),
              sources: relevantChunks.map(chunk => ({
                fileId: chunk.fileId,
                chunkId: chunk.id,
                text: chunk.text
              }))
            }
          ]
        });
      }

      return res.status(200).json({
        chatId: chat._id,
        message: response,
        sources: relevantChunks.map(chunk => ({
          fileId: chunk.fileId,
          text: chunk.text.substring(0, 150) + '...'
        }))
      });
    } else {
      // Use in-memory storage for development
      if (chatId) {
        // Update existing chat
        chat = inMemoryChats.find(c => c.id === parseInt(chatId));

        if (!chat) {
          return res.status(404).json({ error: 'Chat not found' });
        }

        // Add user message
        chat.messages.push({
          role: 'user',
          content: message,
          timestamp: new Date()
        });

        // Add assistant response
        chat.messages.push({
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          sources: relevantChunks.map(chunk => ({
            fileId: chunk.fileId,
            chunkId: chunk.id,
            text: chunk.text
          }))
        });
      } else {
        // Create new chat
        chat = {
          id: chatIdCounter++,
          userId,
          messages: [
            {
              role: 'user',
              content: message,
              timestamp: new Date()
            },
            {
              role: 'assistant',
              content: response,
              timestamp: new Date(),
              sources: relevantChunks.map(chunk => ({
                fileId: chunk.fileId,
                chunkId: chunk.id,
                text: chunk.text
              }))
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        inMemoryChats.push(chat);
      }

      return res.status(200).json({
        chatId: chat.id,
        message: response,
        sources: relevantChunks.map(chunk => ({
          fileId: chunk.fileId,
          text: chunk.text.substring(0, 150) + '...'
        }))
      });
    }
  } catch (error) {
    console.error('Error processing chat message:', error);
    return res.status(500).json({ error: 'Error processing chat message' });
  }
});

/**
 * Get chat history
 * GET /api/chat/history
 */
router.get('/history', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let chats;

    if (config.mongoURI && Chat) {
      // Use MongoDB
      chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
    } else {
      // Use in-memory storage
      chats = inMemoryChats
        .filter(chat => chat.userId === userId)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return res.status(200).json({ chats });
  } catch (error) {
    console.error('Error getting chat history:', error);
    return res.status(500).json({ error: 'Error getting chat history' });
  }
});

/**
 * Submit feedback on a response
 * POST /api/chat/feedback
 */
router.post('/feedback', async (req, res) => {
  try {
    const { chatId, messageIndex, feedback, reportReason } = req.body;

    if (!chatId || messageIndex === undefined || !feedback) {
      return res.status(400).json({ error: 'Chat ID, message index, and feedback are required' });
    }

    let chat;

    if (config.mongoURI && Chat) {
      // Use MongoDB
      chat = await Chat.findById(chatId);

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (messageIndex >= chat.messages.length) {
        return res.status(400).json({ error: 'Invalid message index' });
      }

      // Update feedback
      chat.messages[messageIndex].feedback = feedback;
      await chat.save();

      // If negative feedback with report reason, create a report
      if (feedback === 'negative' && reportReason && Report) {
        const message = chat.messages[messageIndex];
        const query = chat.messages[messageIndex - 1]?.content || '';

        await Report.create({
          userId: chat.userId,
          query,
          response: message.content,
          sources: message.sources,
          status: 'pending'
        });
      }
    } else {
      // Use in-memory storage
      chat = inMemoryChats.find(c => c.id === parseInt(chatId));

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (messageIndex >= chat.messages.length) {
        return res.status(400).json({ error: 'Invalid message index' });
      }

      // Update feedback
      chat.messages[messageIndex].feedback = feedback;

      // If negative feedback with report reason, create a report
      if (feedback === 'negative' && reportReason) {
        const message = chat.messages[messageIndex];
        const query = chat.messages[messageIndex - 1]?.content || '';

        const report = {
          id: Date.now(),
          userId: chat.userId,
          query,
          response: message.content,
          sources: message.sources,
          status: 'pending',
          createdAt: new Date()
        };
        inMemoryReports.push(report);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({ error: 'Error submitting feedback' });
  }
});

module.exports = router;
