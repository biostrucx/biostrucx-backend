// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connect } = require('./db');
const sensor_routes = require('./routes/sensor_routes');
const simulation_routes = require('./routes/simulation_routes');

// ⚠️ Si ya usas un worker Python, comenta estas dos líneas:
// const femJob = require('./jobs/fem_auto');
// ... luego en connect().then(() => { /* femJob.start() */ })

const app = express();

/* --------------------------- CORS ROBUSTO --------------------------- */
const envList = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowList = new Set([
  'http://localhost:5173',
  'https://biostrucx.com',
  'https://www.biostrucx.com',
  ...envList
]);

const allowRegex = [
  /\.biostrucx\.com$/,   // cualquier subdominio de biostrucx.com (por si un día usas app.biostrucx.com)
  /\.onrender\.com$/     // llamadas internas desde Render si las necesitas
];

// para que los caches intermedios respeten CORS por Origin
app.use((req, res, next) => { res.header('Vary', 'Origin'); next(); });

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/postman o health-checks sin Origin
    const ok = allowList.has(origin) || allowRegex.some(r => r.test(origin));
    return cb(ok ? null : new Error(`CORS: ${origin} no permitido`), ok);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Responder preflight
app.options('*', cors());
/* ------------------------------------------------------------------- */

app.use(express.json());

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Rutas
app.use('/api/sensors', sensor_routes);
app.use('/api/simulations', simulation_routes);

// Start
const PORT = process.env.PORT || 5000;
connect().then(() => {
  // ⚠️ Si TIENES worker Python, comenta esto:
  // femJob.start();

  app.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch(err => {
  console.error('Mongo connect error:', err?.message || err);
  process.exit(1);
});

