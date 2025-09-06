const { MongoClient } = require('mongodb');

let _client = null;
let _db = null;

async function connect() {
  if (_db) return _db;
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'biostrucx';
  if (!uri) throw new Error('Missing MONGODB_URI');

  _client = new MongoClient(uri, { maxPoolSize: 10 });
  await _client.connect();
  _db = _client.db(dbName);
  return _db;
}

function getDb() {
  if (!_db) throw new Error('DB not connected');
  return _db;
}

async function col(name) {
  return getDb().collection(name);
}

// Crea índices de forma segura (ignora conflictos si ya existen)
async function ensureIndexes() {
  const c1 = await col('sensor_data');
  try {
    await c1.createIndex({ clientid: 1, ts: -1 }, { name: 'idx_clientid_ts' });
  } catch (e) {
    if (!String(e?.message || '').includes('already exists')) throw e;
  }

  const c2 = await col('simulation_ts');
  try {
    await c2.createIndex({ clientid: 1, ts: -1 }, { name: 'idx_clientid_ts' });
  } catch (e) {
    if (!String(e?.message || '').includes('already exists')) throw e;
  }

  const c3 = await col('simulation_result');
  try {
    await c3.createIndex({ clientid: 1, ts: -1 }, { name: 'idx_clientid_ts' });
  } catch (e) {
    if (!String(e?.message || '').includes('already exists')) throw e;
  }
}

module.exports = { connect, getDb, col, ensureIndexes };

