const { query } = require('./db');

async function createTicket(userId, message) {
  return query(
    'INSERT INTO chat_tickets (user_id, message) VALUES (?, ?)',
    [userId, message]
  );
}

async function getUserTickets(userId) {
  return query(
    `SELECT * FROM chat_tickets
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
}

async function getAllTickets() {

  return query(
    `SELECT ct.*, u.name AS customer_name
     FROM chat_tickets ct
     JOIN users u ON u.id = ct.user_id
     ORDER BY ct.created_at DESC`
  );

}

async function resolveTicket(id) {
  return query(
    `UPDATE chat_tickets SET status='resolved' WHERE id=?`,
    [id]
  );
}

module.exports = {
  createTicket,
  getUserTickets,
  getAllTickets,
  resolveTicket
};