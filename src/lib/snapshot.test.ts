import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_SNAPSHOT, normaliseSnapshot } from './world';

test('normaliseSnapshot: nothing, null or junk -> the empty snapshot', () => {
  for (const raw of [undefined, null, 'oops', 42, [], {}]) assert.deepEqual(normaliseSnapshot(raw), EMPTY_SNAPSHOT);
});

test('normaliseSnapshot: missing or wrong-typed fields default to [] and {}', () => {
  const s = normaliseSnapshot({ centres: [{ id: 'c1' }], applications: null, conversations: [], notifications: 'x', supportRequests: undefined });
  assert.deepEqual(s.centres, [{ id: 'c1' }]);
  assert.deepEqual(s.applications, []);
  assert.deepEqual(s.conversations, {});
  assert.deepEqual(s.notifications, []);
  assert.deepEqual(s.supportRequests, []);
  assert.deepEqual(s.preparedDrafts, {});
  assert.equal(s.account, null);
});

test('normaliseSnapshot: keeps a valid account and data; drops null list entries and a malformed account', () => {
  const account = { id: 'a1', role: 'parent', email: 'p@example.ca', name: 'P', isDemoAccount: false };
  const s = normaliseSnapshot({ account, centres: [null, { id: 'c1' }], conversations: { k: [] } });
  assert.deepEqual(s.account, account);
  assert.deepEqual(s.centres, [{ id: 'c1' }]);
  assert.deepEqual(s.conversations, { k: [] });
  assert.equal(normaliseSnapshot({ account: { role: 'parent' } }).account, null);
  assert.equal(normaliseSnapshot({ account: { id: 'x', role: 'admin' } }).account, null);
});
