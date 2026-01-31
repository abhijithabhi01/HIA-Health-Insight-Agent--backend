const mongoose = require('mongoose');

// Define file subdocument schema explicitly
const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false
  },
  type: {
    type: String,
    required: false
  },
  url: {
    type: String,
    required: false
  }
}, { _id: false }); // Don't create _id for subdocuments

const messageSchema = new mongoose.Schema({
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
    type: [fileSchema],
    default: []
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'New Analysis'
  },
  messages: {
    type: [messageSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Chat', chatSchema);