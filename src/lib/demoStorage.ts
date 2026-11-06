/**
 * Local mode only (DATA_MODE=local): the whole demo world saved in this browser (localStorage).
 * In mongo mode nothing here is used except the shortlist key and the reset token key.
 *
 * - One versioned key. Missing, invalid JSON or another version -> start from the seed data.
 * - Every read/write is wrapped in try/catch: with storage blocked (private window) the app works
 *   normally, it just doesn't remember anything.
 * - Passwords are only ever stored as hashes. The 1,100 open-data centres and the AI cache are never saved.
 */
import type { PasswordHasher, World } from './world';

export const DEMO_STORAGE_KEY = 'careq-demo-v3';
export const DEMO_STORAGE_VERSION = 3;
/** Older saved demos (different data shape): deleted on start, never converted. */
export const OLD_DEMO_KEYS = ['careq-demo-v1', 'careq-demo-v2'];
export const SHORTLIST_KEY = 'careq.shortlist.v1';
/** Every localStorage key Reset demo clears. */
export const DEMO_KEYS = [DEMO_STORAGE_KEY, SHORTLIST_KEY, ...OLD_DEMO_KEYS];
/** Mongo mode: the admin reset token, kept for this browser tab only (sessionStorage). */
export const RESET_TOKEN_SESSION_KEY = 'careq.resetToken';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function sessionStore(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

let savingSuspended = false;
/** Called before Reset reloads the page, so a pending save can't write the old world back. */
export const suspendSaving = () => {
  savingSuspended = true;
};

interface SavedWorld {
  version: number;
  savedAt: string;
  sessionAccountId: string | null;
  world: World;
}

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const WORLD_LISTS: (keyof World)[] = ['accounts', 'children', 'centres', 'applications', 'conversations', 'notifications', 'supportRequests'];

/** The saved world, or null to start from the seed data. */
export function loadLocalWorld(storage: StorageLike | null = browserStorage()): { world: World; sessionAccountId: string | null } | null {
  if (!storage) return null;
  for (const key of OLD_DEMO_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  let parsed: unknown;
  try {
    const raw = storage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(parsed) || parsed.version !== DEMO_STORAGE_VERSION || !isObj(parsed.world)) return null;
  const world = parsed.world as Record<string, unknown>;
  if (!WORLD_LISTS.every((k) => Array.isArray(world[k]))) return null;
  return {
    world: world as unknown as World,
    sessionAccountId: typeof parsed.sessionAccountId === 'string' ? parsed.sessionAccountId : null,
  };
}

/** Saves the world; returns false (and changes nothing) if storage is unavailable or full. */
export function saveLocalWorld(world: World, sessionAccountId: string | null, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage || savingSuspended) return false;
  const saved: SavedWorld = { version: DEMO_STORAGE_VERSION, savedAt: new Date().toISOString(), sessionAccountId, world };
  try {
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}

/** Removes every CareQ demo key in this browser (including the shortlist). */
export function clearDemoStorage(storage: StorageLike | null = browserStorage()): void {
  if (!storage) return;
  for (const key of DEMO_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/** SHA-256 hex of the password, or undefined if Web Crypto isn't available. Never throws. */
export async function hashPassword(password: string): Promise<string | undefined> {
  if (!password) return undefined;
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return undefined;
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

/** Local mode password hashing (the server uses bcrypt). */
export const browserHasher: PasswordHasher = {
  hash: async (p) => (await hashPassword(p)) ?? '',
  verify: async (p, h) => Boolean(h) && (await hashPassword(p)) === h,
};
