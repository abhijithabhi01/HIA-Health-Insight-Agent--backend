const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  getUserStats,
  updateUserStatus,
  getAllApplications,
  getApplicationStats,
  approveApplication,
  rejectApplication,
  getApplicationById
} = require('../Controllers/admin_controller');

// All admin routes require authentication + admin role
router.use(auth);
router.use(isAdmin);

/**
 * User Management Routes
 */

/**
 * @route   GET /admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin only
 * @query   page, limit, role, search
 */
router.get('/users', getAllUsers);

/**
 * @route   GET /admin/users/stats
 * @desc    Get user statistics
 * @access  Admin only
 */
router.get('/users/stats', getUserStats);

/**
 * @route   PATCH /admin/users/:userId/status
 * @desc    Activate or deactivate a user account
 * @access  Admin only
 */
router.patch('/users/:userId/status', updateUserStatus);

/**
 * HC Application Management Routes
 */

/**
 * @route   GET /admin/applications
 * @desc    Get all HC applications with pagination and filtering
 * @access  Admin only
 * @query   page, limit, status, search
 */
router.get('/applications', getAllApplications);

/**
 * @route   GET /admin/applications/stats
 * @desc    Get application statistics
 * @access  Admin only
 */
router.get('/applications/stats', getApplicationStats);

/**
 * @route   GET /admin/applications/:applicationId
 * @desc    Get single application details
 * @access  Admin only
 */
router.get('/applications/:applicationId', getApplicationById);

/**
 * @route   POST /admin/applications/:applicationId/approve
 * @desc    Approve an HC application
 * @access  Admin only
 */
router.post('/applications/:applicationId/approve', approveApplication);

/**
 * @route   POST /admin/applications/:applicationId/reject
 * @desc    Reject an HC application
 * @access  Admin only
 * @body    { reason: string }
 */
router.post('/applications/:applicationId/reject', rejectApplication);

module.exports = router;
