const jwt = require('jsonwebtoken');
const { findUserById } = require('../models/userModel');

const { JWT_SECRET = 'change-this-secret' } = process.env;

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
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
    console.warn('Invalid auth token:', error.message);
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireAuth,
  requireRole
};
