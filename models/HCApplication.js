const mongoose = require('mongoose');

const HCApplicationSchema = new mongoose.Schema({
  // Reference to user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One application per user
  },
  
  // Application details
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  
  qualification: {
    type: String,
    required: true,
    trim: true
  },
  
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  
  // File uploads stored as base64
  profilePicture: {
    data: {
      type: String,
      required: true
    },
    contentType: {
      type: String,
      required: true
    }
  },
  
  aadhaarDocument: {
    data: {
      type: String,
      required: true
    },
    contentType: {
      type: String,
      required: true
    }
  },
  
  // Application status
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  
  // Rejection details
  rejectionReason: {
    type: String,
    default: null
  },
  
  // Admin who processed the application
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Timestamps
  appliedAt: {
    type: Date,
    default: Date.now
  },
  
  processedAt: {
    type: Date,
    default: null
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
HCApplicationSchema.index({ userId: 1 });
HCApplicationSchema.index({ status: 1 });
HCApplicationSchema.index({ email: 1 });

// Pre-save middleware to update timestamp
HCApplicationSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('HCApplication', HCApplicationSchema);