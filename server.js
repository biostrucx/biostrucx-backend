// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connect } = require('./db');
const sensor_routes = require('./routes/sensor_routes');
const simulation_routes = require('./routes/simulation_routes');

const app = express();

// CORS (puedes usar CORS_ORIGIN en ENV con lista separada por comas)
const allowed =
  (process.env.CORS_ORIGIN || 'http://localhost:5173,https://biostrucx.com,https://www.biostrucx.com')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

app.use(cors({
  origin: (o, cb) => cb(null, !o || allowed.length === 0 || allowed.includes(o)),
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
connect().then(() => {
  // Importante: NO iniciar cron FEM local. Lo hace el worker Python.
  // Si algún día quieres poder activarlo por ENV:
  // if (process.env.START_LOCAL_FEM_JOB === 'true') {
  //   const femJob = require('./jobs/fem_auto');
  //   femJob.start();
  // }

  app.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch(err => {
  console.error('Mongo connect error:', err?.message || err);
  process.exit(1);
});

