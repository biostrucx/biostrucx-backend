// routes/simulation_routes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { col } = require('../db');

// POST /api/simulations/:clientid/run  -> crea job y lo deja "queued"
router.post('/:clientid/run', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const job_id = uuidv4();

    const doc = {
      clientid,
      job_id,
      ts: new Date(),
      status: 'queued',              // luego: running/done/error
      params: req.body || {},        // parámetros recibidos del FE
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

module.exports = router;
