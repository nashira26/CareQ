/**
 * Search criteria shared by the server (/api/parse-search) and the Find page.
 * Only what the parent wrote is captured; nothing is inferred about the family.
 */
import type { AgeGroup } from '../data/mockData';

export type CareType = 'Full day' | 'Part day' | 'Before school' | 'After school';
export const CARE_TYPES: CareType[] = ['Full day', 'Part day', 'Before school', 'After school'];
export const AGE_GROUPS: AgeGroup[] = ['Infant', 'Toddler', 'Preschool'];

export interface SearchCriteria {
  areaText: string | null;
  maxDistanceKm: number | null;
  ageGroup: AgeGroup | null;
  childAgeMonths: number | null;
  careType: CareType | null;
  startDate: string | null;
  languages: string[];
  mustHaves: string[];
  niceToHaves: string[];
}

export const EMPTY_CRITERIA: SearchCriteria = {
  areaText: null,
  maxDistanceKm: null,
  ageGroup: null,
  childAgeMonths: null,
  careType: null,
  startDate: null,
  languages: [],
  mustHaves: [],
  niceToHaves: [],
};

/** <18 months Infant, <30 Toddler, else Preschool. */
export const ageGroupFromMonths = (months: number): AgeGroup =>
  months < 18 ? 'Infant' : months < 30 ? 'Toddler' : 'Preschool';

export const hasAnyCriteria = (c: SearchCriteria): boolean =>
  Boolean(
    c.areaText || c.maxDistanceKm !== null || c.ageGroup || c.childAgeMonths !== null || c.careType ||
      c.startDate || c.languages.length || c.mustHaves.length || c.niceToHaves.length
  );

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, 120) : null;
const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const strList = (v: unknown): string[] =>
  Array.isArray(v)
    ? Array.from(new Set(v.map(str).filter((x): x is string => Boolean(x)))).slice(0, 10)
    : [];
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** Validates anything (e.g. model output) into SearchCriteria; unknown or invalid -> null / []. */
export function sanitizeCriteria(raw: unknown): SearchCriteria {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const childAgeMonths = num(r.childAgeMonths, 0, 144);
  const ageGroup = AGE_GROUPS.includes(r.ageGroup as AgeGroup) ? (r.ageGroup as AgeGroup) : null;
  return {
    areaText: str(r.areaText),
    maxDistanceKm: num(r.maxDistanceKm, 0.1, 100),
    childAgeMonths: childAgeMonths === null ? null : Math.round(childAgeMonths),
    // If an age in months was given, the age group is derived from it (not left to the model).
    ageGroup: childAgeMonths !== null ? ageGroupFromMonths(childAgeMonths) : ageGroup,
    careType: CARE_TYPES.includes(r.careType as CareType) ? (r.careType as CareType) : null,
    startDate: str(r.startDate),
    languages: strList(r.languages).map(titleCase),
    mustHaves: strList(r.mustHaves),
    niceToHaves: strList(r.niceToHaves),
  };
}

// ---------- Keyword fallback (used when Gemini is unavailable) ----------

const LANGUAGES = [
  'English', 'French', 'Mandarin', 'Cantonese', 'Chinese', 'Spanish', 'Portuguese', 'Italian', 'Greek',
  'Hebrew', 'Japanese', 'Korean', 'Tagalog', 'Filipino', 'Russian', 'Ukrainian', 'Armenian', 'Arabic',
  'Tamil', 'Hindi', 'Urdu', 'Punjabi', 'Somali', 'Ojibwe', 'Hungarian', 'Dutch', 'German', 'Polish',
];
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
  'november', 'december',
];
// Phrases kept as must-haves; whether they can be checked is decided later by rankCentres.
const MUST_HAVE_PHRASES = [
  'cwelcc', '$10 a day', '$10/day', '$10 per day', 'extended hours', 'overnight', 'montessori',
  'near subway', 'near the subway', 'near ttc', 'subway', 'outdoor space', 'outdoor play', 'playground',
  'garden', 'meals included', 'hot lunch', 'organic', 'nut-free', 'nut free', 'parking', 'flexible hours',
];

/** Plain keyword parsing of the parent's description. Only extracts what was literally written. */
export function parseSearchFallback(text: string): SearchCriteria {
  const t = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  const raw: Record<string, unknown> = {};

  const years = t.match(/(\d+(?:\.\d+)?)[\s-]*(?:years?|yrs?|y\/o)(?:[\s-]*old)?/);
  const months = t.match(/(\d+)[\s-]*(?:months?|mos?)(?:[\s-]*old)?/);
  if (months) raw.childAgeMonths = Number(months[1]);
  else if (years) raw.childAgeMonths = Math.round(Number(years[1]) * 12);
  else if (/\b(infant|baby)\b/.test(t)) raw.ageGroup = 'Infant';
  else if (/\btoddler\b/.test(t)) raw.ageGroup = 'Toddler';
  else if (/\bpre-?school(er)?\b/.test(t)) raw.ageGroup = 'Preschool';

  if (/\bbefore[\s-]school\b/.test(t)) raw.careType = 'Before school';
  else if (/\bafter[\s-]school\b/.test(t)) raw.careType = 'After school';
  else if (/\b(part[\s-]?time|part[\s-]day|half[\s-]day)\b/.test(t)) raw.careType = 'Part day';
  else if (/\bfull[\s-]?(time|day)\b/.test(t)) raw.careType = 'Full day';

  const km = t.match(/(?:within|under|less than|max(?:imum)?)?\s*(\d+(?:\.\d+)?)\s*km\b/);
  if (km) raw.maxDistanceKm = Number(km[1]);

  const start = t.match(new RegExp(`\\b(?:from|starting(?: in)?|start(?:ing)? in|by|in)\\s+(${MONTHS.join('|')})(\\s+\\d{4})?`));
  if (start) raw.startDate = `${titleCase(start[1])}${start[2] ?? ''}`;

  raw.languages = LANGUAGES.filter((l) => new RegExp(`\\b${l.toLowerCase()}\\b`).test(t));

  const fsa = text.match(/\b([Mm]\d[A-Za-z])\b/);
  const area = t.match(/\b(?:near|around|close to|in|by)\s+(?!the subway|subway|ttc\b)([a-z0-9.'&\- ]+?)(?=,| from | starting | within | for | with | that | who | and (?:a|an|has|have|with)\b|\.|;| $)/);
  if (fsa) raw.areaText = fsa[1].toUpperCase();
  else if (
    area &&
    !MONTHS.includes(area[1].trim()) &&
    !LANGUAGES.some((l) => l.toLowerCase() === area[1].trim())
  ) {
    raw.areaText = area[1].trim();
  }

  const found: string[] = [];
  for (const p of MUST_HAVE_PHRASES) {
    if (t.includes(p) && !found.some((f) => f.includes(p) || p.includes(f))) found.push(p);
  }
  raw.mustHaves = found;

  return sanitizeCriteria(raw);
}
