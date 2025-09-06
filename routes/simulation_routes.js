// routes/simulation_routes.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/:clientid/latest', async (req, res) => {
  try {
    const db = getDb();
    const { clientid } = req.params;
    const doc = await db.collection('simulation_result')
      .find({ clientid })
      .sort({ ts: -1 })
      .limit(1)
      .next();
    res.json(doc ?? null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server' });
  }
});

router.get('/:clientid/series', async (req, res) => {
  try {
    const db = getDb();
    const { clientid } = req.params;
    const windowStr = req.query.window || '5m';
    const limit = Math.min(parseInt(req.query.limit || '300', 10), 1000);

    // parse '5m', '30m', '1h'
    const m = windowStr.match(/^(\d+)([smhd])$/i);
    let ms = 5 * 60 * 1000;
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = m[2].toLowerCase();
      const mult = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
      ms = n * mult;
    }
    const since = new Date(Date.now() - ms);

    const fem = await db.collection('simulation_ts')
      .find({ clientid, ts: { $gte: since } })
      .sort({ ts: 1 })
      .limit(limit)
      .toArray();

    res.json({ fem });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;


