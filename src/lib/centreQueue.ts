/** Centre-side ordering helpers (pure, unit-tested). */
import type { Application } from '../data/mockData';

/** "Sep 22, 2026" -> timestamp; missing or unreadable dates -> -Infinity (sorted last). */
export const submittedTime = (a: Pick<Application, 'submittedAt'>): number => {
  const t = a.submittedAt ? Date.parse(a.submittedAt) : NaN;
  return Number.isNaN(t) ? -Infinity : t;
};

/** The newest sent requests (never drafts), by submission date, newest first. */
export function newestRequests<T extends Pick<Application, 'status' | 'submittedAt'>>(applications: T[], limit = 5): T[] {
  return applications
    .filter((a) => a.status !== 'Draft')
    .map((a, i) => ({ a, i, t: submittedTime(a) }))
    .sort((x, y) => (y.t === x.t ? x.i - y.i : y.t > x.t ? 1 : -1))
    .slice(0, limit)
    .map((x) => x.a);
}

/**
 * Short reference shown instead of an internal id: "Ref. CQ-4821". Four digits from a hash (FNV-1a) of the
 * id, so the same application always gets the same reference and it never spells part of a name.
 */
export const shortRef = (id: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `Ref. CQ-${String(h % 10000).padStart(4, '0')}`;
};
