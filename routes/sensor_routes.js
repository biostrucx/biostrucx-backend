// routes/sensor_routes.js
const express = require('express');
const router = express.Router();
const { col } = require('../db');

// POST /api/sensors/:clientid
router.post('/:clientid', async (req, res) => {
  try {
    const clientid = String(req.params.clientid).toLowerCase();

    let { ts, ts_ms, voltage_dc, adc_raw, disp_mm } = req.body || {};

    // normaliza ts -> Date
    let ts_date = null;
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

module.exports = router;
