const jwt = require('jsonwebtoken');

const {
  createUser,
  findUserByEmail,
  comparePassword,
  sanitizeUser
} = require('../models/userModel');

const { JWT_SECRET = 'change-this-secret' } = process.env;

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
    console.log('=== LOGIN REQUEST ===');
    console.log('BODY:', req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');

      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    console.log('Finding user:', email);

    const user = await findUserByEmail(email);

    console.log('USER FOUND:', !!user);

    if (!user) {
      console.log('User does not exist');

      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    console.log('Comparing passwords');

    const passwordMatches = await comparePassword(
      password,
      user.password
    );

    console.log('PASSWORD MATCH:', passwordMatches);

    if (!passwordMatches) {
      console.log('Wrong password');

      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    console.log('Generating token');

    const token = getToken(user);

    console.log('LOGIN SUCCESS');

    return res.json({
      user: sanitizeUser(user),
      token
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);

    return res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * REGISTER
 */
async function register(req, res) {
  try {
    console.log('=== REGISTER REQUEST ===');
    console.log('BODY:', req.body);

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      console.log('Missing fields');

      return res.status(400).json({
        error: 'Name, email, and password are required'
      });
    }

    console.log('Checking existing user');

    const existing = await findUserByEmail(email);

    console.log('EXISTING USER:', !!existing);

    if (existing) {
      console.log('User already exists');

      return res.status(409).json({
        error: 'A user with this email already exists'
      });
    }

    console.log('Creating user');

    const user = await createUser({
      name,
      email,
      password,
      role: 'customer'
    });

    console.log('USER CREATED:', user);

    console.log('Generating token');

    const token = getToken(user);

    console.log('REGISTER SUCCESS');

    return res.json({
      user: sanitizeUser(user),
      token
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);

    return res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * CURRENT USER
 */
function me(req, res) {
  try {
    console.log('ME REQUEST');
    console.log('REQ.USER:', req.user);

    return res.json(sanitizeUser(req.user));

  } catch (err) {
    console.error('ME ERROR:', err);

    return res.status(500).json({
      error: err.message
    });
  }
}

/**
 * LOGOUT
 */
async function logout(req, res) {
  console.log('LOGOUT REQUEST');

  return res.json({
    success: true,
    message: 'Logged out'
  });
}

module.exports = {
  login,
  register,
  me,
  logout
};