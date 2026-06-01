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

const isVercel = Boolean(process.env.VERCEL);
const uploadsDir = isVercel
  ? path.join('/tmp', 'custom-requests')
  : path.join(__dirname, '..', 'public', 'uploads', 'custom-requests');

function ensureUploadsDir() {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function getSafeUploadFilename(originalName) {
  const cleanName = path.basename(originalName || 'cake-reference').replace(/[^\w.-]/g, '-');
  return `${Date.now()}-${Math.random().toString(36).substring(7)}-${cleanName}`;
}

function normalizeCustomRequest(row) {
  if (!row) return null;
  return {
    ...row,
    image_path: row.image_data || row.image_path
  };
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
    let imageData = null;
    let imageMime = null;
    if (req.file) {
      imageMime = req.file.mimetype;
      if (isVercel) {
        imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else {
        ensureUploadsDir();
        const filename = getSafeUploadFilename(req.file.originalname);
        const filepath = path.join(uploadsDir, filename);

        // Save file
        fs.writeFileSync(filepath, req.file.buffer);
        imagePath = `/api/custom-request/image/${filename}`;
      }
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
        image_path, image_data, image_mime, pickup_date, delivery_type, delivery_address, estimated_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
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
        imageData,
        imageMime,
        pickupDate,
        deliveryType,
        deliveryAddress,
        estimatedPrice
      ]
    );

    res.json({ success: true, message: 'Custom request submitted successfully!' });

  } catch (error) {
    console.error('Error submitting custom request:', error);
    res.status(500).json({
      error: 'Failed to submit request',
      details: error.message,
      code: error.code
    });
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

    res.json(requests.map(normalizeCustomRequest));

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

    res.json(normalizeCustomRequest(request));

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
       LEFT JOIN users u
         ON u.id COLLATE utf8mb4_general_ci = cr.user_id COLLATE utf8mb4_general_ci
       ORDER BY cr.created_at DESC`
    );

    res.json(requests.map(normalizeCustomRequest));

  } catch (error) {
    console.error('Error fetching custom requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
}

async function getCustomRequestImage(req, res) {
  const filename = path.basename(req.params.filename || '');
  if (!filename) {
    return res.status(404).end();
  }

  const filepath = path.join(uploadsDir, filename);
  if (!filepath.startsWith(uploadsDir)) {
    return res.status(400).end();
  }

  res.sendFile(filepath, (error) => {
    if (error && !res.headersSent) {
      res.status(error.statusCode || 404).end();
    }
  });
}

module.exports = {
  submitCustomRequest,
  getCustomRequests,
  getCustomRequestById,
  getCustomRequestImage,
  updateCustomRequestStatus,
  getAllCustomRequests
};
