const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { uploadHCFiles, handleMulterError } = require('../middleware/fileUpload');
const {
  submitApplication,
  getMyApplication,
  cancelApplication
} = require('../controllers/hcApplication.controller');

/**
 * @route   POST /hc/apply
 * @desc    Submit HC application
 * @access  Private (authenticated users)
 */
router.post('/apply',auth,uploadHCFiles,handleMulterError,submitApplication);

/**
 * @route   GET /hc/my-application
 * @desc    Get user's own application status
 * @access  Private
 */
router.get('/my-application', auth, getMyApplication);

/**
 * @route   DELETE /hc/my-application
 * @desc    Cancel/delete own application (only if PENDING)
 * @access  Private
 */
router.delete('/my-application', auth, cancelApplication);

module.exports = router;
