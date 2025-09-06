// routes/sensor_routes.js
const express = require('express');
const router = express.Router();

// Convierte window=5m / 10m / 1h o windowSec=300 en segundos
function parseWindow(query) {
  // Opción 1: windowSec numérico (recomendado)
  if (query.windowSec !== undefined) {
    const n = Number(query.windowSec);
    if (Number.isFinite(n) && n > 0) return n;
  }
  // Opción 2: window con sufijo (5m, 10m, 1h, 2d…)
  const w = (query.window ?? '5m').toString().trim();
  const m = w.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!m) return 300;
  const val = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 60;
  return val * mult;
}

router.get('/latest/:clientid', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { clientid } = req.params;

    const doc = await db
      .collection('sensor_data')
      .find({ clientid })
      .project({ _id: 0 })
      .sort({ ts: -1 })
      .limit(1)
      .next();

    if (!doc) return res.status(404).json(null);
    return res.json(doc);
  } catch (err) {
    console.error('GET /api/sensors/latest error:', err);
    return res.status(500).json({ error: 'server' });
  }
});

router.get('/stream/:clientid', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { clientid } = req.params;

    const windowSec = parseWindow(req.query);
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 300));
    const since = new Date(Date.now() - windowSec * 1000);

    const rows = await db
      .collection('sensor_data')
      .find({ clientid, ts: { $gte: since } })
      .project({ _id: 0 })
      .sort({ ts: 1 })
      .limit(limit)
      .toArray();

    return res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error('GET /api/sensors/stream error:', err);
    return res.status(500).json({ error: 'server' });
  }
});

module.exports = router;


