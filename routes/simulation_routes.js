// routes/simulation_routes.js
const express = require('express');
const router = express.Router();

function parseWindowToMs(s = '5m') {
  const m = String(s).trim().match(/^(\d+)\s*([smhd])?$/i);
  if (!m) return 5 * 60 * 1000; // 5m por defecto
  const n = parseInt(m[1], 10) || 5;
  const u = (m[2] || 'm').toLowerCase();
  const mult = u === 's' ? 1e3 : u === 'm' ? 6e4 : u === 'h' ? 36e5 : 864e5;
  return n * mult;
}

function getDbFromAnywhere(req) {
  // Prioridad: lo que puso server.js
  if (req.app?.locals?.db) return req.app.locals.db;
  // Alternativas comunes según tu proyecto
  try {
    const dbMod = require('../db');
    if (typeof dbMod.getDb === 'function') return dbMod.getDb();
    if (typeof dbMod.db === 'function') return dbMod.db();
    if (dbMod.db) return dbMod.db;
  } catch (_) {}
  throw new Error('DB connection not available');
}

/**
 * GET /api/simulations/:clientid/latest
 * Devuelve el último resultado de FEM (o null). Nunca 500.
 */
router.get('/:clientid/latest', async (req, res) => {
  const clientid = String(req.params.clientid || '').trim();
  if (!clientid) return res.json(null);

  try {
    const db = getDbFromAnywhere(req);
    const doc = await db.collection('simulation_result')
      .find({ clientid })
      .sort({ ts: -1 })
      .limit(1)
      .toArray();

    if (!doc.length) return res.json(null);

    const r = doc[0];
    // saneo mínimo para el viewer (si no hay viz, frontend mostrará "sin modelo")
    return res.json({
      _id: r._id,
      clientid: r.clientid,
      status: r.status || 'done',
      ts: r.ts,
      params: r.params || null,
      viz: r.viz || null,              // { vertices, indices, u_mag, marker? }
    });
  } catch (e) {
    console.error('GET /simulations/:clientid/latest error:', e);
    // NO devolvemos 500; así no rompe el dashboard
    return res.json(null);
  }
});

/**
 * GET /api/simulations/:clientid/series?window=5m&limit=300
 * Devuelve { fem: [{ts, fem_mm}], real: [{ts, disp_mm}] }. Nunca 500.
 */
router.get('/:clientid/series', async (req, res) => {
  const clientid = String(req.params.clientid || '').trim();
  const windowStr = String(req.query.window || '5m');
  const limitStr  = String(req.query.limit  || '300');

  const limit = Math.max(1, Math.min(parseInt(limitStr, 10) || 300, 2000));
  const since = new Date(Date.now() - parseWindowToMs(windowStr));

  try {
    const db = getDbFromAnywhere(req);

    // FEM series
    let fem = [];
    try {
      const rows = await db.collection('simulation_ts')
        .find({ clientid, ts: { $gte: since } })
        .sort({ ts: 1 })
        .limit(limit)
        .project({ _id: 0, ts: 1, fem_mm: 1 })
        .toArray();

      fem = rows.map(d => ({
        ts: d.ts instanceof Date ? d.ts.getTime() : new Date(d.ts).getTime(),
        fem_mm: Number(d.fem_mm),
      })).filter(d => Number.isFinite(d.fem_mm));
    } catch (e) {
      console.error('series fem query error:', e);
      fem = [];
    }

    // Real (sensor) – opcional, no rompas si no hay
    let real = [];
    try {
      const rows = await db.collection('sensor_data')
        .find({ clientid, ts: { $gte: since } })
        .sort({ ts: 1 })
        .limit(limit)
        .project({ _id: 0, ts: 1, disp_mm: 1 })
        .toArray();

      real = rows.map(d => ({
        ts: d.ts instanceof Date ? d.ts.getTime() : new Date(d.ts).getTime(),
        disp_mm: Number(d.disp_mm),
      })).filter(d => Number.isFinite(d.disp_mm));
    } catch (e) {
      console.error('series real query error (sensor_data):', e);
      real = [];
    }

    return res.json({ fem, real });
  } catch (e) {
    console.error('GET /simulations/:clientid/series fatal error:', e);
    // NO 500
    return res.json({ fem: [], real: [] });
  }
});

module.exports = router;
