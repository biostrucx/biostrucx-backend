// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connect } = require('./db');
const sensor_routes = require('./routes/sensor_routes');
const simulation_routes = require('./routes/simulation_routes');

const app = express();

// CORS
const allowed = (process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173','https://biostrucx.com','https://www.biostrucx.com']);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  credentials: true
}));
app.use(express.json());

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Rutas
app.use('/api/sensors', sensor_routes);
app.use('/api/simulations', simulation_routes);

// Start
const PORT = process.env.PORT || 5000;
connect()
  .then(() => app.listen(PORT, () => console.log(`API running on :${PORT}`)))
  .catch(err => {
    console.error('Mongo connect error:', err?.message || err);
    process.exit(1);
  });

