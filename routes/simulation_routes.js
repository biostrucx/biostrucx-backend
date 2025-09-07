// routes/simulation_routes.js
const express = require('express');
const router = express.Router();
const { col } = require('../db');

// admite "window=5m" O "windowSec=300"
function parseWindow(req) {
  if (req.query.windowSec) {
    const sec = Math.max(1, parseInt(req.query.windowSec, 10) || 300);
    return new Date(Date.now() - sec * 1000);
  }
  const s = String(req.query.window || '5m');
  const m = s.match(/^(\d+)([smhd])$/i);
  const n = m ? parseInt(m[1], 10) : 5;
  const u = m ? m[2].toLowerCase() : 'm';
  const ms = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[u];
  return new Date(Date.now() - n * ms);
}

// GET /api/simulations/:clientid/latest
router.get('/:clientid/latest', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const doc = await col('simulation_result')
      .find({ clientid })
      .sort({ ts: -1 })
      .limit(1)
      .toArray();

    res.json(doc[0] || null);
  } catch (e) {
    console.error('GET /simulations/:clientid/latest error:', e);
    res.status(500).json({ error: 'server' });
  }
});

// GET /api/simulations/:clientid/series?window=5m&limit=300
router.get('/:clientid/series', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const from = parseWindow(req);
    const limit = Math.min(parseInt(req.query.limit || '300', 10), 2000);

    const items = await col('simulation_ts')
      .find({ clientid, ts: { $gte: from } })
      .sort({ ts: 1 })
      .limit(limit)
      .project({ _id: 0, ts: 1, fem_mm: 1 })
      .toArray();

    res.json({ fem: items });
  } catch (e) {
    console.error('GET /simulations/:clientid/series error:', e);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;


