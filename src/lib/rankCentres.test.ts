import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rankCentres,
  resolveArea,
  haversineKm,
  checkableFact,
  uncheckableCriteria,
  factsSentence,
  distanceLabel,
  knownLanguagesOf,
  LANGUAGE_FILTER_MIN,
  unverifiableLanguages,
  RankableCentre,
  Place,
  Area,
  FsaCentroids,
} from './rankCentres';
import {
  EMPTY_CRITERIA,
  SearchCriteria,
  ageGroupFromMonths,
  sanitizeCriteria,
  parseSearchFallback,
} from './searchCriteria';

const origin: Place = { label: 'Danforth & Pape', lat: 43.6797, lng: -79.3449, kind: 'area' };
const criteria = (c: Partial<SearchCriteria>): SearchCriteria => ({ ...EMPTY_CRITERIA, ...c });

/** A centre `km` kilometres due north of the origin (1 degree of latitude = 111.195 km). */
const centre = (id: string, km: number | null, extra: Partial<RankableCentre> = {}): RankableCentre => ({
  id,
  name: `Centre ${id}`,
  kind: 'open-data',
  lat: km === null ? null : origin.lat + km / 111.195,
  lng: km === null ? null : origin.lng,
  ageGroups: ['Infant', 'Toddler', 'Preschool'],
  programOptions: ['Full day'],
  languages: ['English'],
  cwelcc: true,
  ...extra,
});

const areas: Area[] = [
  { name: 'Danforth & Pape', aliases: ['pape station', 'pape'], lat: 43.6797, lng: -79.3449 },
  { name: 'Yonge & Eglinton', aliases: ['midtown'], lat: 43.7066, lng: -79.3984 },
  { name: 'Greektown', aliases: ['the danforth', 'danforth'], lat: 43.6779, lng: -79.35 },
];
const fsa: FsaCentroids = { M4K: { lat: 43.678, lng: -79.35, centres: 18 } };

// ---------- searchCriteria ----------

test('age group is derived from months: <18 Infant, <30 Toddler, else Preschool', () => {
  assert.equal(ageGroupFromMonths(0), 'Infant');
  assert.equal(ageGroupFromMonths(17), 'Infant');
  assert.equal(ageGroupFromMonths(18), 'Toddler');
  assert.equal(ageGroupFromMonths(29), 'Toddler');
  assert.equal(ageGroupFromMonths(30), 'Preschool');
});

test('sanitizeCriteria: months override the model age group; junk becomes null/[]', () => {
  const c = sanitizeCriteria({ childAgeMonths: 24, ageGroup: 'Infant', careType: 'Weekends', languages: ['french', '', 3], maxDistanceKm: -2, areaText: 'null' });
  assert.equal(c.ageGroup, 'Toddler');
  assert.equal(c.careType, null);
  assert.deepEqual(c.languages, ['French']);
  assert.equal(c.maxDistanceKm, null);
  assert.equal(c.areaText, null);
  assert.deepEqual(sanitizeCriteria('nonsense'), EMPTY_CRITERIA);
});

test('keyword fallback parses the placeholder sentence', () => {
  const c = parseSearchFallback('Full-time care for my 2-year-old near Danforth and Pape, from March');
  assert.equal(c.childAgeMonths, 24);
  assert.equal(c.ageGroup, 'Toddler');
  assert.equal(c.careType, 'Full day');
  assert.equal(c.areaText, 'danforth and pape');
  assert.equal(c.startDate, 'March');
});

test('keyword fallback: distance, language, postal code, must-haves; nothing invented', () => {
  const c = parseSearchFallback('Infant spot within 3 km of M4K, French speaking, near the subway, CWELCC');
  assert.equal(c.ageGroup, 'Infant');
  assert.equal(c.maxDistanceKm, 3);
  assert.equal(c.areaText, 'M4K');
  assert.deepEqual(c.languages, ['French']);
  assert.ok(c.mustHaves.includes('near the subway'));
  assert.ok(c.mustHaves.includes('cwelcc'));
  assert.equal(c.careType, null);
  assert.equal(c.startDate, null);
  assert.deepEqual(parseSearchFallback('child care please'), EMPTY_CRITERIA);
});

