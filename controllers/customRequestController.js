const fs = require('fs');
const path = require('path');
const { query } = require('../models/db');

const CUSTOM_BASE_PRICE_PHP = 1500;
const DELIVERY_FEE_PHP = 250;
const SIZE_PRICES_PHP = {
  6: 0,
  12: 500,
  20: 1000,
  30: 1800
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'custom-requests');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function submitCustomRequest(req, res) {
  try {
    const userId = req.user.id;
    const {
      name,
      occasion,
      servingSize,
      flavor,
      dietary,
      description,
      specialRequests,
      pickupDate,
      deliveryType,
      deliveryAddress
    } = req.body;

    // Validate required fields
    if (!name || !occasion || !servingSize || !flavor || !description || !pickupDate || !deliveryType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (deliveryType === 'delivery' && !deliveryAddress) {
      return res.status(400).json({ error: 'Delivery address required for delivery' });
    }

    // Handle file upload
    let imagePath = null;
    if (req.file) {
      // Generate unique filename
      const originalName = path.basename(req.file.originalname).replace(/[^\w.-]/g, '-');
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${originalName}`;
      const filepath = path.join(uploadsDir, filename);

      // Save file
      fs.writeFileSync(filepath, req.file.buffer);
      imagePath = `/uploads/custom-requests/${filename}`;
    }

    // Calculate price
    const basePrice = CUSTOM_BASE_PRICE_PHP;
    const sizePrice = SIZE_PRICES_PHP[servingSize] || 0;
    const deliveryPrice = deliveryType === 'pickup' ? 0 : DELIVERY_FEE_PHP;

    const estimatedPrice = basePrice + sizePrice + deliveryPrice;

    // Store in database
    await query(
      `INSERT INTO custom_requests 
       (user_id, name, occasion, serving_size, flavor, dietary_needs, description, special_requests, 
        image_path, pickup_date, delivery_type, delivery_address, estimated_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        name,
        occasion,
        servingSize,
        flavor,
        dietary,
        description,
        specialRequests,
        imagePath,
        pickupDate,
        deliveryType,
        deliveryAddress,
        estimatedPrice
      ]
    );

    res.json({ success: true, message: 'Custom request submitted successfully!' });

  } catch (error) {
    console.error('Error submitting custom request:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
}

async function getCustomRequests(req, res) {
  try {
    const userId = req.user.id;

    const requests = await query(
      `SELECT * FROM custom_requests 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(requests);

  } catch (error) {
    console.error('Error fetching custom requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
}

async function getCustomRequestById(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [request] = await query(
      `SELECT * FROM custom_requests 
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(request);

  } catch (error) {
    console.error('Error fetching custom request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
}

async function updateCustomRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, finalPrice, notes } = req.body;

    // Only admins/bakers can update
    if (req.user.role !== 'baker' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await query(
      `UPDATE custom_requests 
       SET status = ?, final_price = ?, baker_notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, finalPrice, notes, id]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Error updating custom request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
}

async function getAllCustomRequests(req, res) {
  try {
    // Only admins/bakers can view all
    if (req.user.role !== 'baker' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const requests = await query(
      `SELECT cr.*, u.name AS customer_name, u.email AS customer_email
       FROM custom_requests cr
       LEFT JOIN users u ON u.id = cr.user_id
       ORDER BY cr.created_at DESC`
    );

    res.json(requests);

  } catch (error) {
    console.error('Error fetching custom requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
}

module.exports = {
  submitCustomRequest,
  getCustomRequests,
  getCustomRequestById,
  updateCustomRequestStatus,
  getAllCustomRequests
};
