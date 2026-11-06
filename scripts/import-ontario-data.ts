/**
 * Builds src/data/ontarioCentres.json from two public datasets:
 *   1. ontario_childcare.csv  - Ontario "Licensed child care facilities in Ontario"
 *   2. toronto_childcare.csv  - City of Toronto "Licensed Child Care Centres"
 *
 * Steps: keep active Toronto child care centres from (1); join (2) by postal code + normalised
 * name to add coordinates, age groups served, capacity and the CWELCC flag; geocode only the
 * centres that still have no coordinates with OpenStreetMap Nominatim (cached, 1 req/s).
 * Nothing is invented: a field that neither dataset has stays null.
 *
 * Usage:  npm run import:ontario               (full run, geocodes unmatched centres)
 *         npm run import:ontario -- --no-geocode   (join only, no network)
 */
import fs from 'node:fs';
import path from 'node:path';
import type { AgeGroup } from '../src/data/mockData';
import type { OntarioCentre, OntarioCentresFile, DataSourceId, JoinMethod } from '../src/data/ontarioTypes';

const ROOT = process.cwd();
const ONTARIO_CSV = path.join(ROOT, 'ontario_childcare.csv');
const TORONTO_CSV = path.join(ROOT, 'toronto_childcare.csv');
const OUT_JSON = path.join(ROOT, 'src', 'data', 'ontarioCentres.json');
const OUT_META_JSON = path.join(ROOT, 'src', 'data', 'ontarioCentres.meta.json');
const GEOCODE_CACHE = path.join(ROOT, 'scripts', 'geocode-cache.json');
const JOIN_AUDIT_CSV = path.join(ROOT, 'scripts', 'join-audit.csv');

// Date the raw CSV files were downloaded by the team (not in the files themselves).
const DOWNLOADED_ON = '2026-11-05';
const USER_AGENT = 'CareQ-hackathon-prototype/1.0 (WAI Canada Hackathon 2026 prototype)';
const NOMINATIM_DELAY_MS = 1100; // Nominatim policy: max 1 request per second.
// Rough City of Toronto bounding box; geocoder results outside it are rejected, never kept.
const TORONTO_BBOX = { south: 43.57, north: 43.86, west: -79.65, east: -79.1 };

const SKIP_GEOCODE = process.argv.includes('--no-geocode');

// ---------- CSV ----------

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF, UTF-8 BOM. */
function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows;
  return data
    .filter((r) => r.length > 1)
    .map((r) => {
      if (r.length !== header.length) throw new Error(`Bad CSV row: ${r.join(',')}`);
      return Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()]));
    });
}

// ---------- Normalisation ----------

const normPostal = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, '');

const NAME_STOPWORDS = new Set([
  'inc', 'incorporated', 'ltd', 'limited', 'corp', 'corporation', 'the', 'centre', 'center',
  'centres', 'centers', 'co', 'of',
]);

/** lowercase, strip punctuation and filler words, then drop spaces ("child care" == "childcare"). */
function normName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NAME_STOPWORDS.has(w))
    .join('');
}

// Words too common in centre names to prove two records are the same centre.
const GENERIC_WORDS = new Set([
  'child', 'children', 'childrens', 'care', 'childcare', 'daycare', 'day', 'nursery', 'school',
  'schools', 'program', 'programme', 'early', 'learning', 'elc', 'montessori', 'ymca', 'age',
  'academy', 'kids', 'preschool', 'and', 'toronto', 'ontario', 'community', 'parent', 'parents',
  'group', 'junior', 'jr', 'public', 'catholic', 'campus', 'site', 'house', 'educational',
]);

/** Distinctive words (3+ letters, not generic) used to confirm a same-postal-code pair. */
function distinctiveWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !NAME_STOPWORDS.has(w) && !GENERIC_WORDS.has(w))
  );
}

