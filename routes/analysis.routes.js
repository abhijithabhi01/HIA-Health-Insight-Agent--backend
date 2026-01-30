const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
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
 * Analyze report from uploaded image (NEW ENDPOINT)
 */
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    console.log('📤 Processing file:', file.originalname, file.mimetype, `${(file.size / 1024).toFixed(2)} KB`);

    // Convert image to base64
    const base64Image = bufferToBase64(file.buffer);
    
    console.log('🔄 Sending to AI model...');
    
    // Send directly to model
    const insight = await analyzeReport({
      imageBase64: base64Image,
      imageType: file.mimetype
    });

    console.log('✅ Analysis complete');

    res.json({ 
      insight,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size
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
 * Analyze report from both text and image (NEW ENDPOINT)
 * Useful when user wants to add notes to an uploaded report
 */
router.post('/hybrid', auth, upload.single('file'), async (req, res) => {
  try {
    const { reportText } = req.body;
    const file = req.file;

    if (!reportText && !file) {
      return res.status(400).json({ 
        error: "Either report text or file is required" 
      });
    }

    console.log('📤 Processing hybrid request');
    if (file) console.log('  - File:', file.originalname, file.mimetype);
    if (reportText) console.log('  - Text length:', reportText.length, 'characters');

    let insight;

    if (file && reportText) {
      // Both provided - send image with additional text context
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

    res.json({ 
      insight,
      source: file ? (reportText ? 'both' : 'file') : 'text',
      fileName: file ? file.originalname : null
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