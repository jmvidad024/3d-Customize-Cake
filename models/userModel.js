const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { query } = require('./db');

async function createUser({ name, email, password, role = 'customer' }) {
  const hashed = await bcrypt.hash(password, 10);
  const id = randomUUID();
  await query(
    'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [id, name, email.toLowerCase(), hashed, role]
  );
  return {
    id,
    name,
    email: email.toLowerCase(),
    role,
    created_at: new Date().toISOString()
  };
}

async function findUserByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  return rows[0] || null;
}

async function findUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function ensureDefaultUsers() {
  const adminUser = await findUserByEmail('admin@cake.com');
  if (!adminUser) {
    await createUser({ name: 'Admin', email: 'admin@cake.com', password: 'admin123', role: 'admin' });
  }
  const bakerUser = await findUserByEmail('baker@cake.com');
  if (!bakerUser) {
    await createUser({ name: 'Baker', email: 'baker@cake.com', password: 'baker123', role: 'baker' });
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  comparePassword,
  ensureDefaultUsers,
  sanitizeUser
};
