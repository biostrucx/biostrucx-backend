// db.js
const { MongoClient, ServerApiVersion } = require('mongodb');

let client;
let db;

const uri = process.env.mongo_uri;
const dbName = process.env.mongo_db || 'biostrucx';

function assertEnv() {
  if (!uri) throw new Error('Missing mongo_uri env');
}

async function connect() {
  if (db) return db;
  assertEnv();
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    maxPoolSize: 10,
  });
  await client.connect();
  db = client.db(dbName);

  // índices idempotentes (no fallan si ya existen)
  await Promise.allSettled([
    db.collection('sensor_data').createIndex({ clientid: 1, ts: -1 }),
    db.collection('simulation_ts').createIndex({ clientid: 1, ts: -1 }),
    db.collection('simulation_result').createIndex({ clientid: 1, ts: -1 }),
  ]);

  console.log('Mongo connected to DB:', dbName);
  return db;
}

function getDb() { return db; }
function col(name) {
  if (!db) throw new Error('DB not ready. Call connect() first.');
  return db.collection(name);
}

module.exports = { connect, getDb, col };