// ---------- resolveArea ----------

test('resolveArea: exact name, alias, contained alias, postal code, unknown', () => {
  assert.equal(resolveArea('Danforth & Pape', areas, fsa)?.label, 'Danforth & Pape');
  assert.equal(resolveArea('danforth and pape', areas, fsa)?.label, 'Danforth & Pape');
  assert.equal(resolveArea('midtown', areas, fsa)?.label, 'Yonge & Eglinton');
  assert.equal(resolveArea('near Pape station please', areas, fsa)?.label, 'Danforth & Pape'); // longest alias wins
  assert.equal(resolveArea('M4K 1R3', areas, fsa)?.kind, 'postal-code');
  assert.equal(resolveArea('m4k', areas, fsa)?.label, 'M4K postal area');
  assert.equal(resolveArea('M9Z', areas, fsa), null);
  assert.equal(resolveArea('Narnia', areas, fsa), null);
  assert.equal(resolveArea(null, areas, fsa), null);
});

test('haversine: 1 degree of latitude is about 111 km', () => {
  assert.ok(Math.abs(haversineKm(43, -79, 44, -79) - 111.19) < 0.1);
});

// ---------- rankCentres ----------

test('distance points fall linearly from 50 at 0 km to 0 at 10 km by default', () => {
  const r = rankCentres(criteria({ areaText: 'x' }), [centre('a', 0), centre('b', 5), centre('c', 12)], origin);
  const byId = Object.fromEntries(r.map((x) => [x.id, x]));
  assert.equal(byId.a.score, 50);
  assert.ok(Math.abs(byId.b.score - 25) < 0.2);
  assert.equal(byId.c.score, 0); // beyond the scale: kept (no maximum given), 0 points
  assert.deepEqual(r.map((x) => x.id), ['a', 'b', 'c']);
});

test('maxDistanceKm is a hard filter and sets the distance scale', () => {
  const r = rankCentres(criteria({ maxDistanceKm: 2 }), [centre('a', 1), centre('b', 3), centre('nowhere', null)], origin);
  assert.deepEqual(r.map((x) => x.id), ['a', 'nowhere']); // unknown location is kept, not filtered
  assert.ok(Math.abs(r[0].score - 25) < 0.2); // 1 km of 2 km -> half of 50
  assert.equal(r[1].distanceKm, null);
  assert.ok(r[1].unknownFacts.includes('Location not available'));
});

test('age group: non-matching centres are removed, unknown ages kept with 0 age points', () => {
  const r = rankCentres(
    criteria({ ageGroup: 'Infant' }),
    [
      centre('serves', 1),
      centre('no-infants', 1, { ageGroups: ['Toddler'] }),
      centre('unknown', 1, { ageGroups: null }),
      centre('school-age-only', 1, { ageGroups: [] }),
    ],
    null
  );
  assert.deepEqual(r.map((x) => x.id), ['serves', 'unknown']);
  assert.equal(r[0].score, 30); // only program criterion given -> full 30
  assert.equal(r[1].score, 0);
  assert.ok(r[1].unknownFacts.includes('Ages not reported'));
});

test('program fit splits 30 points between age group and care type', () => {
  const r = rankCentres(
    criteria({ ageGroup: 'Toddler', careType: 'Part day' }),
    [centre('half', null, { programOptions: ['Half day'] }), centre('full', null, { programOptions: ['Full day'] })],
    null
  );
  assert.equal(r[0].id, 'half');
  assert.equal(r[0].score, 30);
  assert.equal(r[1].score, 15);
  assert.ok(r[0].matchedFacts.includes('Offers half day care'));
});

test('partner centres get no bonus: identical data -> identical score', () => {
  const r = rankCentres(
    criteria({ ageGroup: 'Toddler', careType: 'Full day', languages: ['French'] }),
    [
      centre('partner', 2, { kind: 'partner', languages: ['English', 'French'] }),
      centre('open', 2, { languages: ['English', 'French'] }),
    ],
    origin
  );
  assert.equal(r[0].score, r[1].score);
});

