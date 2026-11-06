/**
 * MongoDB Atlas: one client created at startup and reused; indexes; seeding; and MongoRepo,
 * the MongoDB implementation of the same Repo interface the service layer uses everywhere.
 */
import { MongoClient, Db, Collection, Document } from 'mongodb';
import bcrypt from 'bcryptjs';
import type { Application, Centre, InAppNotification } from '../src/data/mockData';
import type { Repo } from '../src/lib/repo';
import {
  AccountRecord,
  ApplicationRecord,
  ChildRecord,
  ConversationRecord,
  PasswordHasher,
  SupportRequestRecord,
  World,
  buildSeedWorld,
} from '../src/lib/world';

export const bcryptHasher: PasswordHasher = {
  hash: (p) => bcrypt.hash(p, 10),
  verify: (p, h) => bcrypt.compare(p, h),
};

export const COLLECTIONS = [
  'accounts',
  'children',
  'centres',
  'applications',
  'conversations',
  'notifications',
  'supportRequests',
  'sessions',
] as const;

// ---------------- Connection (once, reused) ----------------

export interface MongoState {
  status: 'not used' | 'connecting' | 'up' | 'down';
  db: Db | null;
  client: MongoClient | null;
  error?: string;
}
export const mongo: MongoState = { status: 'not used', db: null, client: null };

/** Connect once; if Atlas is unreachable, keep retrying in the background (the server still starts). */
export async function connectMongo(uri: string | undefined, dbName: string | undefined, onReady: (db: Db) => Promise<void>) {
  if (!uri || !dbName) {
    mongo.status = 'down';
    mongo.error = 'MONGODB_URI and MONGODB_DB must be set.';
    console.error(`[mongo] ${mongo.error}`);
    return;
  }
  mongo.status = 'connecting';
  const attempt = async (): Promise<void> => {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, appName: 'careq' });
      await client.connect();
      const db = client.db(dbName);
      await db.command({ ping: 1 });
      mongo.client = client;
      mongo.db = db;
      await onReady(db);
      mongo.status = 'up';
      mongo.error = undefined;
      console.log(`[mongo] connected to database "${dbName}"`);
    } catch (e) {
      mongo.status = 'down';
      mongo.error = (e as Error).message;
      console.error(`[mongo] connection failed (${(e as Error).name}); retrying in 15 s`);
      setTimeout(attempt, 15000);
    }
  };
  await attempt();
}

/** Ping for /api/health (marks the connection down if the ping fails). */
export async function pingMongo(): Promise<boolean> {
  if (!mongo.db) return false;
  try {
    await mongo.db.command({ ping: 1 });
    mongo.status = 'up';
    return true;
  } catch {
    mongo.status = 'down';
    return false;
  }
}

// ---------------- Indexes & seeding ----------------

export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection('accounts').createIndexes([{ key: { id: 1 }, unique: true }, { key: { emailLower: 1 }, unique: true }]),
    db.collection('children').createIndexes([{ key: { id: 1 }, unique: true }, { key: { parentAccountId: 1 } }]),
    db.collection('centres').createIndexes([{ key: { id: 1 }, unique: true }]),
    db.collection('applications').createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { parentAccountId: 1, childId: 1 } },
      { key: { centreId: 1, status: 1 } },
    ]),
    db.collection('conversations').createIndexes([
      { key: { key: 1 }, unique: true },
      { key: { parentAccountId: 1 } },
      { key: { centreId: 1 } },
    ]),
    db.collection('notifications').createIndexes([{ key: { id: 1 }, unique: true }, { key: { recipientId: 1, createdAt: -1 } }]),
    db.collection('supportRequests').createIndexes([{ key: { id: 1 }, unique: true }, { key: { submittedByAccountId: 1 } }]),
    // Sessions expire automatically 7 days after creation (expiresAt)
    db.collection('sessions').createIndexes([
      { key: { tokenHash: 1 }, unique: true },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]),
  ]);
}

export async function isEmpty(db: Db) {
  const [accounts, centres] = await Promise.all([db.collection('accounts').countDocuments(), db.collection('centres').countDocuments()]);
  return accounts === 0 && centres === 0;
}

/** Replace all demo data (and sessions) with the seed data. */
export async function reseed(db: Db) {
  const world: World = await buildSeedWorld(bcryptHasher);
  await Promise.all(COLLECTIONS.map((c) => db.collection(c).deleteMany({})));
  const ins = async (name: string, docs: object[]) => {
    if (docs.length) await db.collection(name).insertMany(docs.map((d) => ({ ...d })));
  };
  await ins('accounts', world.accounts.map((a) => ({ ...a, emailLower: a.email.toLowerCase() })));
  await ins('children', world.children);
  await ins('centres', world.centres);
  await ins('applications', world.applications);
  await ins('conversations', world.conversations);
  await ins('notifications', world.notifications);
  await ins('supportRequests', world.supportRequests);
  console.log(
    `[mongo] seeded: ${world.accounts.length} accounts, ${world.centres.length} centres, ${world.applications.length} applications`
  );
}

// ---------------- MongoRepo ----------------

const NO_ID = { projection: { _id: 0, emailLower: 0 } };

