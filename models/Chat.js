const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  name: { type: String, required: false },
  type: { type: String, required: false },
  url: { type: String, required: false }
}, { _id: false, strict: false });

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  files: {
    type: [FileSchema],
    default: []
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // New fields for HC functionality persistence
  userRole: {
    type: String,
    enum: ['USER', 'HC', 'ADMIN'],
    default: 'USER'
  },
  uploadedFileName: {
    type: String,
    default: null
  }
}, { strict: false });

const ChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'New Health Chat'
  },
  messages: [MessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
ChatSchema.index({ userId: 1, updatedAt: -1 });
ChatSchema.index({ userId: 1, title: 'text' });

module.exports = mongoose.model('Chat', ChatSchema);