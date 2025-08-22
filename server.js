// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connect } = require('./db');
const sensor_routes = require('./routes/sensor_routes');

const app = express();

// CORS básico (ajusta si quieres)
const allowed = ['http://localhost:5173','https://biostrucx.com','https://www.biostrucx.com'];
app.use(cors({ origin: (o, cb) => cb(null, !o || allowed.includes(o)), credentials: true }));
app.use(express.json());

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Sensores
app.use('/api/sensors', sensor_routes);

// Start
const PORT = process.env.PORT || 5000;
connect().then(() => {
  app.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch(err => {
  console.error('Mongo connect error:', err?.message || err);
  process.exit(1);
});


