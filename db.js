// db.js
const { MongoClient, ServerApiVersion } = require('mongodb');

let client;
let db;

function pickUri() {
  // Acepta mayúsculas/minúsculas para evitar confusiones
  return (
    process.env.MONGODB_URI ||
    process.env.mongodb_uri ||
    process.env.MONGO_URI ||
    process.env.mongo_uri ||
    ''
  );
}

const dbName = process.env.mongodb_db || process.env.MONGODB_DB || 'biostrucx';

async function connect() {
  if (db) return db;

  const uri = pickUri();
  if (!uri) throw new Error('Missing Mongo URI (set MONGODB_URI o mongodb_uri)');

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

  // Índices idempotentes (si ya existen, no falla)
  await Promise.allSettled([
    db.collection('sensor_data').createIndex({ clientid: 1, ts: -1 }),
    db.collection('simulation_ts').createIndex({ clientid: 1, ts: -1 }),
    db.collection('simulation_result').createIndex({ clientid: 1, ts: -1 }),
  ]);

  console.log('Mongo connected to DB:', dbName);
  return db;
}

function getDb() {
  return db;
}

function col(name) {
  if (!db) throw new Error('DB not ready. Call connect() first.');
  return db.collection(name);
}

module.exports = { connect, getDb, col };

