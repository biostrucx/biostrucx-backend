require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connect, getDb } = require('./db');
const sensor_routes = require('./routes/sensor_routes');
const simulation_routes = require('./routes/simulation_routes');

const app = express();

// CORS
const allowed = [
  'http://localhost:5173',
  'https://biostrucx.com',
  'https://www.biostrucx.com',
];
app.use(cors({ origin: (o, cb) => cb(null, !o || allowed.includes(o)), credentials: true }));
app.use(express.json());

// No-cache para las rutas FEM (evita respuestas viejas)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/simulations')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/sensors', sensor_routes);
app.use('/api/simulations', simulation_routes);

const PORT = process.env.PORT || 5000;
connect().then(() => {
  app.locals.db = getDb();
  app.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch(err => {
  console.error('Mongo connect error:', err?.message || err);
  process.exit(1);
});