const AREA_FIXES: Record<string, string> = {
  toronto: 'Toronto',
  'toronto ontario': 'Toronto',
  scarborough: 'Scarborough',
  scarbrough: 'Scarborough',
  scaborough: 'Scarborough',
  'north york': 'North York',
  northyork: 'North York',
  etobicoke: 'Etobicoke',
  etobcoke: 'Etobicoke',
  'east york': 'East York',
  york: 'York',
};
function normArea(city: string): string {
  const key = city.toLowerCase().replace(/[^a-z ]+/g, '').replace(/\s+/g, ' ').trim();
  return AREA_FIXES[key] ?? (city.trim() || 'Toronto');
}

/** Split a comma list, keeping commas inside parentheses, e.g. "Full Day(6 hours or more...)". */
const splitList = (s: string) =>
  s.split(/,\s*(?![^(]*\))/).map((x) => x.trim()).filter((x) => x && x !== 'Not Available');

/** "Full Day(6 hours or more in a day)" -> "Full day" */
const tidyProgram = (p: string) => {
  const base = p.replace(/\(.*\)/, '').trim();
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
};

/** Language field mixes "Other" with the real names and has duplicates in caps. */
function tidyLanguages(s: string): string[] {
  const out: string[] = [];
  for (const raw of s.split(',')) {
    const w = raw.trim();
    if (!w || w.toLowerCase() === 'other') continue;
    const nice = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    if (!out.includes(nice)) out.push(nice);
  }
  return out;
}

