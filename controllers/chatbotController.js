const chatModel = require('../models/chatbotModel');

async function createTicket(req, res) {
  const { message, designId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  await chatModel.createTicket(req.user.id, message, designId);

  res.json({ success: true });
}

async function getMyChats(req, res) {
  const data = await chatModel.getUserTickets(req.user.id);
  res.json(data);
}

async function getAllChats(req, res) {
  const data = await chatModel.getAllTickets();

  // FORCE ARRAY OUTPUT
  if (!Array.isArray(data)) {
    return res.json([]);
  }

  res.json(data);
}

async function resolveChat(req, res) {
  await chatModel.resolveTicket(req.params.id);
  res.json({ success: true });
}

module.exports = {
  createTicket,
  getMyChats,
  getAllChats,
  resolveChat
};