test('ties are broken by distance, then name', () => {
  // Same age/program points; the nearer centre also earns more distance points and comes first.
  const r = rankCentres(criteria({ ageGroup: 'Toddler' }), [centre('far', 4), centre('near', 1)], origin);
  // Without a location every centre scores the same, so names decide.
  const ties = rankCentres(criteria({ ageGroup: 'Toddler' }), [centre('b', 4), centre('a', 4)], null);
  assert.deepEqual(ties.map((x) => x.id), ['a', 'b']);
  assert.deepEqual(r.slice(0, 2).map((x) => x.id), ['near', 'far']);
});

test('extras: languages and checkable must-haves share 20 points; unknown data reported', () => {
  const r = rankCentres(
    criteria({ languages: ['French'], mustHaves: ['CWELCC', 'near subway', 'outdoor space'] }),
    [
      centre('both', null, { languages: ['French'], cwelcc: true }),
      centre('one', null, { languages: ['English'], cwelcc: true }),
      centre('unknown', null, { languages: [], cwelcc: null }),
    ],
    null
  );
  assert.equal(r[0].id, 'both');
  assert.equal(r[0].score, 20);
  assert.equal(r.find((x) => x.id === 'one')!.score, 10);
  const unk = r.find((x) => x.id === 'unknown')!;
  assert.equal(unk.score, 0);
  assert.deepEqual(unk.unknownFacts, ['Language French not reported', 'CWELCC participant not reported']);
});

test('uncheckable criteria are listed and never scored', () => {
  const c = criteria({ mustHaves: ['near subway', 'CWELCC'], niceToHaves: ['outdoor space'], startDate: 'March' });
  assert.deepEqual(uncheckableCriteria(c), ["start March (availability isn't known)", 'near subway', 'outdoor space']);
  assert.equal(checkableFact('near subway'), null);
  assert.equal(checkableFact('French')?.label, 'Language: French');
  assert.equal(checkableFact('$10/day')?.label, 'CWELCC participant');
});

test('a language no centre lists is unverifiable: grey chip, no points, no "not reported" noise', () => {
  const pool = [centre('fr', 1, { languages: ['English', 'French'] }), centre('en', 1, { languages: ['English'] })];
  const c = criteria({ languages: ['Tamil', 'French'], mustHaves: ['Tamil speaking'] });
  const known = knownLanguagesOf(pool);
  assert.deepEqual(unverifiableLanguages(c, known), ['Tamil']);
  assert.deepEqual(uncheckableCriteria(c, known), ['Tamil-speaking staff', 'Tamil speaking']);
  assert.equal(checkableFact('Tamil speaking', known), null);
  const r = rankCentres(c, pool, null, known);
  assert.equal(r[0].id, 'fr');
  assert.equal(r[0].score, 20); // French is the only scored extra
  assert.equal(r[1].score, 0);
  assert.ok(r.every((x) => !x.unknownFacts.some((f) => /tamil/i.test(f))));
  assert.ok(r.every((x) => !x.matchedFacts.some((f) => /tamil/i.test(f))));
});

test('approximate locations: no precise distance under 1 km, ≈ above; ranking still uses the distance', () => {
  const approx = { neighbourhood: 'Danforth & Pape' };
  assert.equal(distanceLabel(0.04, approx), 'In Danforth & Pape · approximate location');
  assert.equal(distanceLabel(2.34, approx), '≈ 2.3 km');
  assert.equal(distanceLabel(0.04), '0.0 km');
  const r = rankCentres(criteria({}), [centre('near-approx', 0.04, { approximateLocation: approx }), centre('far-approx', 2.3, { approximateLocation: approx }), centre('exact', 0.5)], origin);
  assert.deepEqual(r.map((x) => x.id), ['near-approx', 'exact', 'far-approx']); // ordered by computed distance
  assert.deepEqual(r[0].matchedFacts, ['In Danforth & Pape · approximate location']);
  assert.deepEqual(r[2].matchedFacts, ['≈ 2.3 km from Danforth & Pape']);
  assert.deepEqual(r[1].matchedFacts, ['0.5 km from Danforth & Pape']);
});

