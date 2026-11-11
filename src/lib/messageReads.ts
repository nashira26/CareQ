/**
 * Which centre messages a parent has read, kept in this browser only (no server change).
 * Saved per account id under one localStorage key; Reset demo clears it (see DEMO_KEYS).
 * Every read and write is wrapped: with storage blocked, messages simply stay unread until read in this tab.
 */
import { browserStorage, MESSAGE_READS_STORAGE_KEY as MESSAGE_READS_KEY } from './demoStorage';

type Saved = Record<string, string[]>;

function loadAll(): Saved {
  try {
    const raw = browserStorage()?.getItem(MESSAGE_READS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Saved) : {};
  } catch {
    return {};
  }
}

export function loadMessageReads(accountId: string): Set<string> {
  const ids = loadAll()[accountId];
  return new Set(Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : []);
}

export function saveMessageReads(accountId: string, ids: Set<string>): void {
  try {
    const all = loadAll();
    all[accountId] = [...ids];
    browserStorage()?.setItem(MESSAGE_READS_KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked: keep the in-memory state */
  }
}
