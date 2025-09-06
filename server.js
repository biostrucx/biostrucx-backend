require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect, getDb, ensureIndexes } = require('./src/db');

const sensorRoutes = require('./src/routes/sensor_routes');
const simulationRoutes = require('./src/routes/simulation_routes');

const app = express();

// CORS – producción + local
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

// Headers útiles (evita caché del navegador en endpoints críticos)
app.use((req, res, next) => {
  res.set('Vary', 'Origin');
  if (req.path.startsWith('/api/simulations') || req.path.startsWith('/api/sensors')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// Salud
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Rutas
app.use('/api/sensors', sensorRoutes);
app.use('/api/simulations', simulationRoutes);

// Arranque
const PORT = process.env.PORT || 5000;
connect().then(async () => {
  app.locals.db = getDb();
  await ensureIndexes(); // idempotente
  app.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch(err => {
  console.error('Mongo connect error:', err?.message || err);
  process.exit(1);
});


