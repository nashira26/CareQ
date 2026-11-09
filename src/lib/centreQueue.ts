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

/** Short reference shown instead of an internal id: "Ref. CQ-4F2A" (last 4 letters or digits, uppercase). */
export const shortRef = (id: string): string => `Ref. CQ-${id.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase()}`;
