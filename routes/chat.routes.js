const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const { hiaChat } = require('../services/openrouter.service');

/**
 *  CREATE A NEW CHAT
 */
router.post('/chats', auth, async (req, res) => {
  try {
    const { title } = req.body;

    const chat = new Chat({
      userId: req.userId,
      title: title || 'New Health Chat',
      messages: []
    });

    await chat.save();

    res.status(201).json(chat);
  } catch (err) {
    console.error('Create chat error:', err);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});


// 1 SEND MESSAGE IN CHAT
router.post('/chats/:id/messages', auth, async (req, res) => {
  try {
    const chatId = req.params.id;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Build history from existing messages (don't include the new user message yet)
    const history = chat.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Save user message first
    chat.messages.push({ role: 'user', content: message });
    
    let reply;
    try {
      // Call LLM with history and new user message
      reply = await hiaChat({
        history: history,
        userMessage: message
      });

      // Save assistant reply if LLM call succeeds
      chat.messages.push({ role: 'assistant', content: reply });
    } catch (llmError) {
      console.error('LLM call failed:', llmError);
      
      // Save an error message as assistant reply
      const errorReply = 'Sorry, I encountered an error processing your message. Please try again.';
      chat.messages.push({ role: 'assistant', content: errorReply });
      reply = errorReply;
    }

    // Save chat with updated messages
    chat.updatedAt = new Date();
    await chat.save();

    res.json({ reply, chatId: chat._id });
  } catch (err) {
    console.error('Chat message error:', err);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

//  . Search chats 
router.get('/chats/search', auth, async (req, res) => {
  try {
    const q = req.query.q || '';

    const chats = await Chat.find({
      userId: req.userId,
      title: { $regex: q, $options: 'i' }
    }).select('_id title updatedAt');

    res.json(chats);
  } catch (err) {
    console.error('Search chats error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});


//  3. Get all chats
router.get('/chats', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.userId })
      .select('_id title updatedAt')
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});


//  4. Get chat by ID 
router.get('/chats/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(chat);
  } catch (err) {
    console.error('Get chat error:', err);
    res.status(500).json({ error: 'Failed to load chat' });
  }
});


//  5. Delete a specific chat for logged-in user
router.delete('/chats/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ message: 'Chat deleted' });
  } catch (err) {
    console.error('Delete chat error:', err);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});


 // 6. RENAME CHAT TITLE
router.put('/chats/:id/rename', auth, async (req, res) => {
  try {
    const chatId = req.params.id;
    const { title } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        error: 'Title must be at least 3 characters'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, userId: req.userId }, // ownership check
      { title: title.trim(), updatedAt: new Date() },
      { new: true }
    ).select('_id title updatedAt');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({
      message: 'Chat renamed successfully',
      chat
    });
  } catch (err) {
    console.error('Rename chat error:', err);
    res.status(500).json({ error: 'Failed to rename chat' });
  }
});




module.exports = router;