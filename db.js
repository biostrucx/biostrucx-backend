// db.js
const { MongoClient } = require('mongodb');

const uri = process.env.mongodb_uri;
const db_name = process.env.mongodb_db || 'biostrucx';

let client, db;

async function connect() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(db_name);
  }
  return db;
}

async function col(name) {
  const database = await connect();
  return database.collection(name);
}

module.exports = { connect, col };
