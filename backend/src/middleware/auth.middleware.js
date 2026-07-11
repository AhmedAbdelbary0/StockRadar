'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

/**
 * verifyToken
 * -----------
 * Express middleware that extracts the JWT from the Authorization header,
 * verifies its signature, and attaches the decoded payload to req.user.
 *
 * Expected header format: Authorization: Bearer <token>
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No token provided.',
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, full_name, role, iat, exp }
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.',
      });
    }
    logger.warn('Invalid JWT token', { error: err.message, ip: req.ip });
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
    });
  }
}

/**
 * requireRole
 * -----------
 * Higher-order function returning Express middleware that enforces role-based
 * access control. Must be used AFTER verifyToken in the middleware chain.
 *
 * @param {string[]} allowedRoles - Array of role strings permitted for this route.
 *
 * Example usage:
 *   router.post('/batch', verifyToken, requireRole(['FLOOR_STAFF', 'MANAGER']), createBatch);
 *   router.get('/expiry-risk', verifyToken, requireRole(['MANAGER']), getExpiryRisk);
 */
function requireRole(allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Role information missing.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied — insufficient role', {
        user_id: req.user.id,
        user_role: req.user.role,
        required_roles: allowedRoles,
        route: req.originalUrl,
      });
      return res.status(403).json({
        success: false,
        error: `Access denied. This resource requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }

    return next();
  };
}

module.exports = { verifyToken, requireRole };
