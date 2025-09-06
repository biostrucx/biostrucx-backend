// routes/simulation_routes.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

/** Util: parsea '5m', '2h', '1d' a milisegundos */
function parseWindowToMs(w = '5m') {
  const m = String(w).match(/^(\d+)\s*([smhd])$/i);
  if (!m) return 5 * 60 * 1000; // 5m por defecto
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
  return n * mult;
}

/** Devuelve el último resultado FEM para el cliente */
async function getLatest(req, res) {
  try {
    const clientid = req.params.clientid;
    const db = getDb();
    const doc = await db.collection('simulation_result')
      .find({ clientid })
      .sort({ ts: -1 })
      .limit(1)
      .next();

    // Front espera objeto o null (no 404)
    return res.json(doc || null);
  } catch (err) {
    console.error('GET latest error:', err);
    return res.status(500).json({ error: 'server' });
  }
}

/** Devuelve serie temporal desde simulation_ts */
async function getSeries(req, res) {
  try {
    const clientid = req.params.clientid;
    const windowMs = parseWindowToMs(req.query.window || '5m');
    const limit = Math.min(Number(req.query.limit) || 300, 2000);
    const since = new Date(Date.now() - windowMs);

    const db = getDb();
    const cursor = db.collection('simulation_ts')
      .find({ clientid, ts: { $gte: since } })
      .sort({ ts: -1 })
      .limit(limit);

    const rows = await cursor.toArray();
    // devolvemos en orden ascendente (tiempo)
    rows.reverse();

    return res.json({
      fem: rows.map(r => ({ ts: r.ts, fem_mm: r.fem_mm }))
    });
  } catch (err) {
    console.error('GET series error:', err);
    return res.status(500).json({ error: 'server' });
  }
}

/* ---- Rutas canónicas (las que usa tu front) ---- */
// /api/simulations/:clientid/latest
router.get('/:clientid/latest', getLatest);
// /api/simulations/:clientid/series
router.get('/:clientid/series', getSeries);

/* ---- Compatibilidad con el formato antiguo por si el front o Postman apuntan así ---- */
// /api/simulations/latest/:clientid
router.get('/latest/:clientid', getLatest);
// /api/simulations/series/:clientid
router.get('/series/:clientid', getSeries);

module.exports = router;
