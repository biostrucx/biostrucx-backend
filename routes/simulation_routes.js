const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

/**
 * GET /api/simulations/:clientid/latest
 * Devuelve el último resultado FEM (simulation_result) para el cliente.
 */
router.get('/:clientid/latest', async (req, res) => {
  res.set('Cache-Control', 'no-store'); // evita 304 del navegador/CDN
  const clientid = String(req.params.clientid || '').trim();

  try {
    const db = getDb();
    const col = db.collection('simulation_result');

    // Trae el más reciente por ts (si no existe ts, cae al _id)
    let doc = await col.find({ clientid }).sort({ ts: -1, _id: -1 }).limit(1).next();

    // Si no hay doc, devuelve null explícito
    if (!doc) return res.json(null);

    // Pequeña sanitización: si viz viene roto, lo anulamos para que el front lo avise
    const v = doc.viz || {};
    const okVerts = Array.isArray(v.vertices) && v.vertices.length % 3 === 0;
    const okInd   = Array.isArray(v.indices)  && v.indices.length  % 3 === 0;
    if (!(okVerts && okInd)) {
      doc.viz = null;
      doc.status = 'invalid-viz';
    }

    return res.json({
      _id: doc._id,
      clientid: doc.clientid,
      status: doc.status || 'done',
      model: doc.model || {},
      params: doc.params || {},
      ts: doc.ts || null,
      viz: doc.viz || null
    });
  } catch (err) {
    console.error('GET /simulations/:clientid/latest error:', err);
    return res.status(500).json({ error: 'server' });
  }
});

/**
 * GET /api/simulations/:clientid/series?window=5m&limit=300
 * Devuelve series de tiempo desde simulation_ts (fem_mm y real opcional).
 */
router.get('/:clientid/series', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const clientid = String(req.params.clientid || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '300', 10), 1000);
  // ventana simple; si no llega nada usamos 5 min
  const windowStr = String(req.query.window || '5m');
  const now = Date.now();
  let dt = 5 * 60 * 1000;
  try {
    if (windowStr.endsWith('m')) dt = parseInt(windowStr) * 60 * 1000;
    if (windowStr.endsWith('s')) dt = parseInt(windowStr) * 1000;
    if (windowStr.endsWith('h')) dt = parseInt(windowStr) * 60 * 60 * 1000;
  } catch {}
  const start = new Date(now - dt);

  try {
    const db = getDb();
    const col = db.collection('simulation_ts');

    const cur = col.find(
      { clientid, ts: { $gte: start } },
      { projection: { _id: 0, ts: 1, fem_mm: 1, disp_mm: 1 } }
    ).sort({ ts: 1 }).limit(limit);

    const rows = await cur.toArray();

    const fem = rows
      .filter(r => typeof r.fem_mm === 'number')
      .map(r => ({ ts: new Date(r.ts).getTime(), v: Number(r.fem_mm) }));

    const real = rows
      .filter(r => typeof r.disp_mm === 'number')
      .map(r => ({ ts: new Date(r.ts).getTime(), disp_mm: Number(r.disp_mm) }));

    return res.json({ fem, real });
  } catch (err) {
    console.error('GET /simulations/:clientid/series error:', err);
    return res.status(500).json({ error: 'server' });
  }
});

module.exports = router;

