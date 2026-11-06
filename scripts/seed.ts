/**
 * npm run seed            Fill an EMPTY database (MONGODB_URI / MONGODB_DB) with the demo data.
 * npm run seed -- --force Replace all demo data, even if the database is not empty.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { ensureIndexes, isEmpty, reseed } from '../server/db';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) {
  console.error('MONGODB_URI and MONGODB_DB must be set (see .env.example).');
  process.exit(1);
}
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db = client.db(dbName);
  await ensureIndexes(db);
  if (!(await isEmpty(db)) && !process.argv.includes('--force')) {
    console.log(`Database "${dbName}" already has data. Nothing changed. Use "npm run seed -- --force" to replace it.`);
  } else {
    await reseed(db);
    console.log(`Database "${dbName}" seeded with the demo data.`);
  }
} catch (e) {
  console.error('Seeding failed:', (e as Error).message);
  process.exitCode = 1;
} finally {
  await client.close();
}
