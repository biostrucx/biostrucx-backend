// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connect, getDb, ensureIndexes } = require('./db');
const sensor_routes = require('./routes/sensor_routes');
const simulation_routes = require('./routes/simulation_routes');

const app = express();

// CORS (ajusta si necesitas)
const ALLOWED = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://biostrucx.com',
  'https://www.biostrucx.com',
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED.includes(origin)),
  credentials: true
}));

app.use(express.json());

// Evitar cache en endpoints de datos
app.use((req, res, next) => {
  res.set('Vary', 'Origin');
  if (req.path.startsWith('/api/simulations') || req.path.startsWith('/api/sensors')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Rutas
app.use('/api/sensors', sensor_routes);
app.use('/api/simulations', simulation_routes);

// Start
const PORT = process.env.PORT || 5000;
connect().then(async () => {
  app.locals.db = getDb();
  await ensureIndexes(); // crea índices si faltan (idempotente)
  app.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch(err => {
  console.error('Mongo connect error:', err?.message || err);
  process.exit(1);
});






