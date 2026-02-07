const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Standard authentication middleware
 * Verifies JWT token and attaches userId to request
 */
const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {     
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Admin role verification middleware
 * Must be used AFTER auth middleware
 * Checks if authenticated user has ADMIN role
 */
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.' 
      });
    }
    
    // Attach user object to request for convenience
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Healthcare Assistant role verification middleware
 * Must be used AFTER auth middleware
 */
const isHC = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role !== 'HC' && user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Access denied. Healthcare Assistant privileges required.' 
      });
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Role verification middleware factory
 * Usage: requireRole(['ADMIN', 'HC'])
 */
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
        });
      }
      
      req.user = user;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

module.exports = { auth, isAdmin, isHC, requireRole };
