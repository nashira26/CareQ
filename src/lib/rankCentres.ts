/**
 * Plain-code ranking of centres against a parent's search criteria. No AI is involved here:
 * the AI only turns the parent's words into SearchCriteria and rephrases the facts produced below.
 *
 * Scoring (out of 100), applied identically to CareQ partner centres and open-data centres
 * (partner centres get NO bonus):
 *   - Distance       50  50 points at 0 km, falling linearly to 0 at maxDistanceKm (or 10 km if no
 *                        maximum was given). 0 if the location of either side is unknown.
 *   - Program fit    30  Split between the criteria the parent gave: serving the requested age group
 *                        and offering the requested care type (15 + 15, or 30 if only one was given).
 *                        Centres whose ages are not reported get 0 age points (they are not excluded).
 *   - Extras         20  Shared equally between requested languages and the must-haves / nice-to-haves
 *                        that can be checked against centre data (CWELCC, program options, language,
 *                        "Montessori" in the name). Anything we can't check is excluded from scoring,
 *                        including a language that appears in no centre's data at all.
 * Hard filters: the centre must serve the requested age group (unknown ages are kept), and must be
 * within maxDistanceKm when both the distance and the maximum are known.
 * Languages: a requested language becomes a filter when at least LANGUAGE_FILTER_MIN centres (after the
 * other filters) offer it. Otherwise every centre is still ranked and its result says, per language,
 * whether it's offered ("French: offered" / "French: not offered" / not reported).
 * Sort: score (high to low), then distance (near to far, unknown last), then name.
 */
import type { AgeGroup } from '../data/mockData';
import type { SearchCriteria } from './searchCriteria';

export interface RankableCentre {
  id: string;
  name: string;
  kind: 'partner' | 'open-data';
  lat: number | null;
  lng: number | null;
  ageGroups: AgeGroup[] | null; // null = not reported
  programOptions: string[];
  languages: string[]; // [] = not reported
  cwelcc: boolean | null;
  /** Location is an approximate area point (self-registered centres): shown without false precision. */
  approximateLocation?: { neighbourhood: string };
}

export interface Place {
  label: string;
  lat: number;
  lng: number;
  kind: 'area' | 'postal-code';
}

export interface Area {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
}

export type FsaCentroids = Record<string, { lat: number; lng: number; centres: number }>;

export interface RankedCentre {
  id: string;
  score: number;
  distanceKm: number | null;
  matchedFacts: string[];
  unknownFacts: string[];
  /** Only when a requested language had too few matches to filter on: offered, not offered, or not reported (null). */
  languageStatus?: { language: string; offered: boolean | null }[];
}

/** A requested language filters the results only when at least this many centres offer it. */
export const LANGUAGE_FILTER_MIN = 3;

export const DEFAULT_DISTANCE_SCALE_KM = 10;
const POINTS = { distance: 50, program: 30, extras: 20 };

