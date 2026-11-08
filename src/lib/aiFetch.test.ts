import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AI_OFFLINE_STATUS, aiPost, isUserFacingAiError, setAiOffline } from './aiFetch';

afterEach(() => setAiOffline(false));

test('offline demo: AI calls make no request and return the offline status, which is not shown as an error', async () => {
  let called = false;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error('should not be called');
  }) as typeof fetch;
  try {
    setAiOffline(true);
    const r = await aiPost('/api/prepare-application', {});
    assert.equal(called, false);
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.status, AI_OFFLINE_STATUS);
    assert.equal(isUserFacingAiError(AI_OFFLINE_STATUS), false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('online: an unreachable server is still a user-facing message', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError('network');
  }) as typeof fetch;
  try {
    const r = await aiPost('/api/check-tone', {});
    assert.equal(!r.ok && r.status, 0);
    assert.equal(isUserFacingAiError(0), true);
  } finally {
    globalThis.fetch = realFetch;
  }
});
