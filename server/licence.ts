/**
 * Licence check for self-registered centres, against the Ontario open data (src/data/ontarioCentres.json).
 * "Licensed · verified against Ontario open data" needs the licence number AND either the postal code
 * or a close name match: a licence number alone is public, so it proves nothing by itself.
 */
import ontario from '../src/data/ontarioCentres.json';
import type { LicenceVerification } from '../src/data/mockData';

type OpenCentre = { id: string; licenceNumber: string; name: string; postalCode: string | null };
const CENTRES = (ontario as { centres: OpenCentre[]; metadata: { sources: { ontario: { dataDate: string } } } }).centres;
const DATA_DATE = (ontario as any).metadata?.sources?.ontario?.dataDate ?? null;

/** "00576", "576", "#00576" -> "576" (the open data mixes leading zeros). */
export const normaliseLicence = (s: string) => s.replace(/[^0-9a-z]/gi, '').replace(/^0+/, '').toLowerCase();
const normalisePostal = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, '').toUpperCase();
const STOP = new Set(['the', 'and', 'of', 'centre', 'center', 'child', 'care', 'childcare', 'daycare', 'day', 'early', 'learning', 'inc', 'ltd']);
const nameWords = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );

/** Close name match: most distinctive words shared (Jaccard ≥ 0.5 over words other than "child care centre"). */
export function namesMatch(a: string, b: string): boolean {
  const x = nameWords(a);
  const y = nameWords(b);
  if (!x.size || !y.size) return false;
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / new Set([...x, ...y]).size >= 0.5;
}

export function verifyLicence(input: { licenceNumber?: string; postalCode?: string; name: string }): LicenceVerification | undefined {
  const wanted = normaliseLicence(input.licenceNumber ?? '');
  if (!wanted) return undefined;
  const record = CENTRES.find((c) => normaliseLicence(c.licenceNumber) === wanted);
  if (!record) return undefined;
  const postal = Boolean(record.postalCode) && normalisePostal(record.postalCode) === normalisePostal(input.postalCode);
  const name = namesMatch(record.name, input.name);
  if (!postal && !name) return undefined;
  return {
    source: 'Ontario open data',
    openDataId: record.id,
    matchedName: record.name,
    matchedBy: postal && name ? 'licence number, postal code and name' : postal ? 'licence number and postal code' : 'licence number and name',
    dataDate: DATA_DATE,
  };
}
