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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
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
 * Analyze report from text input
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
 * Analyze report from uploaded image
 * RECOMMENDED: Send image directly to model for best results
 */
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    console.log('Processing file:', file.originalname, file.mimetype);

    // Convert image to base64
    const base64Image = bufferToBase64(file.buffer);
    
    // Send directly to model
    const insight = await analyzeReport({
      imageBase64: base64Image,
      imageType: file.mimetype
    });

    res.json({ 
      insight,
      fileName: file.originalname,
      fileType: file.mimetype
    });
    
  } catch (err) {
    console.error("File upload analysis error:", err);
    
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: "Failed to analyze uploaded file" });
  }
});

/**
 * POST /api/analysis/hybrid
 * Analyze report from both text and image
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

    res.json({ 
      insight,
      source: file ? (reportText ? 'both' : 'file') : 'text',
      fileName: file ? file.originalname : null
    });
    
  } catch (err) {
    console.error("Hybrid analysis error:", err);
    res.status(500).json({ error: "Failed to analyze report" });
  }
});

module.exports = router;
