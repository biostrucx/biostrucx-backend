// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connect, getDb } = require('./db');
const sensorRoutes = require('./routes/sensor_routes');
const simulationRoutes = require('./routes/simulation_routes');

const app = express();

// CORS
const allowlist = [
  'http://localhost:5173',
  'https://biostrucx.com',
  'https://www.biostrucx.com',
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowlist.includes(origin)),
  credentials: true
}));
app.use(express.json());

// Salud
app.get('/health', (_, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), db: !!getDb() });
});

// Rutas
app.use('/api/sensors', sensorRoutes);
app.use('/api/simulations', simulationRoutes);

// Start
const PORT = process.env.PORT || 5000;
connect()
  .then(() => {
    app.locals.db = getDb();
    app.listen(PORT, () => console.log(`API running on :${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connect error:', err?.message || err);
    process.exit(1);
  });






