const jwt = require('jsonwebtoken');
const Parent = require('../models/Parent');

const JWT_SECRET = process.env.JWT_SECRET || 'toggletail-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate JWT token for a parent
 */
const generateToken = (parentId) => {
  return jwt.sign({ parentId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Auth middleware - requires valid JWT
 * Attaches parent to req.parent
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get parent from database
    const parent = await Parent.findById(decoded.parentId);
    if (!parent) {
      return res.status(401).json({ error: 'Parent not found' });
    }

    // Attach to request
    req.parent = parent;
    req.parentId = parent._id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional auth middleware - doesn't fail if no token
 * Useful for endpoints that work with or without auth
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (decoded) {
      const parent = await Parent.findById(decoded.parentId);
      if (parent) {
        req.parent = parent;
        req.parentId = parent._id;
      }
    }
    next();
  } catch (error) {
    // Don't fail, just continue without auth
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  JWT_SECRET,
};
