// routes/simulation_routes.js
const express = require('express');
const router = express.Router();

// "5m", "30s", "1h", etc. -> segundos
function parseWindow(w = '5m') {
  const m = String(w).trim().match(/^(\d+)\s*([smhd])$/i);
  if (!m) return 300;
  const n = +m[1];
  const u = m[2].toLowerCase();
  const mult = u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : 86400;
  return n * mult;
}

// GET /api/simulations/:clientid/latest
router.get('/:clientid/latest', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: 'no_db' });

    const { clientid } = req.params;

    const doc = await db.collection('simulation_result')
      .find({ clientid })
      .sort({ ts: -1 })
      .limit(1)
      .toArray();

    // si no hay documento, responde null (el front muestra "sin modelo")
    return res.json(doc[0] || null);
  } catch (e) {
    console.error('sim/latest error:', e);
    return res.status(500).json({ error: 'server' });
  }
});

// GET /api/simulations/:clientid/series?window=5m&limit=300
router.get('/:clientid/series', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: 'no_db' });

    const { clientid } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '300', 10) || 300, 2000);
    const windowSec = parseWindow(req.query.window || '5m');
    const since = new Date(Date.now() - windowSec * 1000);

    const fem = await db.collection('simulation_ts')
      .find({ clientid, ts: { $gte: since } })
      .project({ _id: 0, ts: 1, fem_mm: 1 })
      .sort({ ts: 1 })
      .limit(limit)
      .toArray();

    return res.json({ fem });
  } catch (e) {
    console.error('sim/series error:', e);
    return res.status(500).json({ error: 'server' });
  }
});

module.exports = router;

