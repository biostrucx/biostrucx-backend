const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Dispara FEM (placeholder)
router.post('/:clientid/run', (req, res) => {
  const job_id = uuidv4();
  return res.status(202).json({ ok: true, job_id });
});

// Trae último resultado (placeholder)
router.get('/:clientid/latest', async (req, res) => {
  return res.json({ ok: true, clientid: req.params.clientid });
});

module.exports = router;