test('factsSentence joins facts without adding anything', () => {
  assert.equal(
    factsSentence(['1.2 km from Danforth & Pape', 'Serves toddlers'], ['Ages not reported']),
    '1.2 km from Danforth & Pape, Serves toddlers. Ages not reported.'
  );
});

test('language: a filter when at least 3 centres offer it', () => {
  const pool = [
    centre('fr1', 1, { languages: ['French'] }),
    centre('fr2', 2, { languages: ['English', 'French'] }),
    centre('fr3', 3, { languages: ['French'] }),
    centre('en', 1, { languages: ['English'] }),
    centre('unreported', 1, { languages: [] }),
  ];
  const r = rankCentres(criteria({ languages: ['French'] }), pool, origin);
  assert.deepEqual(r.map((x) => x.id).sort(), ['fr1', 'fr2', 'fr3']);
  assert.ok(r.every((x) => !x.languageStatus), 'no per-card label when filtering');
  assert.equal(LANGUAGE_FILTER_MIN, 3);
});

test('language: fewer than 3 matches -> ranked, each card says offered / not offered / not reported', () => {
  const pool = [
    centre('fr1', 2, { languages: ['French'] }),
    centre('fr2', 3, { languages: ['English', 'French'] }),
    centre('en', 1, { languages: ['English'] }),
    centre('unreported', 1, { languages: [] }),
  ];
  const r = rankCentres(criteria({ languages: ['French'] }), pool, origin);
  assert.equal(r.length, 4);
  const status = Object.fromEntries(r.map((x) => [x.id, x.languageStatus]));
  assert.deepEqual(status.fr1, [{ language: 'French', offered: true }]);
  assert.deepEqual(status.en, [{ language: 'French', offered: false }]);
  assert.deepEqual(status.unreported, [{ language: 'French', offered: null }]);
  // Offering centres still rank above a nearer one that doesn't offer it
  assert.ok(r.findIndex((x) => x.id === 'fr1') < r.findIndex((x) => x.id === 'en'));
});

test('language: the 3-centre threshold counts only centres left after the other filters', () => {
  const pool = [
    centre('fr-near', 1, { languages: ['French'] }),
    centre('fr-near2', 2, { languages: ['French'] }),
    centre('fr-far', 30, { languages: ['French'] }),
    centre('en', 1, { languages: ['English'] }),
  ];
  const r = rankCentres(criteria({ languages: ['French'], maxDistanceKm: 5 }), pool, origin);
  assert.deepEqual(r.map((x) => x.id).sort(), ['en', 'fr-near', 'fr-near2']);
  assert.ok(r.every((x) => x.languageStatus?.length === 1));
});

// ---------- Districts, places anywhere in the text, default radius (real area data) ----------

import torontoAreas from '../data/torontoAreas.json';
import fsaCentroids from '../data/fsaCentroids.json';
import { applyDefaultRadius, defaultRadiusKm, knownPlaceIn, DEFAULT_RADIUS_KM, RankedCentre } from './rankCentres';

const REAL_AREAS = (torontoAreas as { areas: Area[] }).areas;
const SEARCH_AREAS: Area[] = [...REAL_AREAS, ...(torontoAreas as { districts: Area[] }).districts];
const REAL_FSA = fsaCentroids as FsaCentroids;

test('districts resolve with a 10 km default radius; neighbourhoods inside them still win', () => {
  for (const name of ['Scarborough', 'North York', 'Etobicoke', 'York']) {
    const p = resolveArea(name, SEARCH_AREAS, REAL_FSA);
    assert.equal(p?.label, name);
    assert.equal(p?.kind, 'district');
    assert.equal(defaultRadiusKm(p!), 10);
  }
  assert.equal(resolveArea('near Scarborough', SEARCH_AREAS, REAL_FSA)?.label, 'Scarborough');
  assert.equal(resolveArea('Scarborough Town Centre', SEARCH_AREAS, REAL_FSA)?.label, 'Scarborough Town Centre');
  assert.equal(resolveArea('East York', SEARCH_AREAS, REAL_FSA)?.label, 'East York');
  assert.equal(resolveArea('York University', SEARCH_AREAS, REAL_FSA)?.label, 'York University');
  assert.equal(resolveArea('north york centre', SEARCH_AREAS, REAL_FSA)?.label, 'Yonge & Sheppard');
  assert.equal(resolveArea('Yorkville', SEARCH_AREAS, REAL_FSA)?.label, 'Yorkville');
  const annex = resolveArea('the Annex', SEARCH_AREAS, REAL_FSA)!;
  assert.equal(annex.kind, 'area');
  assert.equal(defaultRadiusKm(annex), DEFAULT_RADIUS_KM);
  assert.equal(defaultRadiusKm(resolveArea('M5R', SEARCH_AREAS, REAL_FSA)!), DEFAULT_RADIUS_KM);
});

