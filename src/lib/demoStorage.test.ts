import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_STORAGE_KEY,
  SHORTLIST_KEY,
  DemoState,
  loadDemoState,
  saveDemoState,
  clearDemoStorage,
  hashPassword,
  mergeCentres,
  splitCentres,
} from './demoStorage';
import { INITIAL_CENTRES, INITIAL_APPLICATIONS } from '../data/mockData';

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

const state: DemoState = {
  mockAccounts: [{ id: 'a1', role: 'parent', email: 'x@y.ca', name: 'X', ...({ password: 'secret' } as object) }],
  sessionAccountId: 'a1',
  applications: INITIAL_APPLICATIONS.slice(0, 2),
  conversations: {},
  notifications: [],
  supportRequests: [],
  centreOverrides: [],
  selfRegisteredCentres: [],
  preparedDrafts: {},
};

test('missing, invalid JSON or other version -> null (use mock data)', () => {
  const s = memory();
  assert.equal(loadDemoState(s), null);
  s.setItem(DEMO_STORAGE_KEY, '{not json');
  assert.equal(loadDemoState(s), null);
  s.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: 2, applications: [] }));
  assert.equal(loadDemoState(s), null);
  assert.equal(loadDemoState(null), null);
});

test('round trip keeps state; malformed sections fall back individually', () => {
  const s = memory();
  assert.equal(saveDemoState(state, s), true);
  const back = loadDemoState(s)!;
  assert.equal(back.sessionAccountId, 'a1');
  assert.deepEqual(back.applications.map((a) => a.id), state.applications.map((a) => a.id));
  const raw = JSON.parse(s.getItem(DEMO_STORAGE_KEY)!);
  raw.notifications = 'oops';
  s.setItem(DEMO_STORAGE_KEY, JSON.stringify(raw));
  assert.deepEqual(loadDemoState(s)!.notifications, []);
});

test('plain-text passwords are never saved', () => {
  const s = memory();
  saveDemoState(state, s);
  assert.doesNotMatch(s.getItem(DEMO_STORAGE_KEY)!, /secret/);
  assert.equal((loadDemoState(s)!.mockAccounts[0] as any).password, undefined);
});

test('storage that throws (private window) never breaks the app', () => {
  assert.equal(loadDemoState(throwing), null);
  assert.equal(saveDemoState(state, throwing), false);
  assert.doesNotThrow(() => clearDemoStorage(throwing));
});

test('reset clears the demo key and the shortlist', () => {
  const s = memory();
  saveDemoState(state, s);
  s.setItem(SHORTLIST_KEY, '["c1"]');
  s.setItem('unrelated', 'keep');
  clearDemoStorage(s);
  assert.equal(s.getItem(DEMO_STORAGE_KEY), null);
  assert.equal(s.getItem(SHORTLIST_KEY), null);
  assert.equal(s.getItem('unrelated'), 'keep');
});

test('centres: overrides for mock centres, full copies of self-registered ones', () => {
  const custom = { ...INITIAL_CENTRES[0], id: 'c-custom-1', name: 'New Centre' };
  const edited = INITIAL_CENTRES.map((c) =>
    c.id === 'c2' ? { ...c, requirements: ['Only one'], requirementSources: { 'Only one': 'Sentence.' } } : c
  );
  const split = splitCentres([custom, ...edited], INITIAL_CENTRES);
  assert.deepEqual(split.selfRegisteredCentres.map((c) => c.id), ['c-custom-1']);
  const merged = mergeCentres(INITIAL_CENTRES, split.centreOverrides, split.selfRegisteredCentres);
  assert.equal(merged[0].id, 'c-custom-1');
  assert.deepEqual(merged.find((c) => c.id === 'c2')!.requirements, ['Only one']);
  assert.equal(merged.find((c) => c.id === 'c2')!.name, INITIAL_CENTRES[1].name); // other fields from mock data
  assert.equal(merged.length, INITIAL_CENTRES.length + 1);
});

test('hashPassword: SHA-256 hex, empty -> undefined', async () => {
  assert.equal(await hashPassword(''), undefined);
  assert.equal(
    await hashPassword('password'),
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
  );
});
