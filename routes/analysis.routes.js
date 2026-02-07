const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth } = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { analyzeReport } = require('../services/openrouter.service');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, WebP) and PDFs are allowed.'));
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
 * Helper: Get user role
 */
async function getUserRole(userId) {
  try {
    const user = await User.findById(userId).select('role');
    return user ? user.role : 'USER';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'USER';
  }
}

/**
 * POST /api/analysis/report
 * Analyze report from text input and SAVE TO CHAT
 */
router.post('/report', auth, async (req, res) => {
  let chat = null;

  try {
    const { reportText, chatId } = req.body;

    if (!reportText) {
      return res.status(400).json({ error: "Report text is required" });
    }

    // Get user role for role-based analysis
    const userRole = await getUserRole(req.userId);
    console.log('👤 User role for text analysis:', userRole);

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

    // Create user message object
    const userMessage = {
      role: 'user',
      content: reportText,
      files: [],
      timestamp: new Date()
    };

    // Save user message first
    chat.messages.push(userMessage);

    let insight;
    try {
      console.log('📄 Analyzing text report...');

      // Analyze the text with user role
      insight = await analyzeReport({
        reportText,
        userRole
      });

      console.log('✅ Text analysis complete');
    } catch (analysisError) {
      console.error('❌ Text analysis failed:', analysisError);
      insight = 'Sorry, I encountered an error analyzing your report. Please try again.';
    }

    // Create assistant message object with userRole and uploadedFileName
    const assistantMessage = {
      role: 'assistant',
      content: insight,
      files: [],
      timestamp: new Date(),
      userRole: userRole, // Save userRole for persistence
      uploadedFileName: 'text-input' // Marker for text-based analysis
    };

    // Push assistant message
    chat.messages.push(assistantMessage);
    chat.updatedAt = new Date();

    // Save chat
    await chat.save();

    console.log('💾 Chat saved successfully with text analysis');

    res.json({
      insight,
      userRole, // Include userRole in response
      chatId: chat._id
    });
  } catch (err) {
    console.error("❌ Report analysis error:", err);
    res.status(500).json({ error: "Failed to analyze report" });
  }
});

/**
 * POST /api/analysis/upload
 * Analyze report from uploaded file (image or PDF) and SAVE TO CHAT
 */
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  let chat = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { chatId } = req.body;
    const file = req.file;
    console.log('📤 Processing file:', file.originalname, file.mimetype, `${(file.size / 1024).toFixed(2)} KB`);

    // Get user role for role-based analysis
    const userRole = await getUserRole(req.userId);
    console.log('👤 User role:', userRole);

    // Convert to base64 for frontend display
    const base64File = bufferToBase64(file.buffer);

    // Create data URL for frontend display
    const fileDataUrl = `data:${file.mimetype};base64,${base64File}`;

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
      name: file.originalname,  // ✅ Fixed
      type: file.mimetype,
      url: fileDataUrl
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
      console.log('📄 Sending to AI model...');

      // Analyze the file with user role
      insight = await analyzeReport({
        fileBuffer: file.buffer,
        fileType: file.mimetype,
        userRole
      });

      console.log('✅ Analysis complete');
    } catch (analysisError) {
      console.error('❌ Analysis failed:', analysisError);

      // Save error message as assistant reply
      insight = 'Sorry, I encountered an error analyzing your medical report. Please try again or try uploading a different file.';
    }

    // Create assistant message object with userRole and uploadedFileName for persistence
    const assistantMessage = {
      role: 'assistant',
      content: insight,
      files: [],
      timestamp: new Date(),
      userRole: userRole, // Save userRole for persistence
      uploadedFileName: file.originalname // Save filename for persistence
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
      fileUrl: fileDataUrl,
      userRole // Include role in response for frontend differentiation if needed
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
 * Analyze report from both text and file and SAVE TO CHAT
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

    // Get user role
    const userRole = await getUserRole(req.userId);
    console.log('👤 User role:', userRole);

    let fileDataUrl = null;

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
      const base64File = bufferToBase64(file.buffer);
      fileDataUrl = `data:${file.mimetype};base64,${base64File}`;

      const fileObject = {
        name: String(file.originalname),
        type: String(file.mimetype),
        url: String(fileDataUrl)
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
      // Try to analyze with user role
      if (file && reportText) {
        // Both provided
        insight = await analyzeReport({
          reportText,
          fileBuffer: file.buffer,
          fileType: file.mimetype,
          userRole
        });
      } else if (file) {
        // Only file
        insight = await analyzeReport({
          fileBuffer: file.buffer,
          fileType: file.mimetype,
          userRole
        });
      } else {
        // Only text
        insight = await analyzeReport({
          reportText,
          userRole
        });
      }

      console.log('✅ Hybrid analysis complete');
    } catch (analysisError) {
      console.error('❌ Hybrid analysis failed:', analysisError);
      insight = 'Sorry, I encountered an error analyzing your report. Please try again.';
    }

    // Create assistant message with userRole and uploadedFileName
    const assistantMessage = {
      role: 'assistant',
      content: insight,
      files: [],
      timestamp: new Date(),
      userRole: userRole,
      uploadedFileName: file ? file.originalname : 'text-input'
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
      fileUrl: fileDataUrl,
      userRole
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