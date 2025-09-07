// routes/sensor_routes.js
const express = require('express');
const router = express.Router();
const { col } = require('../db');

// helper: window tipo "5m", "30s", "2h", "1d"
function parseWindow(s = '5m') {
  const m = String(s).match(/^(\d+)([smhd])$/i);
  const n = m ? parseInt(m[1], 10) : 5;
  const u = m ? m[2].toLowerCase() : 'm';
  const ms = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[u];
  return new Date(Date.now() - n * ms);
}

// POST /api/sensors/:clientid
router.post('/:clientid', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    let { ts, ts_ms, voltage_dc, adc_raw, disp_mm } = req.body || {};

    // normaliza ts -> Date
    let ts_date;
    if (typeof ts_ms === 'number') ts_date = new Date(ts_ms);
    else if (typeof ts === 'number') ts_date = new Date(ts);
    else if (typeof ts === 'string') ts_date = new Date(ts);
    else ts_date = new Date();

    const doc = {
      ts: ts_date,
      clientid,
      voltage_dc: Number(voltage_dc),
      adc_raw: Number(adc_raw),
      disp_mm: Number(disp_mm),
    };

    if (
      Number.isNaN(doc.voltage_dc) ||
      Number.isNaN(doc.adc_raw) ||
      Number.isNaN(doc.disp_mm)
    ) {
      return res.status(400).json({ ok: false, error: 'invalid_numeric_fields' });
    }

    const c = await col('sensor_data');
    await c.insertOne(doc);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// GET /api/sensors/latest/:clientid
router.get('/latest/:clientid', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const c = await col('sensor_data');
    const doc = await c.find({ clientid }).sort({ ts: -1 }).limit(1).toArray();
    res.json(doc[0] || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// GET /api/sensors/stream/:clientid?window=5m&limit=300
router.get('/stream/:clientid', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();
    const from = parseWindow(req.query.window || '5m');
    const limit = Math.min(parseInt(req.query.limit || '300', 10), 2000);
    const c = await col('sensor_data');
    const items = await c.find({ clientid, ts: { $gte: from } })
      .sort({ ts: 1 })
      .limit(limit)
      .toArray();
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

module.exports = router;