/** $set the defined fields, $unset the undefined ones (so e.g. preparedDraft can be removed). */
function update<T extends object>(patch: Partial<T>) {
  const $set: Document = {};
  const $unset: Document = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) $unset[k] = '';
    else $set[k] = v;
  }
  return { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
}

const defined = <T extends object>(filter: T) =>
  Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== undefined)) as Document;

export class MongoRepo implements Repo {
  constructor(private db: Db) {}
  private c<T extends Document>(name: (typeof COLLECTIONS)[number]): Collection<T> {
    return this.db.collection<T>(name);
  }
  private async patch(name: (typeof COLLECTIONS)[number], filter: Document, patch: object) {
    const u = update(patch);
    if (Object.keys(u).length) await this.c(name).updateOne(filter, u);
  }

  findAccountByEmail(email: string) {
    return this.c<AccountRecord>('accounts').findOne({ emailLower: email.trim().toLowerCase() }, NO_ID) as Promise<AccountRecord | null>;
  }
  getAccount(id: string) {
    return this.c<AccountRecord>('accounts').findOne({ id }, NO_ID) as Promise<AccountRecord | null>;
  }
  async insertAccount(a: AccountRecord) {
    await this.c('accounts').insertOne({ ...a, emailLower: a.email.toLowerCase() });
  }
  updateAccount(id: string, patch: Partial<AccountRecord>) {
    return this.patch('accounts', { id }, patch);
  }

  listChildren(parentAccountId: string) {
    return this.c<ChildRecord>('children').find({ parentAccountId }, NO_ID).toArray() as Promise<ChildRecord[]>;
  }
  getChild(id: string) {
    return this.c<ChildRecord>('children').findOne({ id }, NO_ID) as Promise<ChildRecord | null>;
  }
  async insertChildren(children: ChildRecord[]) {
    if (children.length) await this.c('children').insertMany(children.map((c) => ({ ...c })));
  }

  listCentres() {
    // Newest self-registered centres first, then the demo partner centres in their usual order
    return this.c<Centre>('centres').find({}, NO_ID).sort({ 'registration.registeredAt': -1, _id: 1 }).toArray() as Promise<Centre[]>;
  }
  getCentre(id: string) {
    return this.c<Centre>('centres').findOne({ id }, NO_ID) as Promise<Centre | null>;
  }
  async insertCentre(c: Centre) {
    await this.c('centres').insertOne({ ...c });
  }
  updateCentre(id: string, patch: Partial<Centre>) {
    return this.patch('centres', { id }, patch);
  }

  getApplication(id: string) {
    return this.c<ApplicationRecord>('applications').findOne({ id }, NO_ID) as Promise<ApplicationRecord | null>;
  }
  listApplications(filter: { parentAccountId?: string; centreId?: string; childId?: string }) {
    return this.c<ApplicationRecord>('applications').find(defined(filter), NO_ID).sort({ _id: -1 }).toArray() as Promise<ApplicationRecord[]>;
  }
  async insertApplication(a: ApplicationRecord) {
    await this.c('applications').insertOne({ ...a });
  }
  updateApplication(id: string, patch: Partial<ApplicationRecord>) {
    return this.patch('applications', { id }, patch);
  }

  getConversation(key: string) {
    return this.c<ConversationRecord>('conversations').findOne({ key }, NO_ID) as Promise<ConversationRecord | null>;
  }
  listConversations(filter: { parentAccountId?: string; centreId?: string }) {
    return this.c<ConversationRecord>('conversations').find(defined(filter), NO_ID).toArray() as Promise<ConversationRecord[]>;
  }
  async upsertConversation(c: ConversationRecord) {
    await this.c('conversations').replaceOne({ key: c.key }, { ...c }, { upsert: true });
  }

  listNotifications(recipientId: string) {
    return this.c<InAppNotification>('notifications').find({ recipientId }, NO_ID).sort({ createdAt: -1 }).limit(200).toArray() as Promise<
      InAppNotification[]
    >;
  }
  async insertNotifications(n: InAppNotification[]) {
    if (n.length) await this.c('notifications').insertMany(n.map((x) => ({ ...x })));
  }
  async markNotificationsRead(recipientId: string, ids: string[] | 'all') {
    await this.c('notifications').updateMany(ids === 'all' ? { recipientId } : { recipientId, id: { $in: ids } }, { $set: { read: true } });
  }

  listSupportRequests(accountId: string) {
    return this.c<SupportRequestRecord>('supportRequests').find({ submittedByAccountId: accountId }, NO_ID).sort({ _id: -1 }).toArray() as Promise<
      SupportRequestRecord[]
    >;
  }
  getSupportRequest(id: string) {
    return this.c<SupportRequestRecord>('supportRequests').findOne({ id }, NO_ID) as Promise<SupportRequestRecord | null>;
  }
  async insertSupportRequest(r: SupportRequestRecord) {
    await this.c('supportRequests').insertOne({ ...r });
  }
  updateSupportRequest(id: string, patch: Partial<SupportRequestRecord>) {
    return this.patch('supportRequests', { id }, patch);
  }
}

export type { Application };
