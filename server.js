// server.js
require('dotenv').config();
const express = require('express');

const { connect } = require('./db');
const sensor_routes = require('./routes/sensor_routes');
const simulation_routes = require('./routes/simulation_routes');
// const femJob = require('./jobs/fem_auto'); // <- comenta si usas worker Python

const app = express();

/* --------------------------- CORS MANUAL (sin router) --------------------------- */
// Orígenes permitidos
const WHITELIST = new Set([
  'http://localhost:5173',
  'https://biostrucx.com',
  'https://www.biostrucx.com',
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : [])
]);

// Middleware único: maneja CORS y preflight sin usar app.options()
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin || WHITELIST.has(origin)) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Para caches/proxies
  res.setHeader('Vary', 'Origin');

  // Responder preflight aquí mismo (sin rutas)
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
/* ------------------------------------------------------------------------------- */

app.use(express.json());

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Rutas de negocio
app.use('/api/sensors', sensor_routes);
app.use('/api/simulations', simulation_routes);

// Start
const PORT = process.env.PORT || 5000;
connect().then(() => {
  // if (process.env.ENABLE_FEM_JOB === '1') femJob.start(); // usa esto solo si mantienes el job en Node
  app.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch(err => {
  console.error('Mongo connect error:', err?.message || err);
  process.exit(1);
});


