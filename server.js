const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const paymentRoutes = require('./routes/payment');

const app = express();

const NODE_ENV = process.env.NODE_ENV || 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://vintageveduka.com';

// Production-safe CORS: allow only the real frontend origins.
const allowedOrigins = [
  'https://vintageveduka.com',
  'https://www.vintageveduka.com',
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

app.disable('x-powered-by');

app.set('trust proxy', 1);

// Health endpoint (matches required contract)
app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, service: 'Vintage Veduka Backend' });
});

// API routes
app.use('/', paymentRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.send('Vintage Veduka Backend is Running 🚀');
});

// 404 JSON handler for unknown API routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralised error handler — never leak stack traces to clients
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vintage Veduka backend listening on port ${PORT} (${NODE_ENV})`);
});

module.exports = app;
