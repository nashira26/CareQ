import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newestRequests } from './centreQueue';
import { INITIAL_APPLICATIONS } from '../data/mockData';

const app = (id: string, submittedAt: string | undefined, status = 'Submitted') => ({ id, submittedAt, status }) as any;

test('newest requests: sorted by submittedAt, newest first, before taking 5; drafts excluded', () => {
  const apps = [
    app('aug', 'Aug 20, 2026'),
    app('draft', undefined, 'Draft'),
    app('nov', 'Nov 3, 2026'),
    app('sep05', 'Sep 05, 2026'),
    app('none', undefined),
    app('oct', 'Oct 28, 2026'),
    app('jul', 'Jul 29, 2026'),
    app('sep22', 'Sep 22, 2026'),
  ];
  assert.deepEqual(newestRequests(apps).map((a) => a.id), ['nov', 'oct', 'sep22', 'sep05', 'aug']);
  assert.deepEqual(newestRequests(apps, 10).map((a) => a.id), ['nov', 'oct', 'sep22', 'sep05', 'aug', 'jul', 'none']);
});

test('newest requests on the seeded demo centre queue are in date order', () => {
  const list = newestRequests(INITIAL_APPLICATIONS.filter((a) => a.centreId === 'careq-demo'));
  const times = list.map((a) => Date.parse(a.submittedAt!));
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
});

test('short reference: "CQ-" + 4 digits from a hash of the id, the same every time, never letters', async () => {
  const { shortRef } = await import('./centreQueue');
  for (const id of ['app-careq-demo-anya-17f4f2a', 'app-x-y-1', 'app-on-00576-child-anya-1730000000000', 'app-jesse-ketchum-ama', '']) {
    assert.match(shortRef(id), /^Ref\. CQ-\d{4}$/, id);
    assert.equal(shortRef(id), shortRef(id));
  }
  assert.notEqual(shortRef('app-jesse-ketchum-ama'), shortRef('app-jesse-ketchum-ren'));
  // Seeded applications each get their own reference
  const refs = INITIAL_APPLICATIONS.map((a) => shortRef(a.id));
  assert.equal(new Set(refs).size, refs.length);
});

test('status wording: centres see a submitted application as "Received"; parents still see "Submitted"', async () => {
  const { statusLabel } = await import('./centreQueue');
  assert.equal(statusLabel('Submitted', 'centre'), 'Received');
  assert.equal(statusLabel('Submitted', 'parent'), 'Submitted');
  assert.equal(statusLabel('Submitted'), 'Submitted');
  assert.equal(statusLabel('Under review', 'centre'), 'Under review');
  assert.equal(statusLabel('Offer', 'centre'), 'Offer Available');
});
