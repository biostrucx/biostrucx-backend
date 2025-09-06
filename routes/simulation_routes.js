// routes/simulation_routes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { col } = require('../db');

// util: parsea "5m", "30s", "2h", "1d" -> Date desde ahora
function parseWindow(s = '5m') {
  const m = String(s).match(/^(\d+)([smhd])$/i);
  const n = m ? parseInt(m[1], 10) : 5;
  const u = m ? m[2].toLowerCase() : 'm';
  const ms = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[u] || 6e4;
  return new Date(Date.now() - n * ms);
}

// POST /api/simulations/:clientid/run  -> crea job "queued"
router.post('/:clientid/run', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const job_id = uuidv4();

    const doc = {
      clientid,
      job_id,
      ts: new Date(),
      status: 'queued', // luego: running/done/error
      params: req.body || {},
      model: {
        type: null,
        dims: null,
        supports: null,
        loads: null,
        mesh: { nodes: [], elements: [] }
      },
      results: { ux: [], uy: [], uz: [] },
      viz: { vertices: [], indices: [], u_mag: [] }
    };

    const c = await col('simulation_result');
    await c.insertOne(doc);
    return res.status(202).json({ ok: true, job_id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// GET /api/simulations/:clientid/latest  -> último resultado por cliente
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

// GET /api/simulations/:clientid/series?window=5m&limit=300
// Devuelve fem (simulation_ts) y real (sensor_data) en el rango
router.get('/:clientid/series', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const from = parseWindow(req.query.window || '5m');
    const limit = Math.min(parseInt(req.query.limit || '300', 10), 2000);

    // FEM serie
    const simTs = await col('simulation_ts');
    const fem = await simTs.find({ clientid, ts: { $gte: from } })
      .sort({ ts: 1 })
      .limit(limit)
      .project({ _id: 0, ts: 1, fem_mm: 1 })
      .toArray();

    // Real serie
    const sensor = await col('sensor_data');
    const real = await sensor.find({ clientid, ts: { $gte: from } })
      .sort({ ts: 1 })
      .limit(limit)
      .project({ _id: 0, ts: 1, disp_mm: 1 })
      .toArray();

    return res.json({ fem, real });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

module.exports = router;


