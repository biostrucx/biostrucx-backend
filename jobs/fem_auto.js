const cron = require('node-cron');
const { execFile } = require('child_process');
const path = require('path');
const { db } = require('../db');

const CLIENTS = (process.env.FEM_CLIENTS || 'jeimie').split(',').map(s => s.trim());
const CRON = process.env.FEM_CRON || '*/2 * * * *'; // cada 2 min por defecto

async function saveResult(clientid, payload) {
  const simResult = db.collection('simulation_result');
  const simTs     = db.collection('simulation_ts');

  const doc = {
    clientid,
    ts: new Date(payload.ts),
    status: payload.status || 'done',
    model: payload.model,
    params: payload.params,
    viz: payload.viz
  };

  await simResult.updateOne(
    { clientid },
    { $set: doc },
    { upsert: true }
  );

  await simTs.insertOne({
    clientid,
    ts: new Date(payload.ts),
    fem_mm: Number(payload.midspan_mm)
  });
}

function runOnceFor(clientid) {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), 'scripts', 'fem_beam.py');
    const py = process.env.PYTHON || 'python3';

    execFile(py, [script], { timeout: 120000 }, async (err, stdout, stderr) => {
      if (err) {
        console.error('[fem_auto]', clientid, 'error:', err.message, stderr);
        return reject(err);
      }
      try {
        const payload = JSON.parse(stdout.toString());
        await saveResult(clientid, payload);
        resolve();
      } catch (e) {
        console.error('[fem_auto] parse/save error:', e.message);
        reject(e);
      }
    });
  });
}

function start() {
  console.log('[fem_auto] scheduling:', CRON, 'clients:', CLIENTS);
  cron.schedule(CRON, async () => {
    for (const c of CLIENTS) {
      try {
        await runOnceFor(c);
      } catch {
        /* ya se logueó */
      }
    }
  }, { timezone: 'UTC' });
}

module.exports = { start };

