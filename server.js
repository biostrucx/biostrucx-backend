// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connect, getDb } = require('./db');
const sensor_routes = require('./routes/sensor_routes');
const simulation_routes = require('./routes/simulation_routes');

const app = express(); // <-- crea la app ANTES de usar app.use

// CORS (producción)
const allowed = [
  'http://localhost:5173',
  'https://biostrucx.com',
  'https://www.biostrucx.com',
];
app.use(
  cors({
    origin(origin, cb) {
      // Permite sin origin (curl/health) o si está en la lista
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

// Anti-cache para endpoints de simulación (y Vary para CORS/CDN)
app.use((req, res, next) => {
  res.set('Vary', 'Origin');
  if (req.path.startsWith('/api/simulations')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// Salud
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Rutas
app.use('/api/sensors', sensor_routes);
app.use('/api/simulations', simulation_routes);

// 404 genérico
app.use((req, res) => res.status(404).json({ error: 'not_found' }));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'server' });
});

// Start
const PORT = process.env.PORT || 5000;
connect()
  .then(() => {
    app.locals.db = getDb && getDb();
    app.listen(PORT, () => console.log(`API running on :${PORT}`));
  })
  .catch((err) => {
    console.error('Mongo connect error:', err?.message || err);
    process.exit(1);
  });






