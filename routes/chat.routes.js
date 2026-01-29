const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
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

    // Save user message
    chat.messages.push({ role: 'user', content: message });

    // Call LLM
    const reply = await hiaChat({
      systemPrompt: `
You are Health Insight Agent (HIA).
Explain health topics clearly and safely.
Do not diagnose or prescribe medication.
Use calm, simple language.

IMPORTANT: Always format your responses as clear, organized bullet points.
- Start with a brief 1-2 sentence introduction
- Then break down information into bullet points using "•" or "-"
- Each point should be concise and focused on one key piece of information
- Use sub-bullets for additional details when needed
- End with a brief summary or recommendation if appropriate

Example format:
Here's what your results show:

• **Fasting Blood Sugar**: 100 mg/dL - Within normal range (70-100 mg/dL)
• **HbA1c**: 5.4% - Good control, indicates healthy average blood sugar over past 2-3 months
• **Total Cholesterol**: 180 mg/dL - Below recommended level (<200 mg/dL)
  - HDL (good cholesterol): 52 mg/dL - Above recommended level (>40 mg/dL)
  - LDL (bad cholesterol): 110 mg/dL - Below recommended level (<130 mg/dL)
• **Hemoglobin**: 14.5 g/dL - Within healthy range (13-17 g/dL)
• **Blood Pressure**: 120/80 mmHg - Normal and healthy

Overall, your results indicate a healthy profile. Continue maintaining a balanced lifestyle!
      `,
      history: chat.messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      userMessage: message
    });

    // Save assistant reply
    chat.messages.push({ role: 'assistant', content: reply });
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
