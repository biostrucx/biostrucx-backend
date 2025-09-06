// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connect } = require('./db');           // <- debe exportar la conexión a Mongo
const sensor_routes = require('./routes/sensor_routes');
const simulation_routes = require('./routes/simulation_routes');

const app = express();

// CORS (producción)
const allowed = [
  'http://localhost:5173',
  'https://biostrucx.com',
  'https://www.biostrucx.com',
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  credentials: true,
}));

// cache y headers básicos (colócalo DESPUÉS de crear 'app')
app.use((req, res, next) => {
  // para que los navegadores traten bien el CORS dinámico
  res.set('Vary', 'Origin');
  // nunca caches los endpoints de simulaciones
  if (req.path.startsWith('/api/simulations')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

app.use(express.json());

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Rutas
app.use('/api/sensors', sensor_routes);
app.use('/api/simulations', simulation_routes);

// Start
const PORT = process.env.PORT || 5000;
connect().then((db) => {
  // guarda la DB para usarla dentro de las rutas vía req.app.locals.db
  app.locals.db = db;
  app.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch(err => {
  console.error('Mongo connect error:', err?.message || err);
  process.exit(1);
});







