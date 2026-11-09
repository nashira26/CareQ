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
