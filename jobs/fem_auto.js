// jobs/fem_auto.js
const { col } = require('../db');

// δ = P L^3 / (48 E I)  (Euler-Bernoulli midspan, carga puntual centrada)
function computeMidspanDeflection({ L=25, E_GPa=25, b=1, h=1, P_kN=10 }) {
  const E = E_GPa * 1e9;                // Pa
  const I = (b * (h ** 3)) / 12;         // m^4
  const P = P_kN * 1000;                 // N
  const delta_m = (P * L**3) / (48 * E * I);
  return delta_m * 1000;                 // mm
}

async function tick(clientid = 'jeimie') {
  const now = new Date();

  // carga oscilante para ver curva
  const base = 10; // kN
  const osc  = 2 * Math.sin(now.getTime() / 30000);
  const fem_mm = computeMidspanDeflection({ L: 25, E_GPa: 25, b: 1, h: 1, P_kN: base + osc });

  // 1) guarda muestra en time-series: simulation_ts
  const cTs = await col('simulation_ts');
  await cTs.insertOne({ clientid, ts: now, fem_mm });

  // 2) guarda/actualiza último viz para la tarjeta 3D
  const cRes = await col('simulation_result');
  const viz = {
    vertices: [0,0,0, 25,0,0, 25,0,1, 0,0,1],
    indices: [0,1,2, 0,2,3],
    u_mag: [0, fem_mm/1000, fem_mm/1000, 0], // exageración
  };
  await cRes.updateOne(
    { clientid },
    {
      $set: {
        clientid,
        ts: now,
        status: 'done',
        params: { desc: 'viga 25x25x1 m (analítico continuo)' },
        model: { type: 'beam', dims: { L: 25, B: 1, H: 1 } },
        viz
      }
    },
    { upsert: true }
  );
}

function start() {
  tick().catch(console.error);
  setInterval(() => tick().catch(console.error), 5000); // cada 5s
}

module.exports = { start };
