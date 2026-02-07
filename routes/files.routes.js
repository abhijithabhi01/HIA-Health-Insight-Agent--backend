const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { auth, isAdmin } = require('../middleware/auth');
const HCApplication = require('../models/HCApplication');

/**
 * Serve profile pictures
 * Users can view their own profile picture
 * Admins can view all profile pictures
 */
router.get('/profile-pictures/:filename', auth, async (req, res, next) => {
  try {
    const { filename } = req.params;
    const userId = req.userId;
    
    // Extract userId from filename (format: userId-timestamp-name.ext)
    const fileUserId = filename.split('-')[0];
    
    // Check authorization
    const user = await require('../models/User').findById(userId);
    const isAuthorized = user.role === 'ADMIN' || userId.toString() === fileUserId;
    
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const filePath = path.join(__dirname, '../uploads/profile-pictures', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filePath);
    
  } catch (err) {
    next(err);
  }
});

/**
 * Serve Aadhaar documents
 * ONLY admins can access these sensitive documents
 */
router.get('/aadhaar-documents/:filename', auth, isAdmin, async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/aadhaar-documents', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Set headers to prevent caching of sensitive documents
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.sendFile(filePath);
    
  } catch (err) {
    next(err);
  }
});

module.exports = router;
