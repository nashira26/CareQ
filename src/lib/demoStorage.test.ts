import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_STORAGE_KEY,
  SHORTLIST_KEY,
  MESSAGE_READS_STORAGE_KEY,
  loadLocalWorld,
  saveLocalWorld,
  clearDemoStorage,
  hashPassword,
  browserHasher,
} from './demoStorage';
import { buildSeedWorld } from './world';

const memory = () => {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};
const throwing = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

test('missing, invalid JSON or other version -> null (use seed data)', () => {
  const s = memory();
  assert.equal(loadLocalWorld(s), null);
  s.setItem(DEMO_STORAGE_KEY, '{not json');
  assert.equal(loadLocalWorld(s), null);
  s.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: 99, world: {} }));
  assert.equal(loadLocalWorld(s), null);
  assert.equal(loadLocalWorld(null), null);
});

test('older saves (v1, v2) are deleted, not converted', () => {
  const s = memory();
  s.setItem('careq-demo-v1', '{}');
  s.setItem('careq-demo-v2', '{}');
  loadLocalWorld(s);
  assert.equal(s.getItem('careq-demo-v1'), null);
  assert.equal(s.getItem('careq-demo-v2'), null);
});

test('round trip keeps the world and session; no plain-text passwords', async () => {
  const s = memory();
  const world = await buildSeedWorld(browserHasher);
  assert.equal(saveLocalWorld(world, 'parent-priya', s), true);
  const back = loadLocalWorld(s)!;
  assert.equal(back.sessionAccountId, 'parent-priya');
  assert.equal(back.world.applications.length, world.applications.length);
  assert.doesNotMatch(s.getItem(DEMO_STORAGE_KEY)!, /"password"\s*:/);
  assert.ok(await browserHasher.verify('password', back.world.accounts[0].passwordHash));
});

test('storage that throws (private window) never breaks the app', async () => {
  assert.equal(loadLocalWorld(throwing), null);
  assert.equal(saveLocalWorld(await buildSeedWorld(browserHasher), null, throwing), false);
  assert.doesNotThrow(() => clearDemoStorage(throwing));
});

test('reset clears the demo key, the shortlist and read messages only', () => {
  const s = memory();
  s.setItem(DEMO_STORAGE_KEY, '{}');
  s.setItem(SHORTLIST_KEY, '["careq-demo"]');
  s.setItem(MESSAGE_READS_STORAGE_KEY, '{"parent-priya":["m-jk-1"]}');
  s.setItem('unrelated', 'keep');
  clearDemoStorage(s);
  assert.equal(s.getItem(DEMO_STORAGE_KEY), null);
  assert.equal(s.getItem(SHORTLIST_KEY), null);
  assert.equal(s.getItem(MESSAGE_READS_STORAGE_KEY), null);
  assert.equal(s.getItem('unrelated'), 'keep');
});

test('hashPassword: SHA-256 hex, empty -> undefined', async () => {
  assert.equal(await hashPassword(''), undefined);
  assert.equal(await hashPassword('password'), '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8');
});
