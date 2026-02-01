const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const { analyzeReport } = require('../services/openrouter.service');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.'));
    }
  }
});

/**
 * Helper: Convert buffer to base64
 */
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

/**
 * POST /api/analysis/report
 * Analyze report from text input (EXISTING ENDPOINT - UNCHANGED)
 */
router.post('/report', auth, async (req, res) => {
  try {
    const { reportText } = req.body;

    if (!reportText) {
      return res.status(400).json({ error: "Report text is required" });
    }

    const insight = await analyzeReport({ reportText });

    res.json({ insight });
  } catch (err) {
    console.error("Report analysis error:", err);
    res.status(500).json({ error: "Failed to analyze report" });
  }
});

/**
 * POST /api/analysis/upload
 * Analyze report from uploaded image and SAVE TO CHAT
 */
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  let chat = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { chatId } = req.body; // Optional: chatId from frontend
    const file = req.file;
    console.log('📤 Processing file:', file.originalname, file.mimetype, `${(file.size / 1024).toFixed(2)} KB`);

    // Convert image to base64 for AI analysis
    const base64Image = bufferToBase64(file.buffer);
    
    // Create data URL for frontend display
    const imageDataUrl = `data:${file.mimetype};base64,${base64Image}`;
    
    // Find or create chat
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.userId });
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
    } else {
      // Create new chat for this analysis
      chat = new Chat({
        userId: req.userId,
        title: 'Medical Report Analysis',
        messages: []
      });
    }

    // Create file object with explicit string values
    const fileObject = {
      name: String(file.originalname),
      type: String(file.mimetype),
      url: String(imageDataUrl)
    };

    // Create user message object
    const userMessage = {
      role: 'user',
      content: '📄 Uploaded medical report for analysis',
      files: [fileObject],
      timestamp: new Date()
    };

    // Save user message first
    chat.messages.push(userMessage);

    let insight;
    try {
      console.log('🔄 Sending to AI model...');
      
      // Analyze the image
      insight = await analyzeReport({
        imageBase64: base64Image,
        imageType: file.mimetype
      });

      console.log('✅ Analysis complete');
    } catch (analysisError) {
      console.error('❌ Analysis failed:', analysisError);
      
      // Save error message as assistant reply
      insight = 'Sorry, I encountered an error analyzing your medical report. Please try again or try uploading a different image.';
    }

    // Create assistant message object
    const assistantMessage = {
      role: 'assistant',
      content: insight,
      files: [],
      timestamp: new Date()
    };

    // Push assistant message
    chat.messages.push(assistantMessage);
    chat.updatedAt = new Date();
    
    // Save chat
    await chat.save();

    console.log('💾 Chat saved successfully');

    res.json({ 
      insight,
      chatId: chat._id,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      imageUrl: imageDataUrl // Return for immediate display
    });
    
  } catch (err) {
    console.error("❌ File upload analysis error:", err);
    
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message });
    }
    
    if (err.message && err.message.includes('File too large')) {
      return res.status(400).json({ error: 'File is too large. Maximum size is 10MB.' });
    }
    
    res.status(500).json({ 
      error: "Failed to analyze uploaded file",
      details: err.message 
    });
  }
});

/**
 * POST /api/analysis/hybrid
 * Analyze report from both text and image and SAVE TO CHAT
 */
router.post('/hybrid', auth, upload.single('file'), async (req, res) => {
  let chat = null;
  
  try {
    const { reportText, chatId } = req.body;
    const file = req.file;

    if (!reportText && !file) {
      return res.status(400).json({ 
        error: "Either report text or file is required" 
      });
    }

    console.log('📤 Processing hybrid request');
    if (file) console.log('  - File:', file.originalname, file.mimetype);
    if (reportText) console.log('  - Text length:', reportText.length, 'characters');

    let imageDataUrl = null;
    
    // Find or create chat first
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.userId });
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
    } else {
      chat = new Chat({
        userId: req.userId,
        title: 'Medical Report Analysis',
        messages: []
      });
    }

    // Prepare user message content
    let userContent = reportText || '📄 Uploaded medical report for analysis';
    let userFiles = [];
    
    if (file) {
      const base64Image = bufferToBase64(file.buffer);
      imageDataUrl = `data:${file.mimetype};base64,${base64Image}`;
      
      const fileObject = {
        name: String(file.originalname),
        type: String(file.mimetype),
        url: String(imageDataUrl)
      };
      userFiles.push(fileObject);
    }

    // Create user message
    const userMessage = {
      role: 'user',
      content: userContent,
      files: userFiles,
      timestamp: new Date()
    };

    // Save user message first
    chat.messages.push(userMessage);

    let insight;
    try {
      // Try to analyze
      if (file && reportText) {
        // Both provided
        const base64Image = bufferToBase64(file.buffer);
        insight = await analyzeReport({
          reportText,
          imageBase64: base64Image,
          imageType: file.mimetype
        });
      } else if (file) {
        // Only file
        const base64Image = bufferToBase64(file.buffer);
        insight = await analyzeReport({
          imageBase64: base64Image,
          imageType: file.mimetype
        });
      } else {
        // Only text
        insight = await analyzeReport({ reportText });
      }

      console.log('✅ Hybrid analysis complete');
    } catch (analysisError) {
      console.error('❌ Hybrid analysis failed:', analysisError);
      insight = 'Sorry, I encountered an error analyzing your report. Please try again.';
    }

    // Create assistant message
    const assistantMessage = {
      role: 'assistant',
      content: insight,
      files: [],
      timestamp: new Date()
    };

    // Push assistant message
    chat.messages.push(assistantMessage);
    chat.updatedAt = new Date();
    
    await chat.save();

    res.json({ 
      insight,
      chatId: chat._id,
      source: file ? (reportText ? 'both' : 'file') : 'text',
      fileName: file ? file.originalname : null,
      imageUrl: imageDataUrl
    });
    
  } catch (err) {
    console.error("❌ Hybrid analysis error:", err);
    res.status(500).json({ 
      error: "Failed to analyze report",
      details: err.message 
    });
  }
});

module.exports = router;