// routes/simulation_routes.js
const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// GET /api/simulations/:clientid/latest
router.get('/:clientid/latest', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('simulation_result')
      .find({ clientid: req.params.clientid })
      .sort({ ts: -1 })
      .limit(1)
      .next();

    if (!doc) return res.status(404).json({ error: 'no_fem', message: 'no FEM result found' });
    res.json(doc);
  } catch (e) {
    console.error('latest FEM error', e);
    res.status(500).json({ error: 'server' });
  }
});

// GET /api/simulations/:clientid/series?window=5m&limit=300
router.get('/:clientid/series', async (req, res) => {
  try {
    const db = getDb();
    const now = Date.now();
    const windowMs = parseWindow(req.query.window || '5m');
    const since = new Date(now - windowMs);
    const limit = Math.min(Number(req.query.limit) || 300, 2000);

    const fem = await db.collection('simulation_ts')
      .find({ clientid: req.params.clientid, ts: { $gte: since } })
      .sort({ ts: 1 })
      .limit(limit)
      .project({ _id: 0, ts: 1, fem_mm: 1 })
      .toArray();

    // si quieres también devolver real desde sensor_data
    const real = await db.collection('sensor_data')
      .find({ clientid: req.params.clientid, ts: { $gte: since } })
      .sort({ ts: 1 })
      .limit(limit)
      .project({ _id: 0, ts: 1, disp_mm: 1 })
      .toArray();

    res.json({ fem, real });
  } catch (e) {
    console.error('FEM series error', e);
    res.status(500).json({ error: 'server' });
  }
});

function parseWindow(s) {
  const m = /^(\d+)\s*([smhd])$/.exec(String(s).trim());
  if (!m) return 5 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2];
  return n * (unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000);
}

module.exports = router;

