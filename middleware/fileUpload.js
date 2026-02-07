const multer = require('multer');
const path = require('path');

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

// File filter for validation
const fileFilter = (req, file, cb) => {
  // Profile picture: only images
  if (file.fieldname === 'profilePicture') {
    const allowedImageTypes = /jpeg|jpg|png|webp/;
    const extname = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedImageTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Profile picture must be an image (JPEG, JPG, PNG, WEBP)'));
    }
  }
  
  // Aadhaar document: images or PDFs
  else if (file.fieldname === 'aadhaarDocument') {
    const allowedDocTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedDocTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = /image\/(jpeg|jpg|png)|application\/pdf/.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Aadhaar document must be an image or PDF'));
    }
  }
  
  else {
    cb(new Error('Unexpected field'));
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 2 // Max 2 files
  }
});

// Middleware for HC application uploads
const uploadHCFiles = upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'aadhaarDocument', maxCount: 1 }
]);

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files uploaded' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  
  next();
};

module.exports = {
  uploadHCFiles,
  handleMulterError
};