// db.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'biostrucx';

let client;
let db;

async function connect() {
  if (db) return db;
  if (!uri) throw new Error('Missing MONGODB_URI env var');

  client = new MongoClient(uri, {
    maxPoolSize: 10,
    connectTimeoutMS: 20000,
  });

  await client.connect();
  db = client.db(dbName);
  return db;
}

function getDb() {
  if (!db) throw new Error('Call connect() first');
  return db;
}

async function col(name) {
  if (!db) await connect();
  return db.collection(name);
}

/**
 * Crea índices necesarios. Idempotente (ignora conflictos).
 */
async function ensureIndexes() {
  const cSensor = await col('sensor_data');
  const cSimRes = await col('simulation_result');
  const cSimTs  = await col('simulation_ts');

  const ops = [
    cSensor.createIndex({ clientid: 1, ts: -1 }),
    cSimRes.createIndex({ clientid: 1, ts: -1 }),
    cSimTs.createIndex({ clientid: 1, ts: -1 }),
  ];

  for (const p of ops) {
    try { await p; } 
    catch (e) {
      // Ignora errores de índice existente / conflicto de opciones.
      if (e?.codeName !== 'IndexOptionsConflict') {
        console.warn('ensureIndexes warning:', e?.message || e);
      }
    }
  }
}

module.exports = { connect, getDb, col, ensureIndexes };


