const jwt = require('jsonwebtoken');

const {
  createUser,
  findUserByEmail,
  comparePassword,
  sanitizeUser
} = require('../models/userModel');

const { JWT_SECRET = 'change-this-secret' } = process.env;

/**
 * Generate JWT
 */
function getToken(user) {
  return jwt.sign(
    { sub: user.id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * LOGIN
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // SAFE LOGGING
    console.log(`[AUTH] Login attempt: ${email}`);

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      console.warn(`[AUTH] Login failed - user not found: ${email}`);

      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const passwordMatches = await comparePassword(
      password,
      user.password
    );

    if (!passwordMatches) {
      console.warn(`[AUTH] Login failed - wrong password: ${email}`);

      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const token = getToken(user);

    console.log(`[AUTH] Login successful: ${email}`);

    return res.json({
      user: sanitizeUser(user),
      token
    });

  } catch (err) {
    console.error('[AUTH] Login error:', err.message);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * REGISTER
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // SAFE LOGGING
    console.log(`[AUTH] Register attempt: ${email}`);

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email, and password are required'
      });
    }

    const existing = await findUserByEmail(email);

    if (existing) {
      console.warn(`[AUTH] Register failed - existing email: ${email}`);

      return res.status(409).json({
        error: 'A user with this email already exists'
      });
    }

    const user = await createUser({
      name,
      email,
      password,
      role: 'customer'
    });

    const token = getToken(user);

    console.log(`[AUTH] Register successful: ${email}`);

    return res.status(201).json({
      user: sanitizeUser(user),
      token
    });

  } catch (err) {
    console.error('[AUTH] Register error:', err.message);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * CURRENT USER
 */
function me(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }

    console.log(`[AUTH] Current user request: ${req.user.email}`);

    return res.json(
      sanitizeUser(req.user)
    );

  } catch (err) {
    console.error('[AUTH] Me error:', err.message);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * LOGOUT
 */
async function logout(req, res) {
  try {
    console.log('[AUTH] Logout request');

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (err) {
    console.error('[AUTH] Logout error:', err.message);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

module.exports = {
  login,
  register,
  me,
  logout
};