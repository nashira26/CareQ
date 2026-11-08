/**
 * Centres with documents indexed on the server (GET /api/document-centres): the committed operator
 * handbooks AND documents a self-registered centre uploaded (stored in policyChunks). Used with
 * coverageFor() so "Ask about this centre" also appears for centres with uploads.
 * Fetched once on first use, refreshed when older than a minute or after an upload. Never throws.
 */
import { useEffect, useSyncExternalStore } from 'react';

const MAX_AGE_MS = 60_000;

let ids = new Set<string>();
let loadedAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

/** Fetches the list (deduplicated); keeps the last good list if the server can't be reached. */
export function refreshDocumentCentres(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch('/api/document-centres', { credentials: 'same-origin' });
      const data = res.ok ? ((await res.json().catch(() => null)) as { centreIds?: unknown } | null) : null;
      if (Array.isArray(data?.centreIds)) {
        ids = new Set(data.centreIds.filter((x): x is string => typeof x === 'string'));
        notify();
      }
    } catch {
      // offline: keep what we have (the committed handbook list still works)
    } finally {
      loadedAt = Date.now();
      inFlight = null;
    }
  })();
  return inFlight;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** True when the server has documents indexed for this centre (handbook or upload). */
export function useHasDocuments(centreId: string | null | undefined): boolean {
  useEffect(() => {
    if (Date.now() - loadedAt > MAX_AGE_MS) void refreshDocumentCentres();
  }, []);
  return useSyncExternalStore(subscribe, () => Boolean(centreId && ids.has(centreId)), () => false);
}
