const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    feedback: {
      type: String,
      enum: ['positive', 'negative', null],
      default: null
    },
    sources: [{
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
      },
      chunkId: String,
      text: String
    }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
