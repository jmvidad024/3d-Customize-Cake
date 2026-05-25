require('dotenv').config();
const express = require('express');
const path = require('path');

const { init } = require('./models/db');
const authController = require('./controllers/authController');
const designController = require('./controllers/designController');
const appointmentController = require('./controllers/appointmentController');
const { authenticateToken, requireAuth, requireRole } = require('./middleware/authMiddleware');

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

app.get('/', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/templates.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates.html'));
});

app.get('/dashboard', (req, res) => {
  return res.redirect('/baker-dashboard');
});

app.get('/user-dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html'));
});

app.get('/baker-dashboard', requireRole('baker', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'baker-dashboard.html'));
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
app.get('/api/appointments/user', requireAuth, appointmentController.userAppointments);

app.get('/api/appointments', requireRole('baker', 'admin'), appointmentController.all);

app.post('/api/appointments/:id/pay', requireAuth, appointmentController.pay);
app.patch('/api/appointments/:id', requireAuth, appointmentController.update);
app.delete('/api/appointments/:id', requireRole('baker', 'admin'), appointmentController.remove);

/**
 * -----------------------------
 * STATIC FILES
 * -----------------------------
 */

app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

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