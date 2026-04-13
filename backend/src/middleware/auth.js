/**
 * JWT Authentication Middleware
 *
 * Migrated from Mongoose to Prisma.
 * Generates and verifies JWTs; provides requireAuth and optionalAuth middleware.
 */

const jwt    = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET     = process.env.JWT_SECRET || 'toggletail-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate a signed JWT for a parent.
 * @param {number} parentId
 * @returns {string}
 */
const generateToken = (parentId) => {
  return jwt.sign({ parentId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT.
 * Returns the decoded payload, or null if invalid / expired.
 * @param {string} token
 * @returns {object|null}
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

/**
 * requireAuth — middleware that requires a valid Bearer JWT.
 * Attaches the full parent record to req.parent and req.parentId.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Look up the parent in MySQL
    const parent = await prisma.parent.findUnique({
      where: { id: decoded.parentId },
    });

    if (!parent) {
      return res.status(401).json({ error: 'Parent not found' });
    }

    req.parent   = parent;
    req.parentId = parent.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * optionalAuth — same as requireAuth but does NOT reject unauthenticated requests.
 * Useful for endpoints that work with or without authentication.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token   = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (decoded) {
      const parent = await prisma.parent.findUnique({
        where: { id: decoded.parentId },
      });
      if (parent) {
        req.parent   = parent;
        req.parentId = parent.id;
      }
    }
    next();
  } catch {
    // Don't fail — continue without auth
    next();
  }
};

module.exports = { generateToken, verifyToken, requireAuth, optionalAuth, JWT_SECRET };
