const { query, execute } = require('./db');
const DAILY_CAPACITY = 3;
const PENDING_APPOINTMENT_LIMIT = 3;

function appointmentSelectSql(whereClause = '') {
  return `SELECT a.*, u.name AS customer_name, u.email AS customer_email, d.name AS design_name, d.thumbnail AS design_thumbnail, d.price AS design_price, d.design AS design_data, d.type AS design_type, d.owner_id AS design_owner FROM appointments a LEFT JOIN users u ON a.user_id = u.id LEFT JOIN designs d ON a.design_id = d.id${whereClause} ORDER BY a.date ASC, a.created_at DESC`;
}

function parseDesignData(designData) {
  if (!designData) return null;
  if (typeof designData === 'object' && !Buffer.isBuffer(designData)) return designData;
  try {
    return JSON.parse(designData.toString());
  } catch (error) {
    return null;
  }
}

function normalizeAppointmentRow(row) {
  if (!row) return null;
  return {
    ...row,
    design: parseDesignData(row.design_data)
  };
}

async function getAllAppointments(filter = {}) {
  const where = [];
  const params = [];
  const tab = filter.tab;

  if (tab === 'completed') {
    where.push('a.status = ?');
    params.push('completed');
  } else {
    where.push('a.status != ?');
    params.push('draft');
    where.push('a.status != ?');
    params.push('completed');
  }

  if (tab === 'paid' || filter.payment === 'paid') {
    where.push('a.paid = 1');
  }
  if (tab === 'pending' || filter.payment === 'pending') {
    where.push('a.paid = 0');
  }

  if (filter.status === 'completed' && tab !== 'completed') {
    where.length = 0;
    params.length = 0;
    where.push('a.status = ?');
    params.push('completed');
  }

  const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const rows = await query(
    appointmentSelectSql(whereClause),
    params
  );
  return rows.map(normalizeAppointmentRow);
}

async function getAppointmentsByDate(date, includeDraft = false) {
  if (includeDraft) {
    return await query('SELECT * FROM appointments WHERE date = ? ORDER BY created_at DESC', [date]);
  }
  return await query('SELECT * FROM appointments WHERE date = ? AND status != ? ORDER BY created_at DESC', [date, 'draft']);
}

async function getDraftAppointmentByUser(userId) {
  const rows = await query(
    'SELECT * FROM appointments WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
    [userId, 'draft']
  );
  return rows[0] || null;
}

async function countPendingAppointmentsByUser(userId) {
  const rows = await query(
    'SELECT COUNT(*) AS count FROM appointments WHERE user_id = ? AND paid = 0 AND status != ? AND status != ?',
    [userId, 'draft', 'completed']
  );
  return rows[0] ? Number(rows[0].count) : 0;
}

async function getAppointmentsByUser(userId, options = {}) {
  const includeDrafts = options.includeDrafts === true;
  const whereClause = includeDrafts
    ? ' WHERE a.user_id = ?'
    : ' WHERE a.user_id = ? AND a.status != ?';
  const params = includeDrafts ? [userId] : [userId, 'draft'];
  const rows = await query(
    appointmentSelectSql(whereClause),
    params
  );
  return rows.map(normalizeAppointmentRow);
}

async function getAvailability(date) {
  const appointments = await getAppointmentsByDate(date);
  return {
    date,
    booked: appointments.length,
    capacity: DAILY_CAPACITY,
    available: appointments.length < DAILY_CAPACITY,
    appointments
  };
}

async function addAppointment({ userId, date, designId, note, status = 'confirmed', amount = 0, deliveryType = 'pickup', deliveryAddress = null }) {
  const [result] = await execute(
    'INSERT INTO appointments (user_id, design_id, date, note, status, amount, delivery_type, delivery_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, designId || null, date, note || null, status, Number(amount) || 0, deliveryType || 'pickup', deliveryAddress || null]
  );
  const rows = await query('SELECT * FROM appointments WHERE id = ?', [result.insertId]);
  return rows[0] || null;
}

async function updateAppointment(id, changes, userId, isAdmin = false) {
  const rows = await query('SELECT * FROM appointments WHERE id = ?', [id]);
  if (!rows || rows.length === 0) return null;
  const appt = rows[0];
  if (!isAdmin && appt.user_id !== userId) {
    throw new Error('Forbidden');
  }

  if (appt.status === 'draft' && changes.status === 'confirmed') {
    const availability = await getAvailability(appt.date);
    if (!availability.available) {
      throw new Error('DateFull');
    }
  }

  if (changes.status === 'completed' && !appt.paid && changes.paid !== 1) {
    throw new Error('NotPaid');
  }

  const updated = {
    design_id: changes.designId !== undefined ? changes.designId : appt.design_id,
    date: changes.date !== undefined ? changes.date : appt.date,
    note: changes.note !== undefined ? changes.note : appt.note,
    status: changes.status !== undefined ? changes.status : appt.status,
    amount: changes.amount !== undefined ? Number(changes.amount) || 0 : appt.amount,
    delivery_type: changes.deliveryType !== undefined ? changes.deliveryType : appt.delivery_type,
    delivery_address: changes.deliveryAddress !== undefined ? changes.deliveryAddress : appt.delivery_address,
    paid: changes.paid !== undefined ? changes.paid : appt.paid,
    paid_at: changes.paid_at !== undefined ? changes.paid_at : appt.paid_at,
    completed_at: changes.completed_at !== undefined ? changes.completed_at : appt.completed_at
  };

  if (updated.status === 'completed' && !updated.completed_at) {
    updated.completed_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  await query(
    'UPDATE appointments SET design_id = ?, date = ?, note = ?, status = ?, amount = ?, delivery_type = ?, delivery_address = ?, paid = ?, paid_at = ?, completed_at = ? WHERE id = ?',
    [updated.design_id, updated.date, updated.note, updated.status, updated.amount, updated.delivery_type, updated.delivery_address, updated.paid, updated.paid_at, updated.completed_at, id]
  );
  const out = await query('SELECT * FROM appointments WHERE id = ?', [id]);
  return out[0];
}

async function removeAppointment(id) {
  const result = await query('DELETE FROM appointments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function removeDraftAppointmentByUser(userId) {
  const result = await query(
    'DELETE FROM appointments WHERE user_id = ? AND status = ?',
    [userId, 'draft']
  );
  return result.affectedRows > 0;
}

module.exports = {
  getAllAppointments,
  getAppointmentsByDate,
  getAppointmentsByUser,
  getDraftAppointmentByUser,
  countPendingAppointmentsByUser,
  getAvailability,
  addAppointment,
  updateAppointment,
  removeAppointment,
  removeDraftAppointmentByUser,
  DAILY_CAPACITY,
  PENDING_APPOINTMENT_LIMIT
};
