// routes/simulation_routes.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Último modelo FEM para el visor
router.get('/:clientid/latest', async (req, res) => {
  try {
    const db = getDb();
    const { clientid } = req.params;

    const doc = await db.collection('simulation_result')
      .find({ clientid })
      // Proyecta sólo lo que usa el front (evita sorpresas al serializar)
      .project({ _id: 0, clientid: 1, status: 1, ts: 1, model: 1, params: 1, viz: 1 })
      .sort({ ts: -1 })
      .limit(1)
      .next();

    return res.json(doc ?? null);
  } catch (e) {
    console.error('latest error:', e);
    return res.status(500).json({ error: 'server' });
  }
});

// Serie temporal (para el gráfico 1)
router.get('/:clientid/series', async (req, res) => {
  try {
    const db = getDb();
    const { clientid } = req.params;

    const limit = Math.min(Number(req.query.limit) || 300, 2000);
    const windowStr = String(req.query.window || '5m');

    // parsea "5m", "30m", "1h", "2d"
    const m = windowStr.match(/^(\d+)([smhd])$/i);
    let ms = 5 * 60 * 1000;
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = m[2].toLowerCase();
      const mult = unit === 's' ? 1000
        : unit === 'm' ? 60000
        : unit === 'h' ? 3600000
        : 86400000;
      ms = n * mult;
    }

    const since = new Date(Date.now() - ms);

    const fem = await db.collection('simulation_ts')
      .find({ clientid, ts: { $gte: since } })
      .project({ _id: 0, ts: 1, fem_mm: 1 })
      .sort({ ts: 1 })
      .limit(limit)
      .toArray();

    return res.json({ fem });
  } catch (e) {
    console.error('series error:', e);
    return res.status(500).json({ error: 'server' });
  }
});

module.exports = router;