// ---------- Geography ----------

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const normPlace = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(the|near|around|close to|area|neighbourhood|neighborhood|toronto|on|ontario)\b/g, ' ')
    .replace(/\b(street|st|avenue|ave|road|rd)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * areaText -> a known place: exact name/alias match, then a name/alias contained in the text
 * (longest first), then a Toronto postal-code area (FSA, e.g. "M4K"). Otherwise null.
 */
export function resolveArea(areaText: string | null, areas: Area[], fsa: FsaCentroids): Place | null {
  if (!areaText) return null;
  const text = normPlace(areaText);
  if (!text) return null;
  const entries = areas.flatMap((a) =>
    [a.name, ...a.aliases].map((n) => ({ area: a, key: normPlace(n) })).filter((e) => e.key)
  );
  const exact = entries.find((e) => e.key === text);
  if (exact) return { label: exact.area.name, lat: exact.area.lat, lng: exact.area.lng, kind: 'area' };
  const contained = entries
    .filter((e) => new RegExp(`\\b${e.key.replace(/ /g, '\\s+')}\\b`).test(text))
    .sort((a, b) => b.key.length - a.key.length)[0];
  if (contained) return { label: contained.area.name, lat: contained.area.lat, lng: contained.area.lng, kind: 'area' };
  const code = areaText.toUpperCase().match(/\b(M\d[A-Z])(?:\s?\d[A-Z]\d)?\b/);
  if (code && fsa[code[1]]) {
    const c = fsa[code[1]];
    return { label: `${code[1]} postal area`, lat: c.lat, lng: c.lng, kind: 'postal-code' };
  }
  return null;
}

// ---------- Checkable facts ----------

interface FactCheck {
  label: string; // shown to parents, e.g. "CWELCC participant"
  test: (c: RankableCentre) => boolean | null; // null = the centre's data doesn't say
}

const hasProgram = (p: string) => (c: RankableCentre) => c.programOptions.includes(p);
const hasLanguage = (lang: string) => (c: RankableCentre) =>
  c.languages.length ? c.languages.some((l) => l.toLowerCase() === lang.toLowerCase()) : null;

/**
 * Languages (lowercase) that appear in at least one centre's data. A requested language outside
 * this set can't be checked: it becomes a "Can't check" chip and is excluded from scoring.
 * When omitted, every language is treated as checkable.
 */
export type KnownLanguages = Set<string> | undefined;

export const knownLanguagesOf = (centres: RankableCentre[]): Set<string> =>
  new Set(centres.flatMap((c) => c.languages.map((l) => l.toLowerCase())));

const isKnownLanguage = (lang: string, known: KnownLanguages) => !known || known.has(lang.toLowerCase());

/** Requested languages that no centre's data mentions. */
export const unverifiableLanguages = (criteria: SearchCriteria, known: KnownLanguages): string[] =>
  criteria.languages.filter((l) => !isKnownLanguage(l, known));

/** Turns a free-text must-have into something we can check, or null if our data can't answer it. */
export function checkableFact(text: string, known?: KnownLanguages): FactCheck | null {
  const t = text.toLowerCase();
  if (/cwelcc|\$\s?10|10\s?dollars|ten dollar/.test(t)) {
    return { label: 'CWELCC participant', test: (c) => c.cwelcc };
  }
  if (/extended hours|long hours|early drop|late pick/.test(t)) return { label: 'Offers extended hours', test: hasProgram('Extended hours') };
  if (/overnight/.test(t)) return { label: 'Offers overnight care', test: hasProgram('Overnight') };
  if (/before[\s-]school/.test(t)) return { label: 'Offers before-school care', test: hasProgram('Before school') };
  if (/after[\s-]school/.test(t)) return { label: 'Offers after-school care', test: hasProgram('After school') };
  if (/full[\s-]?(day|time)/.test(t)) return { label: 'Offers full-day care', test: hasProgram('Full day') };
  if (/half[\s-]day|part[\s-]?(day|time)/.test(t)) return { label: 'Offers part-day care', test: hasProgram('Half day') };
  if (/montessori/.test(t)) return { label: 'Montessori in the centre name', test: (c) => /montessori/i.test(c.name) };
  const lang = t.match(/^(?:speaks?\s+|in\s+)?([a-z]+)(?:[\s-]speaking| language| program(?:me)?)?$/);
  if (lang && KNOWN_LANGUAGES.has(lang[1]) && isKnownLanguage(lang[1], known)) {
    const name = lang[1].charAt(0).toUpperCase() + lang[1].slice(1);
    return { label: `Language: ${name}`, test: hasLanguage(name) };
  }
  return null;
}

const KNOWN_LANGUAGES = new Set([
  'english', 'french', 'mandarin', 'cantonese', 'chinese', 'spanish', 'portuguese', 'italian', 'greek',
  'hebrew', 'japanese', 'korean', 'tagalog', 'filipino', 'russian', 'ukrainian', 'armenian', 'arabic',
  'tamil', 'hindi', 'urdu', 'punjabi', 'somali', 'ojibwe', 'hungarian', 'dutch', 'german', 'polish',
]);

/** Criteria text we cannot check against any centre data (shown as grey "Can't check" chips). */
export function uncheckableCriteria(criteria: SearchCriteria, known?: KnownLanguages): string[] {
  const out = [
    ...unverifiableLanguages(criteria, known).map((l) => `${l}-speaking staff`),
    ...[...criteria.mustHaves, ...criteria.niceToHaves].filter((m) => !checkableFact(m, known)),
  ];
  if (criteria.startDate) out.unshift(`start ${criteria.startDate} (availability isn't known)`);
  return out;
}

const CARE_TYPE_PROGRAM: Record<string, string> = {
  'Full day': 'Full day',
  'Part day': 'Half day',
  'Before school': 'Before school',
  'After school': 'After school',
};
const AGE_LABEL: Record<AgeGroup, string> = { Infant: 'infants', Toddler: 'toddlers', Preschool: 'preschoolers' };

/** How a distance is shown. Approximate locations never show a precise distance under 1 km. */
export const APPROX_NEAR_KM = 1;
export function distanceLabel(distanceKm: number, approx?: RankableCentre['approximateLocation']): string {
  if (!approx) return `${distanceKm.toFixed(1)} km`;
  return distanceKm < APPROX_NEAR_KM
    ? `In ${approx.neighbourhood} · approximate location`
    : `≈ ${distanceKm.toFixed(1)} km`;
}
const distanceFact = (distanceKm: number, origin: Place, c: RankableCentre) =>
  c.approximateLocation && distanceKm < APPROX_NEAR_KM
    ? distanceLabel(distanceKm, c.approximateLocation)
    : `${distanceLabel(distanceKm, c.approximateLocation)} from ${origin.label}`;

// ---------- Ranking ----------

export function rankCentres(
  criteria: SearchCriteria,
  centres: RankableCentre[],
  origin: Place | null,
  known: KnownLanguages = knownLanguagesOf(centres)
): RankedCentre[] {
  const scale = criteria.maxDistanceKm ?? DEFAULT_DISTANCE_SCALE_KM;
  const careProgram = criteria.careType ? CARE_TYPE_PROGRAM[criteria.careType] : null;
  const programParts = (criteria.ageGroup ? 1 : 0) + (careProgram ? 1 : 0);
  const programEach = programParts ? POINTS.program / programParts : 0;
  const extras: FactCheck[] = [
    ...criteria.languages
      .filter((l) => isKnownLanguage(l, known)) // unverifiable languages are excluded from scoring
      .map((l) => ({ label: `Language: ${l}`, test: hasLanguage(l) })),
    ...[...criteria.mustHaves, ...criteria.niceToHaves]
      .map((m) => checkableFact(m, known))
      .filter((f): f is FactCheck => Boolean(f)),
  ].filter((f, i, all) => all.findIndex((g) => g.label === f.label) === i);
  const extraEach = extras.length ? POINTS.extras / extras.length : 0;

  const results: RankedCentre[] = [];
  for (const c of centres) {
    const matched: string[] = [];
    const unknown: string[] = [];
    let score = 0;

    // Distance
    let distanceKm: number | null = null;
    if (origin) {
      if (c.lat !== null && c.lng !== null) {
        distanceKm = haversineKm(origin.lat, origin.lng, c.lat, c.lng);
        if (criteria.maxDistanceKm !== null && distanceKm > criteria.maxDistanceKm) continue; // hard filter
        score += POINTS.distance * Math.max(0, 1 - distanceKm / scale);
        matched.push(distanceFact(distanceKm, origin, c));
      } else {
        unknown.push('Location not available');
      }
    }

    // Age group (hard filter when known)
    if (criteria.ageGroup) {
      if (c.ageGroups === null) unknown.push('Ages not reported');
      else if (!c.ageGroups.includes(criteria.ageGroup)) continue; // hard filter
      else {
        score += programEach;
        matched.push(`Serves ${AGE_LABEL[criteria.ageGroup]}`);
      }
    }

    // Care type
    if (careProgram) {
      if (c.programOptions.includes(careProgram)) {
        score += programEach;
        matched.push(`Offers ${careProgram.toLowerCase()} care`);
      }
    }

    // Languages and checkable must-haves / nice-to-haves
    for (const f of extras) {
      const r = f.test(c);
      if (r === true) {
        score += extraEach;
        matched.push(f.label);
      } else if (r === null) {
        unknown.push(`${f.label.replace(/^Language: /, 'Language ')} not reported`);
      }
    }

    results.push({ id: c.id, score: Math.round(score * 10) / 10, distanceKm, matchedFacts: matched, unknownFacts: unknown });
  }

  // Languages: filter when enough centres offer it, otherwise label each result
  const byId = new Map(centres.map((c) => [c.id, c]));
  let kept = results;
  for (const l of criteria.languages.filter((x) => isKnownLanguage(x, known))) {
    const offers = hasLanguage(l);
    const offering = kept.filter((r) => offers(byId.get(r.id)!) === true);
    if (offering.length >= LANGUAGE_FILTER_MIN) kept = offering;
    else {
      for (const r of kept) r.languageStatus = [...(r.languageStatus ?? []), { language: l, offered: offers(byId.get(r.id)!) }];
    }
  }

  const names = new Map(centres.map((c) => [c.id, c.name]));
  return kept.sort(
    (a, b) =>
      b.score - a.score ||
      (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
      (names.get(a.id) ?? '').localeCompare(names.get(b.id) ?? '')
  );
}

/** Plain-language sentence from facts only (used when the AI explanation is unavailable). */
export function factsSentence(matchedFacts: string[], unknownFacts: string[]): string {
  const parts: string[] = [];
  if (matchedFacts.length) {
    const s = matchedFacts.join(', ');
    parts.push(`${s.charAt(0).toUpperCase()}${s.slice(1)}.`);
  }
  if (unknownFacts.length) parts.push(`${unknownFacts.join(', ')}.`);
  return parts.join(' ') || 'No details from your search could be checked for this centre.';
}
