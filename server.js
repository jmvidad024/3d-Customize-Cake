require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');

const { init } = require('./models/db');
const authController = require('./controllers/authController');
const designController = require('./controllers/designController');
const appointmentController = require('./controllers/appointmentController');
const chatbotController = require('./controllers/chatbotController');
const customRequestController = require('./controllers/customRequestController');
const { authenticateToken, requireAuth, requireRole } = require('./middleware/authMiddleware');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
  }
});

const app = express();

app.use(express.json());
app.use(authenticateToken);

/**
 * -----------------------------
 * DB BOOTSTRAP (safe for Vercel)
 * -----------------------------
 * Prevents re-initializing on every request / cold start chaos
 */
let bootstrapped = false;

async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    await init();

    const { ensureDefaultUsers } = require('./models/userModel');
    const { ensureDefaultDesigns } = require('./models/designModel');

    await ensureDefaultUsers();
    await ensureDefaultDesigns();

    console.log('DB initialized successfully');
  } catch (err) {
    console.error('DB initialization failed:', err);
  }
}

// Run bootstrap once per cold start
bootstrap();

/**
 * -----------------------------
 * PAGES
 * -----------------------------
 */

app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const pageRedirects = {
  '/index.html': '/',
  '/templates.html': '/templates',
  '/user-dashboard.html': '/user-dashboard',
  '/help-report.html': '/help-report',
  '/custom-request.html': '/custom-request',
  '/baker-dashboard.html': '/baker-dashboard',
  '/report-dashboard.html': '/report-dashboard',
  '/login.html': '/login'
};

Object.entries(pageRedirects).forEach(([from, to]) => {
  app.get(from, (req, res) => {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, `${to}${query}`);
  });
});

app.get('/', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/templates', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates.html'));
});

app.get('/dashboard', (req, res) => {
  return res.redirect('/baker-dashboard');
});

app.get('/chatbot-dashboard', (req, res) => {
  return res.redirect('/report-dashboard');
});

app.get('/user-dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html'));
});

app.get('/help-report', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'help-report.html'));
});

app.get('/custom-request', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'custom-request.html'));
});

app.get('/baker-dashboard', requireRole('baker', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'baker-dashboard.html'));
});

app.get('/report-dashboard', requireRole('baker', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report-dashboard.html'));
});
/**
 * -----------------------------
 * AUTH API
 * -----------------------------
 */

app.get('/api/users/me', requireAuth, authController.me);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/register', authController.register);
app.post('/api/auth/logout', authController.logout);

/**
 * -----------------------------
 * DESIGN API
 * -----------------------------
 */

app.get('/api/designs', designController.getAll);
app.get('/api/designs/:id', designController.getOne);
app.post('/api/designs', requireAuth, designController.create);
app.patch('/api/designs/:id', requireAuth, designController.update);
app.delete('/api/designs/:id', requireAuth, designController.remove);

/**
 * -----------------------------
 * APPOINTMENTS API
 * -----------------------------
*/

app.get('/api/appointments/availability', appointmentController.availability);
app.post('/api/appointments/book', requireAuth, appointmentController.book);
app.get('/api/appointments/draft', requireAuth, appointmentController.draft);
app.delete('/api/appointments/draft', requireAuth, appointmentController.cancelDraft);
app.get('/api/appointments/user', requireAuth, appointmentController.userAppointments);

app.get('/api/appointments', requireRole('baker', 'admin'), appointmentController.all);

app.post('/api/appointments/:id/pay', requireAuth, appointmentController.pay);
app.patch('/api/appointments/:id', requireAuth, appointmentController.update);
app.delete('/api/appointments/:id', requireRole('baker', 'admin'), appointmentController.remove);

/**
 * CUSTOM REQUEST API
 */

app.post('/api/custom-request', requireAuth, upload.single('image'), customRequestController.submitCustomRequest);
app.get('/api/custom-request', requireAuth, customRequestController.getCustomRequests);
app.get('/api/custom-request/admin/all', requireRole('baker', 'admin'), customRequestController.getAllCustomRequests);
app.get('/api/custom-request/:id', requireAuth, customRequestController.getCustomRequestById);
app.patch('/api/custom-request/:id', requireRole('baker', 'admin'), customRequestController.updateCustomRequestStatus);

/**
 * -----------------------------
 * CHATBOT API
 * -----------------------------
*/

// CUSTOMER chat
app.post('/api/chat', requireAuth, chatbotController.createTicket);
app.get('/api/chat', requireAuth, chatbotController.getMyChats);

// ADMIN chat logs
app.get('/api/chat/admin', requireRole('baker', 'admin'), chatbotController.getAllChats);
app.patch('/api/chat/:id', requireRole('baker', 'admin'), chatbotController.resolveChat);

/**
 * -----------------------------
 * STATIC FILES
 * -----------------------------
 */

app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

/**
 * -----------------------------
 * IMPORTANT FOR VERCEL
 * -----------------------------
 * DO NOT use app.listen()
 */

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
