// routes/simulation_routes.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Acepta ?windowSec=300 o ?window=5m / 10m / 1h / 1d
function parseWindowSec(q) {
  const { windowSec, window } = q || {};
  if (windowSec != null && !Number.isNaN(Number(windowSec))) {
    const n = Number(windowSec);
    return Math.max(1, Math.min(24 * 3600, n)); // [1s, 24h]
  }
  if (window) {
    const m = String(window).trim().match(/^(\d+)\s*([smhd])$/i);
    if (m) {
      const n = Number(m[1]);
      const unit = m[2].toLowerCase();
      const factor = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
      if (factor) return Math.max(1, Math.min(24 * 3600, n * factor));
    }
  }
  return 300; // por defecto 5 min
}

router.get('/:clientid/latest', async (req, res) => {
  try {
    const db = getDb();
    const clientid = String(req.params.clientid);

    const doc = await db
      .collection('simulation_result')
      .find({ clientid })
      .project({ _id: 0 })
      .sort({ ts: -1 })
      .limit(1)
      .next();

    res.set('Cache-Control', 'no-store');
    return res.json(doc ?? null);
  } catch (err) {
    console.error('simulations/latest error:', err);
    return res.status(500).json({ error: 'server' });
  }
});

router.get('/:clientid/series', async (req, res) => {
  try {
    const db = getDb();
    const clientid = String(req.params.clientid);

    const windowSec = parseWindowSec(req.query);
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 300));
    const since = new Date(Date.now() - windowSec * 1000);

    // OJO: ‘simulation_ts’ debe tener docs con { clientid, ts: Date, fem_mm: Number }
    const femArr = await db
      .collection('simulation_ts')
      .find(
        { clientid, ts: { $gte: since } },
        { projection: { _id: 0, ts: 1, fem_mm: 1 } }
      )
      .sort({ ts: 1 }) // ascendente para graficar
      .limit(limit)
      .toArray();

    res.set('Cache-Control', 'no-store');
    return res.json({ fem: femArr });
  } catch (err) {
    console.error('simulations/series error:', err);
    return res.status(500).json({ error: 'server' });
  }
});

module.exports = router;

