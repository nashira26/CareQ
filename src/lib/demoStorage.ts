/**
 * Saves the demo state in this browser only (localStorage), so a refresh doesn't reset the demo.
 *
 * - One versioned key. Missing, invalid JSON or another version -> start from the mock data.
 * - Every read/write is wrapped in try/catch: with storage blocked (private window) the app works
 *   normally, it just doesn't remember anything.
 * - Plain-text passwords are never saved. The 1,100 open-data centres and the AI cache are never saved.
 * - Demo centres are saved as overrides (requirements + sources) on top of the mock data, so code
 *   changes to demo centres still show; self-registered centres are saved in full.
 */
import type { Application, Centre, ChatMessage, InAppNotification } from '../data/mockData';
import type { SupportRequest } from '../data/helpData';
import type { PreparedDraft } from './prepareApplication';

export const DEMO_STORAGE_KEY = 'careq-demo-v2';
export const DEMO_STORAGE_VERSION = 2;
/** Older saved demos (different data shape): deleted on start, never converted. */
export const OLD_DEMO_KEYS = ['careq-demo-v1'];
export const SHORTLIST_KEY = 'careq.shortlist.v1';
/** Every key Reset demo clears. */
export const DEMO_KEYS = [DEMO_STORAGE_KEY, SHORTLIST_KEY, ...OLD_DEMO_KEYS];

/** Account as saved: never a plain-text password. */
export interface SavedAccount {
  id: string;
  role: 'parent' | 'centre';
  email: string;
  name: string;
  passwordHash?: string;
  childName?: string;
  childAgeMonths?: number;
  centreName?: string;
  centreId?: string;
}

export interface CentreOverride {
  id: string;
  requirements: string[];
  requirementSources?: Record<string, string>;
}

export interface DemoState {
  mockAccounts: SavedAccount[];
  sessionAccountId: string | null;
  applications: Application[];
  conversations: Record<string, ChatMessage[]>;
  notifications: InAppNotification[];
  supportRequests: SupportRequest[];
  centreOverrides: CentreOverride[];
  selfRegisteredCentres: Centre[];
  preparedDrafts: Record<string, PreparedDraft>;
}

interface SavedDemo extends DemoState {
  version: number;
  savedAt: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** window.localStorage, or null if it doesn't exist or access throws. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

let savingSuspended = false;
/** Called before Reset reloads the page, so a pending debounced save can't write the old state back. */
export const suspendSaving = () => {
  savingSuspended = true;
};

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
const rec = <T,>(v: unknown, fallback: Record<string, T>): Record<string, T> => (isObj(v) ? (v as Record<string, T>) : fallback);

/** Loads saved state, or null to use the mock data. Each section falls back on its own if malformed. */
export function loadDemoState(storage: StorageLike | null = browserStorage()): DemoState | null {
  if (!storage) return null;
  // Start fresh from older versions: remove them instead of converting
  for (const key of OLD_DEMO_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  let raw: string | null;
  try {
    raw = storage.getItem(DEMO_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(parsed) || parsed.version !== DEMO_STORAGE_VERSION) return null;
  return {
    mockAccounts: arr<SavedAccount>(parsed.mockAccounts, []).filter((a) => isObj(a) && typeof a.id === 'string'),
    sessionAccountId: typeof parsed.sessionAccountId === 'string' ? parsed.sessionAccountId : null,
    applications: arr<Application>(parsed.applications, []).filter(
      (a) => isObj(a) && typeof a.id === 'string' && typeof a.parentAccountId === 'string' && typeof a.childId === 'string'
    ),
    conversations: rec<ChatMessage[]>(parsed.conversations, {}),
    notifications: arr<InAppNotification>(parsed.notifications, []).filter((n) => isObj(n) && typeof n.recipientId === 'string'),
    supportRequests: arr<SupportRequest>(parsed.supportRequests, []),
    centreOverrides: arr<CentreOverride>(parsed.centreOverrides, []).filter(
      (c) => isObj(c) && typeof c.id === 'string' && Array.isArray(c.requirements)
    ),
    selfRegisteredCentres: arr<Centre>(parsed.selfRegisteredCentres, []).filter((c) => isObj(c) && typeof c.id === 'string'),
    preparedDrafts: rec<PreparedDraft>(parsed.preparedDrafts, {}),
  };
}

/** Saves state; returns false (and changes nothing) if storage is unavailable or full. */
export function saveDemoState(state: DemoState, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage || savingSuspended) return false;
  const saved: SavedDemo = {
    version: DEMO_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    ...state,
    mockAccounts: state.mockAccounts.map(toSavedAccount),
  };
  try {
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}

/** Removes every CareQ demo key (including the shortlist). */
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

/** Drops any plain-text password; keeps only a hash if one was made at sign-up. */
export function toSavedAccount(a: SavedAccount & { password?: string }): SavedAccount {
  const { password: _ignored, ...rest } = a;
  return rest;
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

/** Mock centres with saved requirement overrides applied, plus self-registered centres first. */
export function mergeCentres(initial: Centre[], overrides: CentreOverride[], selfRegistered: Centre[]): Centre[] {
  const byId = new Map(overrides.map((o) => [o.id, o]));
  const initialIds = new Set(initial.map((c) => c.id));
  const merged = initial.map((c) => {
    const o = byId.get(c.id);
    return o ? { ...c, requirements: o.requirements, requirementSources: o.requirementSources ?? c.requirementSources } : c;
  });
  return [...selfRegistered.filter((c) => !initialIds.has(c.id)), ...merged];
}

/** Splits current centres into overrides for mock centres and full copies of self-registered ones. */
export function splitCentres(current: Centre[], initial: Centre[]): Pick<DemoState, 'centreOverrides' | 'selfRegisteredCentres'> {
  const initialIds = new Set(initial.map((c) => c.id));
  return {
    centreOverrides: current
      .filter((c) => initialIds.has(c.id))
      .map((c) => ({ id: c.id, requirements: c.requirements, requirementSources: c.requirementSources })),
    selfRegisteredCentres: current.filter((c) => !initialIds.has(c.id)),
  };
}
