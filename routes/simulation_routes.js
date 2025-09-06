// routes/simulation_routes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { col } = require('../db');

function parse_window(s = '5m') {
  const m = String(s).match(/^(\d+)([smhd])$/i);
  const n = m ? parseInt(m[1], 10) : 5;
  const u = m ? m[2].toLowerCase() : 'm';
  const ms = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[u];
  return new Date(Date.now() - n * ms);
}

// opcional: dejar compatible por si quieres correr/actualizar modelo
router.post('/:clientid/run', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const job_id = uuidv4();
    const c = await col('simulation_result');

    await c.insertOne({
      clientid,
      job_id,
      ts: new Date(),
      status: 'queued',
      params: req.body || {},
      // puedes dejar placeholders o lo que te entregue tu runner
      model: { type: null, dims: null, mesh: { nodes: [], elements: [] } },
      results: { ux: [], uy: [], uz: [] },
      viz: { vertices: [], indices: [], u_mag: [] },
      u_sensor_mm: null
    });

    return res.status(202).json({ ok: true, job_id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// último resultado (para la tarjeta de arriba)
router.get('/:clientid/latest', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const c = await col('simulation_result');
    const doc = await c.find({ clientid }).sort({ ts: -1 }).limit(1).toArray();
    return res.json(doc[0] || null);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// serie FEM predicha (para la tarjeta de abajo)
router.get('/:clientid/series', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const from = parse_window(req.query.window || '5m');
    const limit = Math.min(parseInt(req.query.limit || '300', 10), 2000);

    const c = await col('simulation_ts');
    const items = await c.find({ clientid, ts: { $gte: from } })
      .sort({ ts: 1 }).limit(limit)
      .project({ _id: 0, clientid: 1, ts: 1, u_pred_mm: 1 })
      .toArray();

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

module.exports = router;
