// routes/simulation_routes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { col } = require('../db');

// helper para ?window=5m|30s|2h|1d
function parseWindow(s = '5m') {
  const m = String(s).match(/^(\d+)([smhd])$/i);
  const n = m ? parseInt(m[1], 10) : 5;
  const u = m ? m[2].toLowerCase() : 'm';
  const ms = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[u];
  return new Date(Date.now() - n * ms);
}

/**
 * POST /api/simulations/:clientid/run
 * Crea job "queued" (si luego usas el job automático, lo puedes dejar como está).
 */
router.post('/:clientid/run', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const job_id = uuidv4();

    const doc = {
      clientid,
      job_id,
      ts: new Date(),
      status: 'queued',              // luego: running/done/error
      params: req.body || {},
      model: { type: null, dims: null, supports: null, loads: null, mesh: { nodes: [], elements: [] } },
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

/**
 * GET /api/simulations/:clientid/latest
 * Último documento de resultados por cliente (para el viewer 3D).
 */
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

/**
 * GET /api/simulations/:clientid/series?window=5m&limit=300
 * Devuelve dos series:
 *   - fem:    de 'simulation_ts'   (proyección: { ts, u_teo_mm })
 *   - real:   de 'sensor_data'     (proyección: { ts, disp_mm })
 */
router.get('/:clientid/series', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const from = parseWindow(req.query.window || '5m');
    const limit = Math.min(parseInt(req.query.limit || '300', 10), 2000);

    const cSim = await col('simulation_ts');
    const fem = await cSim.find(
      { clientid, ts: { $gte: from } },
      { projection: { _id: 0, ts: 1, u_teo_mm: 1 } }
    ).sort({ ts: 1 }).limit(limit).toArray();

    const cSens = await col('sensor_data');
    const real = await cSens.find(
      { clientid, ts: { $gte: from } },
      { projection: { _id: 0, ts: 1, disp_mm: 1 } }
    ).sort({ ts: 1 }).limit(limit).toArray();

    res.json({ fem, real });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

module.exports = router;

