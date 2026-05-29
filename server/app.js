// Pure Express application — no DB connection, no Firebase init, no app.listen.
// Imported by server.js (production) and by tests (supertest, in-memory DB).
const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: 'Too many auth requests, try again later.' },
});

// ─── Parsing ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ─── Static uploads ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, require('./routes/auth.routes'));
app.use('/api/admin',                      require('./routes/admin.routes'));
app.use('/api/receptionist',               require('./routes/receptionist.routes'));
app.use('/api/teacher',                    require('./routes/teacher.routes'));
app.use('/api/student',                    require('./routes/student.routes'));
app.use('/api/timetable',                  require('./routes/timetable.routes'));
app.use('/api/notifications',              require('./routes/notification.routes'));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV })
);

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
