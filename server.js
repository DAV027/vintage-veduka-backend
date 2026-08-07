const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const paymentRoutes = require('./routes/payment');

const app = express();

app.use(cors({
  origin: [
    "https://vintageveduka.com",
    "https://www.vintageveduka.com",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// Serve the static frontend (project root)
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.use('/', paymentRoutes);

// Fallback for client-side routes
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Vintage Veduka backend listening on http://localhost:${PORT}`);
});

app.get("/", (req, res) => {
    res.send("Vintage Veduka Backend is Running 🚀");
});