// routes/sensor_routes.js
const express = require('express');
const router = express.Router();
const { col } = require('../db');

// ---- índices (una vez) ----
async function ensureIndexes() {
  try {
    const c = await col('sensor_data');
    await c.createIndex({ clientid: 1, ts: -1 }, { name: 'idx_clientid_ts' });
  } catch (e) {
    console.warn('sensor_data index warn:', e?.message || e);
  }
}
ensureIndexes();

// ---- utilidades ----
function asDate(x) {
  if (x instanceof Date) return x;
  if (typeof x === 'number' && Number.isFinite(x)) return new Date(x);
  if (typeof x === 'string' && x) {
    const d = new Date(x);
    if (!Number.isNaN(+d)) return d;
  }
  return new Date();
}

function windowFromQuery(q) {
  // acepta ?window=5m ó ?windowSec=300
  if (q.windowSec != null) {
    const sec = Number(q.windowSec);
    const s = Number.isFinite(sec) ? sec : 300;
    return new Date(Date.now() - s * 1000);
  }
  const txt = String(q.window ?? '5m');
  const m = txt.match(/^(\d+)([smhd])$/i);
  const n = m ? parseInt(m[1], 10) : 5;
  const u = m ? m[2].toLowerCase() : 'm';
  const mult = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[u];
  return new Date(Date.now() - n * mult);
}

// ================== RUTAS ==================

// POST /api/sensors/:clientid
router.post('/:clientid', async (req, res) => {
  try {
    const clientid = String(req.params.clientid || '').trim().toLowerCase();
    const { ts, ts_ms, voltage_dc, adc_raw, disp_mm } = req.body || {};

    const doc = {
      clientid,
      ts: asDate(ts_ms ?? ts),
      voltage_dc: Number.isFinite(Number(voltage_dc)) ? Number(voltage_dc) : null,
      adc_raw: Number.isFinite(Number(adc_raw)) ? Number(adc_raw) : null,
      disp_mm: Number.isFinite(Number(disp_mm)) ? Number(disp_mm) : null,
    };

    const c = await col('sensor_data');
    await c.insertOne(doc);
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /sensors error:', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// GET /api/sensors/latest/:clientid
router.get('/latest/:clientid', async (req, res) => {
  try {
    const clientid = String(req.params.clientid || '').trim().toLowerCase();
    const c = await col('sensor_data');
    const doc = await c.find({ clientid }).sort({ ts: -1 }).limit(1).toArray();
    res.json(doc[0] ?? null); // nunca 500 por estar vacío
  } catch (e) {
    console.error('GET /sensors/latest error:', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// GET /api/sensors/stream/:clientid?window=5m&limit=300  (o windowSec=300)
router.get('/stream/:clientid', async (req, res) => {
  try {
    const clientid = String(req.params.clientid || '').trim().toLowerCase();
    const from = windowFromQuery(req.query);
    const limit = Math.min(Number(req.query.limit ?? 300) || 300, 5000);

    const c = await col('sensor_data');
    const items = await c.find({ clientid, ts: { $gte: from } })
      .sort({ ts: 1 }).limit(limit).toArray();

    res.json(items ?? []); // nunca 500 por estar vacío
  } catch (e) {
    console.error('GET /sensors/stream error:', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

module.exports = router;



