const HCApplication = require('../models/HCApplication');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

/**
 * Submit HC Application
 * User can apply to become a Healthcare Assistant
 */
const submitApplication = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { fullName, qualification, companyName } = req.body;
    
    // Validate required fields
    if (!fullName || !qualification || !companyName) {
      return res.status(400).json({ 
        error: 'Full name, qualification, and company name are required' 
      });
    }
    
    // Check if files are uploaded
    if (!req.files || !req.files.profilePicture || !req.files.aadhaarDocument) {
      return res.status(400).json({ 
        error: 'Both profile picture and Aadhaar document are required' 
      });
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user already has an application
    const existingApplication = await HCApplication.findOne({ userId });
    
    if (existingApplication) {
      if (existingApplication.status === 'PENDING') {
        return res.status(400).json({ 
          error: 'You already have a pending application' 
        });
      }
      if (existingApplication.status === 'APPROVED') {
        return res.status(400).json({ 
          error: 'You are already a Healthcare Assistant' 
        });
      }
      // If rejected, allow reapplication by deleting old one
      if (existingApplication.status === 'REJECTED') {
        await HCApplication.findByIdAndDelete(existingApplication._id);
      }
    }
    
    // Read files and convert to base64
    const profilePictureBuffer = req.files.profilePicture[0].buffer;
    const aadhaarDocumentBuffer = req.files.aadhaarDocument[0].buffer;
    
    const profilePictureBase64 = profilePictureBuffer.toString('base64');
    const aadhaarDocumentBase64 = aadhaarDocumentBuffer.toString('base64');
    
    // Get MIME types
    const profilePictureMimeType = req.files.profilePicture[0].mimetype;
    const aadhaarDocumentMimeType = req.files.aadhaarDocument[0].mimetype;
    
    // Create new application with base64 encoded files
    const application = new HCApplication({
      userId,
      fullName,
      email: user.email,
      qualification,
      companyName,
      profilePicture: {
        data: profilePictureBase64,
        contentType: profilePictureMimeType
      },
      aadhaarDocument: {
        data: aadhaarDocumentBase64,
        contentType: aadhaarDocumentMimeType
      },
      status: 'PENDING'
    });
    
    await application.save();
    
    res.status(201).json({
      message: 'HC application submitted successfully',
      application: {
        id: application._id,
        status: application.status,
        appliedAt: application.appliedAt
      }
    });
    
  } catch (err) {
    next(err);
  }
};

/**
 * Get user's own application status
 */
const getMyApplication = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    const application = await HCApplication.findOne({ userId })
      .select('-aadhaarDocument'); // Don't send Aadhaar to user
    
    if (!application) {
      return res.status(404).json({ 
        error: 'No application found',
        hasApplication: false
      });
    }
    
    res.json({
      hasApplication: true,
      application: {
        id: application._id,
        fullName: application.fullName,
        email: application.email,
        qualification: application.qualification,
        companyName: application.companyName,
        profilePicture: application.profilePicture, // Now contains { data, contentType }
        status: application.status,
        rejectionReason: application.rejectionReason,
        appliedAt: application.appliedAt,
        processedAt: application.processedAt
      }
    });
    
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel/Delete own application (only if PENDING)
 */
const cancelApplication = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    const application = await HCApplication.findOne({ userId });
    
    if (!application) {
      return res.status(404).json({ error: 'No application found' });
    }
    
    if (application.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Cannot cancel ${application.status.toLowerCase()} application` 
      });
    }
    
    // Delete the application (files are stored in MongoDB, so they'll be deleted automatically)
    await HCApplication.findByIdAndDelete(application._id);
    
    res.json({ message: 'Application cancelled successfully' });
    
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitApplication,
  getMyApplication,
  cancelApplication
};