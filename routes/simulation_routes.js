// routes/simulation_routes.js
const router = require('express').Router();

router.get('/:clientid/latest', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const doc = await db.collection('simulation_result')
      .find({ clientid: req.params.clientid })
      .sort({ ts: -1 })
      .limit(1)
      .next();

    // Si no hay doc, devuelve null (el front muestra “sin modelo”)
    if (!doc) return res.json(null);

    return res.json({
      status: doc.status || 'done',
      ts: doc.ts,
      params: doc.params ?? null,
      viz: doc.viz ?? null        // { vertices, indices, u_mag, marker }
    });
  } catch (e) {
    console.error('GET /simulations/:clientid/latest error', e);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;
