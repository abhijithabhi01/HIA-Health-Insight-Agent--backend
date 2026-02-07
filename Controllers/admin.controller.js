const User = require('../models/User');
const HCApplication = require('../models/HCApplication');
const path = require('path');
const fs = require('fs');

/**
 * Get all users (Admin only)
 * Returns list of all users with basic info
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    
    // Build query
    const query = {};
    if (role && ['USER', 'HC', 'ADMIN'].includes(role)) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await User.countDocuments(query);
    
    res.json({
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        age: user.age,
        gender: user.gender,
        createdAt: user.createdAt
      })),
      totalUsers: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
    
  } catch (err) {
    next(err);
  }
};

/**
 * Get user statistics
 */
const getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    const hcCount = await User.countDocuments({ role: 'HC' });
    const regularUsers = await User.countDocuments({ role: 'USER' });
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    res.json({
      total: totalUsers,
      byRole: {
        admin: adminCount,
        hc: hcCount,
        user: regularUsers
      },
      byStatus: {
        active: activeUsers,
        inactive: inactiveUsers
      }
    });
    
  } catch (err) {
    next(err);
  }
};

/**
 * Update user status (activate/deactivate)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deactivating admins
    if (user.role === 'ADMIN' && !isActive) {
      return res.status(403).json({ error: 'Cannot deactivate admin accounts' });
    }
    
    user.isActive = isActive;
    await user.save();
    
    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
    
  } catch (err) {
    next(err);
  }
};

/**
 * Get all HC applications (Admin only)
 */
const getAllApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    
    // Build query
    const query = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const applications = await HCApplication.find(query)
      .populate('userId', 'name email role')
      .populate('processedBy', 'name email')
      .sort({ appliedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await HCApplication.countDocuments(query);
    
    res.json({
      applications: applications.map(app => ({
        id: app._id,
        fullName: app.fullName,
        email: app.email,
        qualification: app.qualification,
        companyName: app.companyName,
        profilePicture: app.profilePicture,
        aadhaarDocument: app.aadhaarDocument,
        status: app.status,
        rejectionReason: app.rejectionReason,
        appliedAt: app.appliedAt,
        processedAt: app.processedAt,
        user: app.userId ? {
          id: app.userId._id,
          name: app.userId.name,
          email: app.userId.email,
          currentRole: app.userId.role
        } : null,
        processedBy: app.processedBy ? {
          id: app.processedBy._id,
          name: app.processedBy.name
        } : null
      })),
      totalApplications: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
    
  } catch (err) {
    next(err);
  }
};

/**
 * Get HC application statistics
 */
const getApplicationStats = async (req, res, next) => {
  try {
    const totalApplications = await HCApplication.countDocuments();
    const pending = await HCApplication.countDocuments({ status: 'PENDING' });
    const approved = await HCApplication.countDocuments({ status: 'APPROVED' });
    const rejected = await HCApplication.countDocuments({ status: 'REJECTED' });
    
    res.json({
      total: totalApplications,
      byStatus: {
        pending,
        approved,
        rejected
      }
    });
    
  } catch (err) {
    next(err);
  }
};

/**
 * Approve HC application
 */
const approveApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const adminId = req.userId;
    
    const application = await HCApplication.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (application.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Application is already ${application.status.toLowerCase()}` 
      });
    }
    
    // Update user role to HC
    const user = await User.findById(application.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.role = 'HC';
    await user.save();
    
    // Update application status
    application.status = 'APPROVED';
    application.processedBy = adminId;
    application.processedAt = Date.now();
    await application.save();
    
    res.json({
      message: 'Application approved successfully',
      application: {
        id: application._id,
        fullName: application.fullName,
        email: application.email,
        status: application.status,
        processedAt: application.processedAt
      },
      user: {
        id: user._id,
        name: user.name,
        newRole: user.role
      }
    });
    
  } catch (err) {
    next(err);
  }
};

/**
 * Reject HC application
 */
const rejectApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    const adminId = req.userId;
    
    const application = await HCApplication.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (application.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Application is already ${application.status.toLowerCase()}` 
      });
    }
    
    // Update application status
    application.status = 'REJECTED';
    application.rejectionReason = reason || 'Application does not meet requirements';
    application.processedBy = adminId;
    application.processedAt = Date.now();
    await application.save();
    
    res.json({
      message: 'Application rejected successfully',
      application: {
        id: application._id,
        fullName: application.fullName,
        email: application.email,
        status: application.status,
        rejectionReason: application.rejectionReason,
        processedAt: application.processedAt
      }
    });
    
  } catch (err) {
    next(err);
  }
};

/**
 * Get single application details (for viewing documents)
 */
const getApplicationById = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    
    const application = await HCApplication.findById(applicationId)
      .populate('userId', 'name email role age gender')
      .populate('processedBy', 'name email');
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({
      id: application._id,
      fullName: application.fullName,
      email: application.email,
      qualification: application.qualification,
      companyName: application.companyName,
      profilePicture: application.profilePicture,
      aadhaarDocument: application.aadhaarDocument,
      status: application.status,
      rejectionReason: application.rejectionReason,
      appliedAt: application.appliedAt,
      processedAt: application.processedAt,
      user: application.userId ? {
        id: application.userId._id,
        name: application.userId.name,
        email: application.userId.email,
        currentRole: application.userId.role,
        age: application.userId.age,
        gender: application.userId.gender
      } : null,
      processedBy: application.processedBy ? {
        id: application.processedBy._id,
        name: application.processedBy.name,
        email: application.processedBy.email
      } : null
    });
    
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserStats,
  updateUserStatus,
  getAllApplications,
  getApplicationStats,
  approveApplication,
  rejectApplication,
  getApplicationById
};
