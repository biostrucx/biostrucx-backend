// db.js
const { MongoClient } = require('mongodb');

const uri = process.env.mongodb_uri;
const dbName = process.env.mongodb_db || 'biostrucx';

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();
  db = client.db(dbName);
  console.log('Mongo connected to', dbName);

  // Índices una sola vez al arrancar (sin romper si ya existen)
  try {
    await db.collection('simulation_ts').createIndex(
      { clientid: 1, ts: 1 },
      { name: 'idx_simts_clientid_ts' }
    ).catch(() => {});
    await db.collection('sensor_data').createIndex(
      { clientid: 1, ts: 1 },
      { name: 'idx_sensordata_clientid_ts' }
    ).catch(() => {});
    await db.collection('simulation_result').createIndex(
      { clientid: 1, ts: -1 },
      { name: 'idx_simres_clientid_ts' }
    ).catch(() => {});
  } catch (e) {
    console.warn('index creation skipped:', e?.message);
  }

  return db;
}

function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

module.exports = { connect, getDb };
