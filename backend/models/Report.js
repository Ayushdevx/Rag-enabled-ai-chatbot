const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  query: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  sources: [{
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    chunkId: String,
    text: String
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewed'],
    default: 'pending'
  },
  correction: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