test('districts are search-only: not in the area list the pickers use', () => {
  for (const name of ['Scarborough', 'North York', 'Etobicoke', 'York']) {
    assert.ok(!REAL_AREAS.some((a) => a.name === name), name);
  }
});

test('knownPlaceIn: longest known name anywhere; everyday-word aliases need "near"', () => {
  assert.equal(knownPlaceIn('French toddler care downtown', SEARCH_AREAS), 'downtown');
  assert.equal(knownPlaceIn('infant care Leslieville', SEARCH_AREAS), 'Leslieville');
  assert.equal(knownPlaceIn('full day Scarborough Town Centre please', SEARCH_AREAS), 'Scarborough Town Centre');
  assert.equal(knownPlaceIn('the main thing is a union job and Liberty to choose', SEARCH_AREAS), null);
  assert.equal(knownPlaceIn('child care please', SEARCH_AREAS), null);
});

test('keyword fallback: a known place anywhere in the text, else the words after "near"', () => {
  assert.equal(parseSearchFallback('French toddler care downtown', SEARCH_AREAS).areaText, 'downtown');
  assert.equal(parseSearchFallback('infant care Leslieville', SEARCH_AREAS).areaText, 'Leslieville');
  assert.equal(parseSearchFallback('preschool full-day near Scarborough', SEARCH_AREAS).areaText, 'scarborough');
  assert.equal(parseSearchFallback('toddler care near the Annex', SEARCH_AREAS).areaText, 'the annex');
  assert.equal(parseSearchFallback('care near M5R', SEARCH_AREAS).areaText, 'M5R');
  // "near" words that aren't a known place lose to a known place elsewhere in the sentence
  assert.equal(parseSearchFallback('toddler care near my work, Leslieville', SEARCH_AREAS).areaText, 'Leslieville');
  // Unknown place: kept as written (the Find page asks the parent to pick an area)
  assert.equal(parseSearchFallback('infant care near Narnia', SEARCH_AREAS).areaText, 'narnia');
  // Everyday-word alias after "near" still counts
  assert.equal(resolveArea(parseSearchFallback('care near Leslie', SEARCH_AREAS).areaText, SEARCH_AREAS, REAL_FSA)?.label, 'Leslieville');
  // Without the area list it behaves as before
  assert.equal(parseSearchFallback('French toddler care downtown').areaText, null);
});

const ranked = (...kms: (number | null)[]): RankedCentre[] =>
  kms.map((km, i) => ({ id: `c${i}`, score: 100 - i, distanceKm: km, matchedFacts: [], unknownFacts: [] }));

test('default radius: keeps results inside, in order; unknown locations not shown inside it', () => {
  const v = applyDefaultRadius(ranked(0.5, 7, 3, null, 4.9), 5);
  assert.deepEqual(v.results.map((r) => r.id), ['c0', 'c2', 'c4']);
  assert.equal(v.radiusKm, 5);
  assert.equal(v.widenedFromKm, null);
});

test('default radius widens (5 -> 10 -> 20 -> 40 km) when nothing is inside, then shows all', () => {
  const w = applyDefaultRadius(ranked(12, 30), 5);
  assert.equal(w.radiusKm, 20);
  assert.equal(w.widenedFromKm, 5);
  assert.deepEqual(w.results.map((r) => r.id), ['c0']);
  const all = applyDefaultRadius(ranked(55, 60, null), 10);
  assert.equal(all.radiusKm, null);
  assert.equal(all.results.length, 3);
  assert.equal(applyDefaultRadius([], 5).radiusKm, null);
});
