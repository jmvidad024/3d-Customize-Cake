const {
  getAvailability,
  addAppointment,
  getAppointmentsByUser,
  getAllAppointments,
  getAppointmentsByDate,
  getDraftAppointmentByUser,
  countPendingAppointmentsByUser,
  PENDING_APPOINTMENT_LIMIT,
  removeAppointment,
  removeDraftAppointmentByUser,
  updateAppointment
} = require('../models/appointmentModel');
const { getDesignById } = require('../models/designModel');

const DELIVERY_FEE_PHP = 250;

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAllowedBookingDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);
  return {
    min: formatDateOnly(today),
    max: formatDateOnly(maxDate)
  };
}

function validateBookingDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return 'Date must use YYYY-MM-DD format';
  }
  const range = getAllowedBookingDateRange();
  if (date < range.min || date > range.max) {
    return `Please choose a date from ${range.min} to ${range.max}`;
  }
  return null;
}

async function availability(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }
  const dateError = validateBookingDate(date);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }
  const available = await getAvailability(date);
  res.json(available);
}

async function book(req, res) {
  const { date, designId, note, status = 'confirmed', deliveryType = 'pickup', deliveryAddress } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }
  const dateError = validateBookingDate(date);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  if (deliveryType !== 'pickup' && !deliveryAddress) {
    return res.status(400).json({ error: 'Delivery address is required for delivery orders' });
  }

  let amount = 0;
  if (designId) {
    const design = await getDesignById(designId);
    if (!design) return res.status(404).json({ error: 'Design not found' });
    amount = Number(design.price || 0);
  }
  if (deliveryType !== 'pickup') amount += DELIVERY_FEE_PHP;

  if (status === 'draft') {
    const existingDraft = await getDraftAppointmentByUser(req.user.id);
    if (existingDraft) {
      const appointment = await updateAppointment(
        existingDraft.id,
        { date, designId, note, status: 'draft', amount, deliveryType, deliveryAddress },
        req.user.id
      );
      return res.json({ success: true, appointment, reusedDraft: true });
    }
  }

  const pendingCount = await countPendingAppointmentsByUser(req.user.id);
  if (pendingCount >= PENDING_APPOINTMENT_LIMIT) {
    return res.status(409).json({
      error: `You can only have ${PENDING_APPOINTMENT_LIMIT} pending cake orders. Please pay an existing pending order before creating another.`
    });
  }

  const availability = await getAvailability(date);
  if (!availability.available) {
    return res.status(409).json({ error: 'Selected date is full' });
  }

  const appointment = await addAppointment({
    userId: req.user.id,
    date,
    designId,
    note,
    status,
    amount,
    deliveryType,
    deliveryAddress
  });
  res.json({ success: true, appointment });
}

async function draft(req, res) {
  try {
    const appointment = await getDraftAppointmentByUser(req.user.id);
    res.json({ success: true, draft: appointment });
  } catch (error) {
    console.error('Draft appointment lookup failed:', error);
    res.status(500).json({ error: 'Unable to load draft appointment' });
  }
}

async function cancelDraft(req, res) {
  try {
    const deleted = await removeDraftAppointmentByUser(req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'No draft appointment found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Draft appointment delete failed:', error);
    res.status(500).json({ error: 'Unable to delete draft appointment' });
  }
}

async function update(req, res) {
  try {
    const id = req.params.id;
    const changes = req.body;
    const isAdmin = ['admin', 'baker'].includes(req.user.role);
    if (changes.status === 'completed' && !isAdmin) {
      return res.status(403).json({ error: 'Only bakers and admins can complete orders' });
    }
    if (changes.date) {
      const dateError = validateBookingDate(changes.date);
      if (dateError) {
        return res.status(400).json({ error: dateError });
      }
    }
    const updated = await updateAppointment(id, changes, req.user.id, isAdmin);
    res.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('Appointment update failed:', error);
    if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    if (error.message === 'DateFull') return res.status(409).json({ error: 'Selected date is full' });
    if (error.message === 'NotPaid') return res.status(409).json({ error: 'Only paid orders can be completed' });
    res.status(500).json({ error: 'Unable to update appointment' });
  }
}

async function pay(req, res) {
  try {
    const id = req.params.id;
    const updated = await updateAppointment(id, { paid: 1, paid_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }, req.user.id, ['admin', 'baker'].includes(req.user.role));
    if (!updated) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ success: true, appointment: updated });
  } catch (error) {
    if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: 'Payment failed' });
  }
}

async function userAppointments(req, res) {
  const appointments = await getAppointmentsByUser(req.user.id);
  res.json(appointments);
}

async function all(req, res) {
  const { date, paid, payment, status, tab } = req.query;
  let appointments;
  if (date) appointments = await getAppointmentsByDate(date);
  else appointments = await getAllAppointments({
    tab,
    payment: payment || (paid === 'true' ? 'paid' : undefined),
    status
  });
  res.json(appointments);
}

async function remove(req, res) {
  const deleted = await removeAppointment(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  res.json({ success: true });
}

module.exports = {
  availability,
  book,
  draft,
  cancelDraft,
  userAppointments,
  all,
  remove,
  update,
  pay
};
