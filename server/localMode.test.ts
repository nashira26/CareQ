/**
 * Starts the real server (server.ts) with no MONGODB_URI and checks it falls back to local mode:
 * it says why, the shared-data API isn't mounted (no 503s), and the app itself loads.
 * No database and no Gemini calls are needed.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let child: ChildProcess;
let base = '';
let output = '';

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });

before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: root,
    // Empty values win over .env (dotenv never overrides a variable that is already set)
    env: { ...process.env, MONGODB_URI: '', DATA_MODE: '', GEMINI_API_KEY: '', NODE_ENV: 'development', DISABLE_HMR: 'true', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout!.on('data', (d) => (output += d));
  child.stderr!.on('data', (d) => (output += d));
  const deadline = Date.now() + 60_000;
  while (!/CareQ server running/.test(output)) {
    if (child.exitCode !== null) throw new Error(`server exited early:\n${output}`);
    if (Date.now() > deadline) throw new Error(`server did not start in 60 s:\n${output}`);
    await new Promise((r) => setTimeout(r, 200));
  }
});

after(() => {
  child?.kill();
});

test('no MONGODB_URI: local mode, and the log says why', async () => {
  assert.match(output, /\[data\] MONGODB_URI is not set: starting in local mode/);
  const config = await (await fetch(`${base}/api/config`)).json();
  assert.equal(config.dataMode, 'local');
  assert.equal(config.dataModeReason, 'MONGODB_URI is not set');
  assert.equal(config.resetAvailable, false);
  const mode = await (await fetch(`${base}/api/mode`)).json();
  assert.deepEqual(mode, { dataMode: 'local', dataModeReason: 'MONGODB_URI is not set', mongo: 'not used' });
});

test('no MONGODB_URI: the shared-data API is not mounted (JSON 404, never a 503)', async () => {
  const res = await fetch(`${base}/api/state`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not found.' });
  const health = await (await fetch(`${base}/api/health`)).json();
  assert.equal(health.dataMode, 'local');
  assert.equal(health.mongo, 'not used');
});

test('no MONGODB_URI: the app page and its entry module load', async () => {
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /\/src\/main\.tsx/);
  const entry = await fetch(`${base}/src/main.tsx`);
  assert.equal(entry.status, 200);
  assert.match(await entry.text(), /App/);
  const app = await fetch(`${base}/src/App.tsx`);
  assert.equal(app.status, 200);
  assert.match(await app.text(), /normaliseSnapshot/);
});

test('no MONGODB_URI: AI and document endpoints still answer (local index or empty), no 503', async () => {
  const res = await fetch(`${base}/api/document-centres`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray((await res.json()).centreIds));
  // Without a key Gemini fails fast and the endpoint uses its fallback, with aiMode/modelUsed
  const tone = await fetch(`${base}/api/check-tone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Thank you for the update.', role: 'parent' }),
  });
  assert.equal(tone.status, 200);
  const body = await tone.json();
  assert.equal(body.aiMode, 'fallback');
  assert.equal(body.modelUsed, null);
});
