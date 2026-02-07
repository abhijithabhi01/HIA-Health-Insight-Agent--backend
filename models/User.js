const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  
  // Role-based access control
  role: { 
    type: String, 
    enum: ['USER', 'HC', 'ADMIN'], 
    default: 'USER' 
  },
  
  // Account status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Pre-save hook for hashing password
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  // Update timestamp
  this.updatedAt = Date.now();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user has specific role
UserSchema.methods.hasRole = function (role) {
  return this.role === role;
};

// Check if user is admin
UserSchema.methods.isAdmin = function () {
  return this.role === 'ADMIN';
};

// Check if user is HC
UserSchema.methods.isHealthcareAssistant = function () {
  return this.role === 'HC';
};

module.exports = mongoose.model('User', UserSchema);
