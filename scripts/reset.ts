/**
 * npm run reset                          Reset the demo on http://localhost:$PORT (default 3000)
 * npm run reset -- https://careq.onrender.com   Reset a deployed demo
 * Uses RESET_TOKEN from .env (sent as the X-Reset-Token header). The server must have ALLOW_RESET=true.
 * Re-seeds the server's app database (MONGODB_DB) only; the policy index (MONGODB_POLICY_DB) is never touched.
 */
import 'dotenv/config';

const base = (process.argv[2] || process.env.RESET_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const token = process.env.RESET_TOKEN;
if (!token) {
  console.error('RESET_TOKEN is not set in .env.');
  process.exit(1);
}
try {
  // Which database will be reset (names only), so the output says where it happened
  const health = (await fetch(`${base}/api/health`).then((r) => r.json()).catch(() => ({}))) as { db?: string | null; policyDb?: string | null };
  if (health.db) console.log(`Resetting app data in "${health.db}" (policy index in "${health.policyDb ?? health.db}" is left alone)`);
  const res = await fetch(`${base}/api/reset`, { method: 'POST', headers: { 'X-Reset-Token': token } });
  const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!res.ok) {
    console.error(`Reset failed (${res.status}): ${body.error ?? res.statusText}`);
    process.exitCode = 1;
  } else {
    console.log(`Reset OK on ${base}: ${body.message}`);
  }
} catch (e) {
  console.error(`Could not reach ${base}: ${(e as Error).message}`);
  process.exitCode = 1;
}
