const jwt = require('jsonwebtoken');
const {
  createUser,
  findUserByEmail,
  comparePassword,
  sanitizeUser
} = require('../models/userModel');

const { JWT_SECRET = 'change-this-secret' } = process.env;

function getToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const passwordMatches = await comparePassword(password, user.password);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = getToken(user);
  res.json({ user: sanitizeUser(user), token });
}

async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  const user = await createUser({ name, email, password, role: 'customer' });
  const token = getToken(user);
  res.json({ user: sanitizeUser(user), token });
}

function me(req, res) {
  res.json(sanitizeUser(req.user));
}

async function logout(req, res) {
  // Stateless JWTs: client should clear token. Provide endpoint for symmetry.
  return res.json({ success: true, message: 'Logged out' });
}

module.exports = {
  login,
  register,
  me
  , logout
};
