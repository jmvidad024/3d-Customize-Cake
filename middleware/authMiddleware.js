const jwt = require('jsonwebtoken');
const { findUserById } = require('../models/userModel');

const { JWT_SECRET = 'change-this-secret' } = process.env;

/**
 * AUTHENTICATE TOKEN
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  let token = null;

  // Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);

  // Cookie token
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(c => c.trim());

    for (const c of cookies) {
      if (c.startsWith('cake_token=')) {
        token = c.split('=')[1];
        break;
      }
    }
  }

  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.sub);

    if (user) {
      req.user = user;
    }

  } catch (error) {
    console.warn('[AUTH] Invalid token:', error.message);
  }

  next();
}

/**
 * CHECK AUTH
 */
function requireAuth(req, res, next) {
  if (!req.user) {

    // API REQUEST → JSON
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // PAGE REQUEST → REDIRECT
    return res.redirect('/login');
  }

  next();
}

/**
 * CHECK ROLE
 */
function requireRole(...roles) {
  return (req, res, next) => {

    if (!req.user) {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      return res.redirect('/login');
    }

    if (!roles.includes(req.user.role)) {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(403).json({
          error: 'Forbidden'
        });
      }

      return res.redirect('/');
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireAuth,
  requireRole
};