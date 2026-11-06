/**
 * API integration test against a throwaway "careq_test" database on the configured cluster.
 * Two parents and two centres with real cookies; asserts scoping (403s) end to end; drops the DB after.
 * Skipped when MONGODB_URI is not set.
 */
import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { connectMongo, ensureIndexes, reseed, mongo } from './db';
import { createDataApi } from './api';
import torontoAreas from '../src/data/torontoAreas.json';
import fsaCentroids from '../src/data/fsaCentroids.json';
import type { Area, FsaCentroids } from '../src/lib/rankCentres';

const TEST_DB = 'careq_test';
const skip = !process.env.MONGODB_URI;
let server: Server;
let base = '';

before(async () => {
  if (skip) return;
  await connectMongo(process.env.MONGODB_URI, TEST_DB, async (db) => {
    await ensureIndexes(db);
    await reseed(db);
  });
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(
    '/api',
    createDataApi({ allowReset: true, resetToken: 'test-token', areas: (torontoAreas as { areas: Area[] }).areas, fsa: fsaCentroids as FsaCentroids })
  );
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  if (skip) return;
  server?.close();
  await mongo.db?.dropDatabase();
  await mongo.client?.close();
});

/** A tiny client that keeps its own session cookie (like a separate device). */
function client() {
  let cookie = '';
  return async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, json: (await res.json().catch(() => null)) as any };
  };
}

const child = { id: 'x', firstName: 'Mila', dateOfBirth: '2025-03-10', careType: 'Full day', preferredStartDate: 'January 2027', homeArea: 'Danforth & Pape', notes: '' };
const centreForm = {
  name: 'Sunny Steps', street: '640 Pape Ave', postalCode: 'M4K 3S3', neighbourhood: 'Danforth & Pape', licenceNumber: '',
  ageGroups: ['Toddler'], programOptions: ['Full day'], languages: ['English'], hours: '8 AM – 6 PM', capacity: '', contactEmail: 'jordan@sunny.example', policyText: '',
};

test('scoping over HTTP: parents and centres only reach their own data', { skip }, async () => {
  const priya = client();
  const alex = client();
  const riverdale = client();
  const sunny = client();

  assert.equal((await priya('POST', '/auth/login', { role: 'parent', email: 'priya@example.ca', password: 'password' })).status, 200);
  assert.equal((await riverdale('POST', '/auth/login', { role: 'centre', email: 'centre@riverdale.ca', password: 'password' })).status, 200);
  assert.equal((await alex('POST', '/auth/signup', { role: 'parent', name: 'Alex Morgan', email: 'alex@example.ca', password: 'alexpass1', termsAccepted: true })).status, 201);
  assert.equal((await alex('POST', '/onboarding', { children: [child] })).status, 200);
  assert.equal((await sunny('POST', '/auth/signup', { role: 'centre', name: 'Jordan Lee', email: 'jordan@sunny.example', password: 'sunnysteps1', termsAccepted: true })).status, 201);
  const reg = await sunny('POST', '/centres/register', { form: centreForm });
  assert.equal(reg.status, 201);
  const sunnyId = reg.json.account.centreId as string;

  // Alex applies to Sunny Steps
  const created = await alex('POST', '/applications', { centreId: sunnyId });
  assert.equal(created.status, 201);
  const appId = created.json.id as string;
  assert.equal((await alex('POST', `/applications/${appId}/submit`)).status, 200);

  // A parent can't read or change another parent's application (403)
  assert.equal((await priya('POST', `/applications/${appId}/withdraw`)).status, 403);
  assert.equal((await priya('PATCH', '/applications/app-c4-anya/draft', { change: { kind: 'noteToCentre', note: 'mine' } })).status, 200);
  assert.equal((await alex('PATCH', '/applications/app-c4-anya/draft', { change: { kind: 'noteToCentre', note: 'hijack' } })).status, 403);
  const priyaState = (await priya('GET', '/state')).json;
  assert.ok(!priyaState.applications.some((a: any) => a.id === appId));
  assert.ok(priyaState.applications.every((a: any) => a.parentAccountId === 'parent-priya'));

  // A centre can't read or change another centre's application (403)
  assert.equal((await riverdale('POST', `/applications/${appId}/status`, { status: 'Waitlisted', waitlistPosition: 1 })).status, 403);
  assert.ok(!(await riverdale('GET', '/state')).json.applications.some((a: any) => a.id === appId));
  assert.equal((await riverdale('PUT', `/centres/${sunnyId}/requirements`, { requirements: ['X'], sources: {} })).status, 403);

  // The right centre sees it and sets a position; the parent sees it (different "devices")
  const sunnyState = (await sunny('GET', '/state')).json;
  assert.deepEqual(sunnyState.applications.map((a: any) => a.id), [appId]);
  assert.equal((await sunny('POST', `/applications/${appId}/status`, { status: 'Waitlisted', waitlistPosition: 4 })).status, 200);
  const alexState = (await alex('GET', '/state')).json;
  assert.equal(alexState.applications.find((a: any) => a.id === appId).waitlistPosition, 4);
  assert.ok(alexState.notifications.some((n: any) => /Sunny Steps updated your position to 4/.test(n.message)));
  assert.ok(!(await priya('GET', '/state')).json.notifications.some((n: any) => /Sunny Steps/.test(n.message)));

  // Messages are scoped too
  const alexChild = alexState.account.children[0].id;
  assert.equal((await riverdale('POST', '/messages', { centreId: sunnyId, childId: alexChild, text: 'hi', aiAssisted: false })).status, 403);
  assert.equal((await sunny('POST', '/messages', { centreId: sunnyId, childId: alexChild, text: 'Welcome!', aiAssisted: false })).status, 200);
  assert.deepEqual(Object.keys((await priya('GET', '/state')).json.conversations).filter((k) => k.includes(alexChild)), []);

  // Signed out: no private data; invalid bodies are 400s
  assert.equal((await client()('POST', '/applications', { centreId: 'c1' })).status, 401);
  assert.equal((await alex('POST', `/applications/${appId}/status`, { status: 'Hacked' })).status, 400);

  // Reset needs the token
  assert.equal((await client()('POST', '/reset', undefined, { 'X-Reset-Token': 'nope' })).status, 403);
  assert.equal((await client()('POST', '/reset', undefined, { 'X-Reset-Token': 'test-token' })).status, 200);
  assert.equal((await alex('GET', '/state')).json.account, null, 'reset signs everyone out');
});