/** "Sep 30, 2026" -> "2026-09-30";  "05NOV26" -> "2026-11-05" */
function isoDate(s: string): string | null {
  const m = s.match(/^(\d{2})([A-Z]{3})(\d{2})$/i);
  const d = m ? new Date(`${m[2]} ${m[1]}, 20${m[3]} UTC`) : new Date(`${s} UTC`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const inToronto = (lat: number, lng: number) =>
  lat >= TORONTO_BBOX.south && lat <= TORONTO_BBOX.north && lng >= TORONTO_BBOX.west && lng <= TORONTO_BBOX.east;

// ---------- Geocoding (Nominatim) ----------

type GeocodeHit = { lat: number; lng: number } | null; // null = looked up, not found
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadCache(): Record<string, GeocodeHit> {
  try {
    return JSON.parse(fs.readFileSync(GEOCODE_CACHE, 'utf8'));
  } catch {
    return {};
  }
}

async function geocode(params: Record<string, string>): Promise<GeocodeHit> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  for (const [k, v] of Object.entries({ ...params, country: 'Canada', format: 'jsonv2', limit: '1' })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`); // network/HTTP errors are NOT cached
  const hits = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!hits.length) return null;
  const lat = Number(hits[0].lat);
  const lng = Number(hits[0].lon);
  return inToronto(lat, lng) ? { lat, lng } : null; // outside Toronto = wrong match, treat as not found
}

// ---------- Main ----------

async function main() {
  const ontarioAll = parseCsv(fs.readFileSync(ONTARIO_CSV, 'utf8'));
  const torontoAll = parseCsv(fs.readFileSync(TORONTO_CSV, 'utf8'));

  const ontario = ontarioAll.filter(
    (r) =>
      r['CMSM / DSSAB Name'] === 'City of Toronto' &&
      r['Program Type Desc'] === 'Child Care Centre' &&
      r['Licence Status'] === 'Active'
  );

  const ontarioSnapshot = isoDate(ontarioAll[0]['Report Snapshot Date']);
  const torontoRunDate = isoDate(torontoAll[0]['run_date']);

  // Licence-number join: only possible if a Toronto field holds the provincial licence number.
  const licenceSet = new Set(ontario.map((r) => r['Licence Number'].replace(/^0+/, '')));
  const torontoLicenceField = ['LOC_ID'].find((f) =>
    torontoAll.filter((t) => licenceSet.has(t[f]?.replace(/^0+/, ''))).length > torontoAll.length * 0.5
  );

  // Index Toronto rows by postal code + normalised name.
  const torontoByKey = new Map<string, Record<string, string>[]>();
  for (const t of torontoAll) {
    const key = `${normPostal(t.PCODE)}|${normName(t.LOC_NAME)}`;
    torontoByKey.set(key, [...(torontoByKey.get(key) ?? []), t]);
  }
  const torontoByLicence = new Map(
    torontoLicenceField ? torontoAll.map((t) => [t[torontoLicenceField].replace(/^0+/, ''), t]) : []
  );

  const usedToronto = new Set<Record<string, string>>();
  let matchedByLicence = 0;
  let matchedByPostalName = 0;
  let matchedBySimilarName = 0;
  let ambiguous = 0;
  const similarExamples: string[] = [];
  const auditRows: string[][] = [];
  const joinMethodFor = new Map<Record<string, string>, JoinMethod>();

  // Pass 1: licence number (if available), else exact postal code + normalised name.
  const torontoFor = new Map<Record<string, string>, Record<string, string>>();
  for (const r of ontario) {
    let t = torontoByLicence.get(r['Licence Number'].replace(/^0+/, ''));
    if (t) {
      matchedByLicence++;
      joinMethodFor.set(r, 'licence');
    }
    else {
      const candidates = (torontoByKey.get(`${normPostal(r['Postal Code'])}|${normName(r['Child Care Site Name'])}`) ?? [])
        .filter((c) => !usedToronto.has(c));
      if (candidates.length === 1) {
        t = candidates[0];
        matchedByPostalName++;
        joinMethodFor.set(r, 'name+postal');
      } else if (candidates.length > 1) ambiguous++; // never pick one at random
    }
    if (t) {
      usedToronto.add(t);
      torontoFor.set(r, t);
    }
  }

  // Pass 2 (conservative): same postal code, exactly one unmatched Ontario centre and exactly one
  // unused Toronto row there, and the two names share at least one distinctive word.
  const groupByPostal = <T,>(items: T[], postal: (x: T) => string) => {
    const m = new Map<string, T[]>();
    for (const x of items) m.set(postal(x), [...(m.get(postal(x)) ?? []), x]);
    return m;
  };
  const leftOntario = groupByPostal(ontario.filter((r) => !torontoFor.has(r)), (r) => normPostal(r['Postal Code']));
  const leftToronto = groupByPostal(torontoAll.filter((t) => !usedToronto.has(t)), (t) => normPostal(t.PCODE));
  for (const [postal, os] of leftOntario) {
    const ts = leftToronto.get(postal) ?? [];
    if (os.length !== 1 || ts.length !== 1) continue;
    const a = distinctiveWords(os[0]['Child Care Site Name']);
    const b = distinctiveWords(ts[0].LOC_NAME);
    if (![...a].some((w) => b.has(w))) continue;
    torontoFor.set(os[0], ts[0]);
    usedToronto.add(ts[0]);
    matchedBySimilarName++;
    joinMethodFor.set(os[0], 'postal+distinctive-word');
    auditRows.push([os[0]['Child Care Site Name'], ts[0].LOC_NAME, os[0]['Postal Code']]);
    similarExamples.push(`${os[0]['Child Care Site Name']}  ==  ${ts[0].LOC_NAME}  (${os[0]['Postal Code']})`);
  }

  const centres: OntarioCentre[] = ontario.map((r) => {
    const licence = r['Licence Number'];
    const t = torontoFor.get(r);

    const street = [r['Street Number'], r['Street Name'], r['Street Type']].filter(Boolean).join(' ');
    const area = normArea(r.City);
    const dataSources: DataSourceId[] = ['ontario'];

    let lat: number | null = null;
    let lng: number | null = null;
    let ageGroups: AgeGroup[] | null = null;
    let capacity: number | null = null;
    let cwelcc: boolean | null = null;

    if (t) {
      dataSources.push('toronto');
      const coords = JSON.parse(t.geometry)?.coordinates?.[0];
      if (Array.isArray(coords) && inToronto(Number(coords[1]), Number(coords[0]))) {
        lng = Number(coords[0]);
        lat = Number(coords[1]);
      }
      const n = (k: string) => Number(t![k]) || 0;
      ageGroups = [];
      if (n('IGSPACE') > 0) ageGroups.push('Infant');
      if (n('TGSPACE') > 0) ageGroups.push('Toddler');
      if (n('PGSPACE') > 0) ageGroups.push('Preschool');
      capacity = t.TOTSPACE !== '' ? Number(t.TOTSPACE) : null;
      cwelcc = t.cwelcc_flag === 'Y' ? true : t.cwelcc_flag === 'N' ? false : null;
    }

    return {
      id: `on-${licence}`,
      licenceNumber: licence,
      name: r['Child Care Site Name'],
      licensee: r['Licensee Name'],
      address: `${street}, ${area}, ON ${r['Postal Code']}`.replace(/\s+/g, ' ').trim(),
      street,
      postalCode: r['Postal Code'],
      area,
      licenceStatus: r['Licence Status'],
      licenceIssued: isoDate(r['Original Issue Date']),
      programOptions: splitList(r['Program Option']).map(tidyProgram),
      languages: tidyLanguages(r['Language of Service Desc']),
      lat,
      lng,
      ageGroups,
      capacity,
      cwelcc,
      dataSources,
      joinMethod: joinMethodFor.get(r) ?? 'none', // becomes 'geocoded' below if Nominatim finds it
    };
  });

  // Geocode only centres that still have no coordinates.
  const cache = loadCache();
  const needGeocode = centres.filter((c) => c.lat === null);
  let fromCache = 0;
  let requested = 0;
  let geocodeFailed = 0;
  let geocodeErrors = 0;

  if (!SKIP_GEOCODE) {
    for (const c of needGeocode) {
      const params = { street: c.street, city: c.area, state: 'Ontario', postalcode: c.postalCode };
      const key = JSON.stringify(params);
      let hit: GeocodeHit | undefined = cache[key];
      if (hit !== undefined) fromCache++;
      else {
        try {
          hit = await geocode(params);
          cache[key] = hit;
          requested++;
          fs.writeFileSync(GEOCODE_CACHE, JSON.stringify(cache, null, 1)); // save as we go
        } catch (err) {
          geocodeErrors++;
          console.warn(`  geocode error (not cached, will retry next run): ${c.name}: ${(err as Error).message}`);
        }
        process.stdout.write(`\r  geocoding ${requested + geocodeErrors}/${needGeocode.length - fromCache}`);
        await sleep(NOMINATIM_DELAY_MS);
      }
      if (hit) {
        c.lat = hit.lat;
        c.lng = hit.lng;
        c.dataSources.push('osm');
        c.joinMethod = 'geocoded';
      } else geocodeFailed++;
    }
    if (requested) process.stdout.write('\n');
  }

  centres.sort((a, b) => a.name.localeCompare(b.name));

  const out: OntarioCentresFile = {
    metadata: {
      generatedBy: 'scripts/import-ontario-data.ts',
      sources: {
        ontario: {
          name: 'Licensed child care facilities in Ontario',
          publisher: 'Ontario Ministry of Education',
          url: 'https://data.ontario.ca/dataset/licensed-child-care-facilities-in-ontario',
          licence: 'Open Government Licence – Ontario',
          dataDate: ontarioSnapshot,
          downloadedOn: DOWNLOADED_ON,
        },
        toronto: {
          name: 'Licensed Child Care Centres',
          publisher: "City of Toronto, Children's Services",
          url: 'https://open.toronto.ca/dataset/licensed-child-care-centres/',
          licence: 'Open Government Licence – Toronto',
          dataDate: torontoRunDate,
          downloadedOn: DOWNLOADED_ON,
        },
        osm: {
          name: 'Nominatim geocoding',
          publisher: 'OpenStreetMap contributors',
          url: 'https://www.openstreetmap.org/copyright',
          licence: 'ODbL',
          dataDate: null,
          downloadedOn: DOWNLOADED_ON,
        },
      },
      filter: 'CMSM / DSSAB Name = City of Toronto, Program Type = Child Care Centre, Licence Status = Active',
      centreCount: centres.length,
      joinStats: {
        licence: centres.filter((c) => c.joinMethod === 'licence').length,
        namePostal: centres.filter((c) => c.joinMethod === 'name+postal').length,
        postalDistinctiveWord: centres.filter((c) => c.joinMethod === 'postal+distinctive-word').length,
        geocoded: centres.filter((c) => c.joinMethod === 'geocoded').length,
        none: centres.filter((c) => c.joinMethod === 'none').length,
        withoutMapLocation: centres.filter((c) => c.lat === null).length,
        schoolAgeOnly: centres.filter((c) => c.ageGroups !== null && c.ageGroups.length === 0).length,
      },
    },
    centres,
  };

  // Audit file: every 'postal+distinctive-word' pair, for spot-checking.
  const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  fs.writeFileSync(
    JOIN_AUDIT_CSV,
    [['ontario_name', 'toronto_name', 'postal_code'], ...auditRows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n') + '\n'
  );
  fs.writeFileSync(OUT_JSON, JSON.stringify(out));
  // Small metadata-only copy so pages like Trust & transparency don't load all centres.
  fs.writeFileSync(OUT_META_JSON, JSON.stringify(out.metadata, null, 2));

  // ---------- Report ----------
  const matched = matchedByLicence + matchedByPostalName + matchedBySimilarName;
  const withCoords = centres.filter((c) => c.lat !== null).length;
  console.log('\n=== Import report ===');
  console.log(`Ontario rows: ${ontarioAll.length}; active Toronto child care centres kept: ${ontario.length}`);
  console.log(`Toronto rows: ${torontoAll.length}`);
  console.log(`Licence-number join field in Toronto data: ${torontoLicenceField ?? 'none found'}`);
  console.log(`Matched: ${matched} (${((matched / ontario.length) * 100).toFixed(1)}%)  [by licence ${matchedByLicence}, by postal+name ${matchedByPostalName}, by postal+similar name ${matchedBySimilarName}, ambiguous skipped ${ambiguous}]`);
  console.log('\nSimilar-name matches (sample for review):');
  for (const s of similarExamples.slice(0, 12)) console.log(`  ${s}`);
  console.log(`Unmatched Ontario centres: ${ontario.length - matched}; Toronto rows not used: ${torontoAll.length - usedToronto.size}`);
  console.log(SKIP_GEOCODE
    ? `Geocoding skipped (--no-geocode); ${needGeocode.length} centres would be looked up`
    : `Geocoding: ${needGeocode.length} needed, ${fromCache} from cache, ${requested} requested, ${needGeocode.length - geocodeFailed} found, ${geocodeFailed} not found, ${geocodeErrors} network errors`);
  console.log(`With coordinates: ${withCoords}/${centres.length}; with age groups: ${centres.filter((c) => c.ageGroups).length}`);
  const unmatched = centres.filter((c) => !c.dataSources.includes('toronto'));
  console.log('\nUnmatched examples (Ontario name | postal) -> Toronto rows at same postal code:');
  for (const c of unmatched.slice(0, 10)) {
    const samePostal = torontoAll.filter((t) => normPostal(t.PCODE) === normPostal(c.postalCode)).map((t) => t.LOC_NAME);
    console.log(`  ${c.name} | ${c.postalCode}  ->  ${samePostal.length ? samePostal.join('; ') : '(none)'}`);
  }
  console.log(`\nWrote ${path.relative(ROOT, OUT_JSON)} (${(fs.statSync(OUT_JSON).size / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
