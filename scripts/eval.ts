/**
 * One evaluation for the results slide, from the hand-made files in eval/:
 *
 *   npm run eval                                  # starts its own server (port 3199, AI_CACHE=off)
 *   npm run eval -- --pace=10                     # seconds between AI requests (default 10)
 *   npm run eval -- --only=ask,tone               # a subset: ask, extract, prepare, tone
 *   npm run eval -- --match=0.75                  # cosine threshold for meaning-matched requirements
 *   npm run eval -- http://localhost:3100         # an already running server (start it with AI_CACHE=off)
 *
 *  1. Ask CareQ on eval/questions.json: correct answers / refusals, source document, page ±1,
 *     quotes re-checked verbatim against the stored passage, latency, counts by model / rule / fallback
 *  2. Requirement extraction (policy reader from documents) vs eval/labels/<operator>.json:
 *     found / missed / invented, with every pairing (Gemini embeddings, one-to-one) printed
 *  3. Prepare with AI safety on every demo centre: "ready" without a matching document, and checklist
 *     items outside the centre's confirmed requirements (both must be 0)
 *  4. Tone check on eval/tone_messages.json: correct flags, false alarms, misses
 *
 * Writes eval/results.md (summary, models, date, worst failures, raw outputs) and eval/raw/*.json.
 * Every number comes from a response in this run; nothing is filled in. Answer caches are off.
 */
import 'dotenv/config';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { GoogleGenAI } from '@google/genai';
import { EMBED_MODEL } from '../server/policyIndexConfig';
import { NO_INFO } from '../server/askAgent';
import { demoCentreEmail } from '../src/lib/world';
import type { Snapshot } from '../src/lib/world';

const ROOT = path.resolve(import.meta.dirname, '..');
const EVAL = path.join(ROOT, 'eval');
const args = process.argv.slice(2);
const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const URL_ARG = args.find((a) => !a.startsWith('--'));
const PORT = 3199;
let BASE = (URL_ARG || `http://localhost:${PORT}`).replace(/\/$/, '');
const PACE_MS = Number(opt('pace') ?? 10) * 1000;
const MATCH = Number(opt('match') ?? 0.75);
const ONLY = new Set((opt('only') ?? 'ask,extract,prepare,tone').split(','));
const DEMO_CENTRES = ['careq-demo', 'on-00576', 'on-0002899', 'on-0004062', 'on-0002575', 'on-03394', 'on-07205', 'on-12256'];

type Json = Record<string, any>;
const readJson = (f: string) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cell = (s: unknown) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
};
const secs = (ms: number) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)} s` : '-');
const answeredBy = (d: Json) => (d.cached ? 'CACHE (should not happen)' : d.aiMode === 'gemini' ? d.modelUsed ?? 'gemini (?)' : d.aiMode === 'rule' ? 'rule (no model)' : d.aiMode === 'fallback' ? 'fallback (no AI)' : String(d.aiMode));
const tally = (xs: string[]) => xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
const log = (s = '') => console.log(s);

// ---------------- HTTP, pacing ----------------

let lastAi = 0;
/** Waits so AI requests are at least PACE_MS apart (Gemini per-minute limits and the app's own). */
async function paced() {
  const wait = lastAi + PACE_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastAi = Date.now();
}

class Session {
  cookie = '';
  async call(method: string, p: string, body?: unknown, ai = false): Promise<{ status: number; data: Json; ms: number }> {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (ai) await paced();
      const started = Date.now();
      const res = await fetch(`${BASE}/api${p}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const set = res.headers.get('set-cookie');
      if (set) this.cookie = set.split(';')[0];
      const data = (await res.json().catch(() => ({}))) as Json;
      if (res.status === 429) {
        const wait = Number(res.headers.get('retry-after') || 15);
        log(`    (app rate limit; waiting ${wait}s)`);
        await sleep(wait * 1000);
        continue;
      }
      return { status: res.status, data, ms: Date.now() - started };
    }
    throw new Error(`${p}: rate limited 4 times`);
  }
  async login(email: string, role: 'parent' | 'centre') {
    const r = await this.call('POST', '/auth/login', { email, password: 'password', role });
    if (r.status !== 200) throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(r.data)}`);
    return this;
  }
}

// ---------------- Server ----------------

async function startServer(): Promise<ChildProcess | null> {
  if (URL_ARG) {
    log(`Using ${BASE} (make sure it runs with AI_CACHE=off; Ask answers are checked for "cached")`);
    return null;
  }
  fs.mkdirSync(path.join(EVAL, 'raw'), { recursive: true });
  const out = fs.openSync(path.join(EVAL, 'raw', 'server.log'), 'w');
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), AI_CACHE: 'off', DISABLE_HMR: 'true' },
    stdio: ['ignore', out, out],
  });
  for (let i = 0; i < 90; i++) {
    await sleep(1000);
    if (child.exitCode != null) throw new Error(`server exited (${child.exitCode}); see eval/raw/server.log`);
    const h = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
    if (h?.status === 'ok' && h?.dataMode === 'mongo') {
      log(`Server on ${BASE} (pid ${child.pid}, AI_CACHE=off, log: eval/raw/server.log)`);
      return child;
    }
  }
  child.kill();
  throw new Error('server did not become healthy in 90 s; see eval/raw/server.log');
}

// ---------------- Stored passages (to re-check quotes and pages ourselves) ----------------

let mongo: MongoClient | null = null;
type Chunk = { chunkId: string; operatorId: string; page: number | null; heading: string; docTitle: string; text: string };
async function chunksById(ids: string[]): Promise<Map<string, Chunk>> {
  if (!ids.length) return new Map();
  if (!mongo) {
    mongo = new MongoClient(process.env.MONGODB_URI!);
    await mongo.connect();
  }
  const docs = await mongo
    .db(process.env.MONGODB_DB)
    .collection('policyChunks')
    .find({ chunkId: { $in: [...new Set(ids)] } }, { projection: { _id: 0, chunkId: 1, operatorId: 1, page: 1, heading: 1, docTitle: 1, text: 1 } })
    .toArray();
  return new Map(docs.map((d) => [d.chunkId as string, d as unknown as Chunk]));
}

/** Our own verbatim check: same characters after unifying whitespace, curly quotes, dashes and case. */
const norm = (s: string) =>
  s.normalize('NFKC').replace(/[‘’ʼ`]/g, "'").replace(/[“”]/g, '"').replace(/[‐‑‒–—―−]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
const isVerbatim = (quote: string, text: string) => {
  const q = norm(quote.replace(/…\s*$/, '')).replace(/^["'.,;:\s]+|["'.,;:\s]+$/g, '');
  return q.length > 0 && norm(text).includes(q);
};

// ---------------- 1. Ask CareQ ----------------

interface AskRow {
  id: string;
  question: string;
  centreId: string | null;
  expect: 'answer' | 'refuse';
  source?: { operatorId: string; pages: number[] };
  status: number;
  answer: string;
  answeredBy: string;
  latencyMs: number;
  answered: boolean;
  refused: boolean;
  sourceOk: boolean | null;
  pageOk: boolean | null;
  correct: boolean;
  quotes: { quote: string; chunkId: string | null; operatorId: string | null; page: number | string | null; verbatim: boolean }[];
  raw: Json;
}

async function evalAsk() {
  const questions: Json[] = readJson(path.join(EVAL, 'questions.json'));
  log(`\n## 1. Ask CareQ (${questions.length} questions)`);
  const anon = new Session();
  let priya: Session | null = null;
  const results: { q: Json; r: { status: number; data: Json; ms: number } }[] = [];
  for (const q of questions) {
    const s = q.as === 'priya' ? (priya ??= await new Session().login('priya@example.ca', 'parent')) : anon;
    log(`  … ${q.id} ${q.question}`);
    const r = await s.call('POST', '/ask-careq', { question: q.question, ...(q.centreId ? { centreId: q.centreId } : {}) }, true);
    results.push({ q, r });
  }
  const chunks = await chunksById(results.flatMap(({ r }) => (r.data.citations ?? []).map((c: Json) => c.chunkId).filter(Boolean)));
  const rows: AskRow[] = results.map(({ q, r }) => {
    const d = r.data;
    const cites: Json[] = d.citations ?? [];
    const docCites = cites.filter((c) => c.kind === 'document');
    const answered = r.status === 200 && d.answer !== NO_INFO && docCites.length > 0;
    const refused = r.status === 200 && d.answer === NO_INFO && cites.length === 0;
    const fromSource = docCites.filter((c) => chunks.get(c.chunkId)?.operatorId === q.source?.operatorId);
    const sourceOk = q.expect === 'answer' ? fromSource.length > 0 : null;
    const pageOk =
      q.expect === 'answer'
        ? fromSource.some((c) => {
            const p = chunks.get(c.chunkId)?.page;
            return p != null && (q.source.pages as number[]).some((x) => Math.abs(x - p) <= 1);
          })
        : null;
    const quotes = docCites.map((c) => {
      const ch = chunks.get(c.chunkId);
      return { quote: c.quote, chunkId: c.chunkId ?? null, operatorId: ch?.operatorId ?? null, page: ch?.page ?? ch?.heading ?? null, verbatim: Boolean(ch && isVerbatim(c.quote, ch.text)) };
    });
    return {
      id: q.id,
      question: q.question,
      centreId: q.centreId ?? null,
      expect: q.expect,
      source: q.source,
      status: r.status,
      answer: d.answer ?? `HTTP ${r.status} ${d.error ?? ''}`,
      answeredBy: r.status === 200 ? answeredBy(d) : `HTTP ${r.status}`,
      latencyMs: d.latencyMs ?? NaN,
      answered,
      refused,
      sourceOk,
      pageOk,
      correct: q.expect === 'answer' ? answered && Boolean(sourceOk) : refused,
      quotes,
      raw: d,
    };
  });

  log('\n| ID | Question | Expected | Got | Source doc | Page ±1 | Quotes verbatim | Answered by | Server time | Pass |');
  log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    const got = r.answered ? 'answer' : r.refused ? 'refusal' : r.status !== 200 ? `HTTP ${r.status}` : r.quotes.length ? 'answer?' : 'other';
    const v = r.quotes.length ? `${r.quotes.filter((x) => x.verbatim).length}/${r.quotes.length}` : '-';
    const yn = (b: boolean | null) => (b == null ? '-' : b ? 'yes' : 'no');
    log(`| ${r.id} | ${cell(r.question)} | ${r.expect} | ${got} | ${yn(r.sourceOk)} | ${yn(r.pageOk)} | ${v} | ${cell(r.answeredBy)} | ${secs(r.latencyMs)} | ${r.correct ? '✅' : '❌'} |`);
  }
  const ans = rows.filter((r) => r.expect === 'answer');
  const ref = rows.filter((r) => r.expect === 'refuse');
  const quotes = rows.flatMap((r) => r.quotes);
  const lat = rows.map((r) => r.latencyMs).filter(Number.isFinite);
  const s = {
    answersCorrect: ans.filter((r) => r.correct).length,
    answersTotal: ans.length,
    answered: ans.filter((r) => r.answered).length,
    sourceOk: ans.filter((r) => r.sourceOk).length,
    pageOk: ans.filter((r) => r.pageOk).length,
    refusalsCorrect: ref.filter((r) => r.correct).length,
    refusalsTotal: ref.length,
    quotesVerbatim: quotes.filter((q) => q.verbatim).length,
    quotesTotal: quotes.length,
    medianMs: median(lat),
    maxMs: lat.length ? Math.max(...lat) : NaN,
    byModel: tally(rows.map((r) => r.answeredBy)),
    cached: rows.filter((r) => r.raw.cached).length,
  };
  log(`\nAnswers correct ${s.answersCorrect}/${s.answersTotal} (answered with a citation ${s.answered}, right document ${s.sourceOk}, page ±1 ${s.pageOk}) · refusals correct ${s.refusalsCorrect}/${s.refusalsTotal} · quotes verbatim ${s.quotesVerbatim}/${s.quotesTotal} · median ${secs(s.medianMs)}, max ${secs(s.maxMs)} · ${JSON.stringify(s.byModel)}`);
  return { rows, summary: s };
}

// ---------------- 2. Requirement extraction ----------------

let genai: GoogleGenAI | null = null;
async function embed(texts: string[]): Promise<number[][]> {
  genai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // One request per text: gemini-embedding-2 merges a list of contents into a single vector.
  // Embedding limits are separate from (and higher than) generation limits: 1 s apart is enough.
  const out: number[][] = [];
  for (const text of texts) {
    const res = await genai.models.embedContent({ model: EMBED_MODEL, contents: [{ parts: [{ text }] }], config: { taskType: 'SEMANTIC_SIMILARITY' } });
    const v = res.embeddings?.[0]?.values ?? [];
    if (!v.length) throw new Error(`no embedding for "${text}"`);
    out.push(v);
    await sleep(1000);
  }
  return out;
}
const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) (dot += a[i] * b[i]), (na += a[i] * a[i]), (nb += b[i] * b[i]);
  return dot / Math.sqrt(na * nb);
};

/** An unpaired extracted item that matches an already-paired label: a repeat, not an invention. */
const isRepeat = (i: { score: number | null }) => i.score != null && i.score >= MATCH;
const inventedOnly = (x: { invented: { score: number | null }[] }) => x.invented.filter((i) => !isRepeat(i));

interface ExtractResult {
  operatorId: string;
  centreId: string;
  status: number;
  answeredBy: string;
  latencyMs: number;
  labels: string[];
  extracted: Json[];
  pairs: { label: string; extracted: string; score: number }[];
  missed: { label: string; nearest: string | null; score: number | null }[];
  invented: { extracted: Json; nearest: string | null; score: number | null; verbatim: boolean | null }[];
  quotesVerbatim: number;
  raw: Json;
}

async function evalExtract() {
  const dir = path.join(EVAL, 'labels');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  log(`\n## 2. Requirement extraction (${files.length} operators; meaning match: ${EMBED_MODEL} cosine ≥ ${MATCH}, one-to-one)`);
  const out: ExtractResult[] = [];
  for (const f of files) {
    const operatorId = f.replace(/\.json$/, '');
    const labels: string[] = readJson(path.join(dir, f)).requirements ?? [];
    const meta = readJson(path.join(ROOT, 'data', 'policies', operatorId, 'meta.json'));
    const centreId: string = meta.demoCentreId;
    log(`  … ${operatorId} (signed in as ${demoCentreEmail(centreId)})`);
    const s = await new Session().login(demoCentreEmail(centreId), 'centre');
    const r = await s.call('POST', `/centres/${centreId}/extract-from-documents`, {}, true);
    const extracted: Json[] = r.data.requirements ?? [];
    const chunks = await chunksById(extracted.map((x) => x.chunkId).filter(Boolean));
    const verbatimOf = (x: Json) => (chunks.get(x.chunkId) ? isVerbatim(x.quote, chunks.get(x.chunkId)!.text) : false);

    let pairs: ExtractResult['pairs'] = [];
    let missed: ExtractResult['missed'] = labels.map((label) => ({ label, nearest: null, score: null }));
    let invented: ExtractResult['invented'] = extracted.map((x) => ({ extracted: x, nearest: null, score: null, verbatim: verbatimOf(x) }));
    if (labels.length && extracted.length) {
      const vecs = await embed([...labels, ...extracted.map((x) => x.requirement)]);
      const L = vecs.slice(0, labels.length);
      const E = vecs.slice(labels.length);
      const sim = L.map((l) => E.map((e) => cosine(l, e)));
      // Greedy one-to-one: highest similarity first, each label and each extracted item used once
      const all = sim.flatMap((row, i) => row.map((score, j) => ({ i, j, score }))).sort((a, b) => b.score - a.score);
      const usedL = new Set<number>(), usedE = new Set<number>();
      for (const { i, j, score } of all) {
        if (score < MATCH || usedL.has(i) || usedE.has(j)) continue;
        usedL.add(i), usedE.add(j);
        pairs.push({ label: labels[i], extracted: extracted[j].requirement, score });
      }
      const argmax = (xs: number[]) => xs.reduce((b, x, k) => (x > xs[b] ? k : b), 0);
      missed = labels.map((label, i) => ({ label, i })).filter(({ i }) => !usedL.has(i)).map(({ label, i }) => ({ label, nearest: extracted[argmax(sim[i])].requirement, score: Math.max(...sim[i]) }));
      invented = extracted
        .map((x, j) => ({ x, j }))
        .filter(({ j }) => !usedE.has(j))
        .map(({ x, j }) => {
          const col = sim.map((row) => row[j]);
          return { extracted: x, nearest: labels[argmax(col)], score: Math.max(...col), verbatim: verbatimOf(x) };
        });
      pairs = labels.flatMap((l) => pairs.filter((p) => p.label === l)); // label order
    }
    out.push({
      operatorId, centreId, status: r.status, answeredBy: r.status === 200 ? answeredBy(r.data) : `HTTP ${r.status}`, latencyMs: r.data.latencyMs ?? NaN,
      labels, extracted, pairs, missed, invented, quotesVerbatim: extracted.filter(verbatimOf).length, raw: r.data,
    });
  }

  log('\n| Operator | Labels | Extracted | Found | Missed | Repeats of a found label | Invented (no label) | Quotes verbatim | Answered by | Server time |');
  log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const x of out) log(`| ${x.operatorId} | ${x.labels.length} | ${x.extracted.length} | ${x.pairs.length} | ${x.missed.length} | ${x.invented.length - inventedOnly(x).length} | ${inventedOnly(x).length} | ${x.quotesVerbatim}/${x.extracted.length} | ${cell(x.answeredBy)} | ${secs(x.latencyMs)} |`);
  log('\nPairings to check by hand (label ⇄ extracted, cosine):');
  for (const x of out) {
    log(`\n  ${x.operatorId}`);
    for (const p of x.pairs) log(`    ✓ ${p.label}  ⇄  ${p.extracted}  (${p.score.toFixed(3)})`);
    for (const m of x.missed) log(`    ✗ missed: ${m.label}${m.nearest ? `  (nearest: ${m.nearest}, ${m.score!.toFixed(3)})` : ''}`);
    for (const i of x.invented) log(`    ${isRepeat(i) ? '= repeat' : '+ no label'}: ${i.extracted.requirement} [${i.extracted.category}, ${i.extracted.page}]${i.nearest ? `  (nearest label: ${i.nearest}, ${i.score!.toFixed(3)})` : ''}`);
  }
  return out;
}

// ---------------- 3. Prepare with AI safety ----------------

interface PrepareRow {
  centreId: string;
  centreName: string;
  scenario: string;
  documents: { fileName: string; attachedTo: string }[];
  status: number;
  answeredBy: string;
  latencyMs: number;
  checklist: Json[];
  readyWithoutMatch: { requirement: string; matchedDocument: string | null; why: string }[];
  outsideList: string[];
  missingFromChecklist: string[];
  skipped?: string;
  raw: Json;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const DECOY = 'family-vacation-photo.jpg';

async function evalPrepare() {
  log(`\n## 3. Prepare with AI safety (${DEMO_CENTRES.length} demo centres × 2 scenarios)`);
  const priya = await new Session().login('priya@example.ca', 'parent');
  const snap = (await priya.call('GET', '/state')).data as Snapshot;
  const rows: PrepareRow[] = [];
  for (const centreId of DEMO_CENTRES) {
    const centre = snap.centres.find((c) => c.id === centreId);
    const confirmed: string[] = centre?.requirements ?? [];
    if (!centre || !confirmed.length) {
      rows.push({ centreId, centreName: centre?.name ?? '?', scenario: '-', documents: [], status: 0, answeredBy: '-', latencyMs: NaN, checklist: [], readyWithoutMatch: [], outsideList: [], missingFromChecklist: [], skipped: centre ? 'no confirmed requirements' : 'centre not in snapshot', raw: {} });
      continue;
    }
    const app = snap.applications.find((a) => a.centreId === centreId) ?? snap.applications[0];
    const named = `${slug(confirmed[0])}.pdf`;
    const scenarios: { name: string; documents: { fileName: string; attachedTo: string }[] }[] = [
      { name: 'no documents', documents: [] },
      // Neither file is attached to a requirement, so the model decides: the first file is named after
      // requirement 1 (may be "ready" for that one only); the decoy matches nothing
      { name: `"${named}" + decoy`, documents: [{ fileName: named, attachedTo: '' }, { fileName: DECOY, attachedTo: '' }] },
    ];
    for (const sc of scenarios) {
      log(`  … ${centre.name} · ${sc.name}`);
      const input = {
        centreName: centre.name,
        parentFirstName: snap.account!.name.split(/\s+/)[0],
        childFirstName: app.childName.split(/\s+/)[0],
        childAgeMonths: app.childAgeMonths,
        careType: app.careType,
        preferredStartDate: app.preferredStartDate,
        parentNotes: '',
        documents: sc.documents,
        requirements: confirmed.map((requirement) => ({
          requirement,
          sourceSentence: centre.requirementSources?.[requirement] ?? '',
          citation: centre.requirementCitations?.[requirement],
          sourceUrl: centre.requirementSourceUrls?.[requirement] ?? (centre.requirementCitations?.[requirement] ? centre.requirementsExtractedFrom?.sourceUrl : undefined),
        })),
      };
      const r = await priya.call('POST', '/prepare-application', input, true);
      const list: Json[] = r.data.checklist ?? [];
      const uploaded = new Set(sc.documents.map((d) => d.fileName.toLowerCase()));
      const readyWithoutMatch = list
        .filter((c) => c.status === 'ready')
        .flatMap((c) => {
          const doc = typeof c.matchedDocument === 'string' ? c.matchedDocument : null;
          const why =
            !doc ? 'ready with no document'
            : !uploaded.has(doc.toLowerCase()) ? 'document was not uploaded'
            : doc.toLowerCase() === DECOY ? 'decoy file (matches nothing)'
            : c.requirement !== confirmed[0] ? `file named for "${confirmed[0]}"`
            : '';
          return why ? [{ requirement: c.requirement, matchedDocument: doc, why }] : [];
        });
      const confirmedSet = new Set(confirmed);
      rows.push({
        centreId, centreName: centre.name, scenario: sc.name, documents: sc.documents, status: r.status,
        answeredBy: r.status === 200 ? answeredBy(r.data) : `HTTP ${r.status}`, latencyMs: r.data.latencyMs ?? NaN, checklist: list,
        readyWithoutMatch,
        outsideList: list.map((c) => c.requirement).filter((q) => !confirmedSet.has(q)),
        missingFromChecklist: confirmed.filter((q) => !list.some((c) => c.requirement === q)),
        raw: r.data,
      });
    }
  }
  log('\n| Centre | Scenario | Confirmed | Checklist | Ready | "Ready" without a matching document | Outside confirmed list | Answered by | Server time |');
  log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    if (r.skipped) {
      log(`| ${cell(r.centreName)} | skipped: ${r.skipped} | 0 | - | - | - | - | - | - |`);
      continue;
    }
    const ready = r.checklist.filter((c) => c.status === 'ready').map((c) => `${c.requirement} ← ${c.matchedDocument}`);
    log(`| ${cell(r.centreName)} | ${cell(r.scenario)} | ${r.checklist.length + r.missingFromChecklist.length - r.outsideList.length} | ${r.checklist.length} | ${cell(ready.join('; ') || 0)} | ${r.readyWithoutMatch.length} | ${r.outsideList.length} | ${cell(r.answeredBy)} | ${secs(r.latencyMs)} |`);
  }
  const ran = rows.filter((r) => !r.skipped);
  log(`\n"Ready" without a matching document: ${ran.reduce((n, r) => n + r.readyWithoutMatch.length, 0)} · outside the confirmed list: ${ran.reduce((n, r) => n + r.outsideList.length, 0)} · runs: ${ran.length} (${rows.length - ran.length} skipped) · ${JSON.stringify(tally(ran.map((r) => r.answeredBy)))}`);
  return rows;
}

// ---------------- 4. Tone check ----------------

interface ToneRow { text: string; role: string; harsh: boolean; status: number; flagged: boolean | null; answeredBy: string; latencyMs: number; reason: string; raw: Json }

async function evalTone() {
  const messages: Json[] = readJson(path.join(EVAL, 'tone_messages.json'));
  log(`\n## 4. Tone check (${messages.length} messages)`);
  const s = await new Session().login('priya@example.ca', 'parent');
  const rows: ToneRow[] = [];
  for (const m of messages) {
    log(`  … ${m.text.slice(0, 60)}`);
    const r = await s.call('POST', '/check-tone', { text: m.text, role: m.role }, true);
    rows.push({ text: m.text, role: m.role, harsh: m.harsh, status: r.status, flagged: r.status === 200 ? Boolean(r.data.isHarsh) : null, answeredBy: r.status === 200 ? answeredBy(r.data) : `HTTP ${r.status}`, latencyMs: r.data.latencyMs ?? NaN, reason: r.data.reason ?? '', raw: r.data });
  }
  log('\n| Message | Role | Label | Flagged | Result | Answered by |');
  log('| --- | --- | --- | --- | --- | --- |');
  const outcome = (r: ToneRow) => (r.flagged == null ? 'error' : r.harsh && r.flagged ? 'correct flag' : !r.harsh && !r.flagged ? 'correct pass' : r.flagged ? 'FALSE ALARM' : 'MISS');
  for (const r of rows) log(`| ${cell(r.text)} | ${r.role} | ${r.harsh ? 'harsh' : 'ok'} | ${r.flagged == null ? '-' : r.flagged ? 'yes' : 'no'} | ${outcome(r)} | ${cell(r.answeredBy)} |`);
  const c = tally(rows.map(outcome));
  log(`\nCorrect flags ${c['correct flag'] ?? 0}/${rows.filter((r) => r.harsh).length} · correct passes ${c['correct pass'] ?? 0}/${rows.filter((r) => !r.harsh).length} · false alarms ${c['FALSE ALARM'] ?? 0} · misses ${c['MISS'] ?? 0}${c.error ? ` · errors ${c.error}` : ''} · ${JSON.stringify(tally(rows.map((r) => r.answeredBy)))}`);
  return { rows, counts: c, outcome };
}

// ---------------- Report ----------------

function writeReport(r: { ask?: Awaited<ReturnType<typeof evalAsk>>; extract?: ExtractResult[]; prepare?: PrepareRow[]; tone?: Awaited<ReturnType<typeof evalTone>>; health: Json; started: Date; finished: Date }) {
  const L: string[] = [];
  const p = (s = '') => L.push(s);
  const models = new Set<string>();
  r.ask?.rows.forEach((x) => models.add(x.answeredBy));
  r.extract?.forEach((x) => models.add(x.answeredBy));
  r.prepare?.filter((x) => !x.skipped).forEach((x) => models.add(x.answeredBy));
  r.tone?.rows.forEach((x) => models.add(x.answeredBy));

  p('# CareQ evaluation results');
  p();
  p(`- **Date:** ${r.started.toISOString().slice(0, 16).replace('T', ' ')} UTC (took ${Math.round((+r.finished - +r.started) / 60000)} min)`);
  p(`- **Server:** ${BASE} · data mode ${r.health.dataMode ?? '?'} · answer caches off (AI_CACHE=off)`);
  p(`- **Configured models:** primary ${process.env.GEMINI_MODEL ?? '(default)'}, fast ${process.env.GEMINI_FALLBACK_MODEL ?? '(default)'} (Ask CareQ, Prepare and follow-ups use the fast one first); embeddings ${EMBED_MODEL}`);
  p(`- **Answered by (this run):** ${[...models].join(', ')}`);
  p(`- **Pacing:** ${PACE_MS / 1000} s between AI requests · inputs: eval/questions.json, eval/labels/*.json, eval/tone_messages.json`);
  p();
  p('## Summary');
  p();
  p('| Check | Result | Target |');
  p('| --- | --- | --- |');
  if (r.ask) {
    const s = r.ask.summary;
    p(`| Ask CareQ: answerable questions answered from the right document | ${s.answersCorrect}/${s.answersTotal} | ${s.answersTotal}/${s.answersTotal} |`);
    p(`| Ask CareQ: right page (±1) | ${s.pageOk}/${s.answersTotal} | ${s.answersTotal}/${s.answersTotal} |`);
    p(`| Ask CareQ: correct refusals | ${s.refusalsCorrect}/${s.refusalsTotal} | ${s.refusalsTotal}/${s.refusalsTotal} |`);
    p(`| Ask CareQ: quotes verbatim in the cited passage (re-checked) | ${s.quotesVerbatim}/${s.quotesTotal} | all |`);
    p(`| Ask CareQ: server time, median / max | ${secs(s.medianMs)} / ${secs(s.maxMs)} | |`);
    p(`| Ask CareQ: answered by | ${Object.entries(s.byModel).map(([k, v]) => `${k} ${v}`).join(', ')} | |`);
  }
  if (r.extract) {
    for (const x of r.extract) p(`| Requirements, ${x.operatorId}: found / missed / repeats / no label | ${x.pairs.length}/${x.labels.length} found · ${x.missed.length} missed · ${x.invented.length - inventedOnly(x).length} repeats · ${inventedOnly(x).length} with no label | all found |`);
    const q = r.extract.reduce((a, x) => [a[0] + x.quotesVerbatim, a[1] + x.extracted.length], [0, 0]);
    p(`| Requirements: quotes verbatim (re-checked) | ${q[0]}/${q[1]} | all |`);
  }
  if (r.prepare) {
    const ran = r.prepare.filter((x) => !x.skipped);
    p(`| Prepare with AI: "ready" without a matching document | ${ran.reduce((n, x) => n + x.readyWithoutMatch.length, 0)} (in ${ran.length} runs) | 0 |`);
    p(`| Prepare with AI: checklist items outside the confirmed list | ${ran.reduce((n, x) => n + x.outsideList.length, 0)} | 0 |`);
    const skipped = r.prepare.filter((x) => x.skipped);
    if (skipped.length) p(`| Prepare with AI: centres skipped | ${skipped.map((x) => `${x.centreName} (${x.skipped})`).join('; ')} | |`);
  }
  if (r.tone) {
    const c = r.tone.counts;
    p(`| Tone check: harsh messages flagged | ${c['correct flag'] ?? 0}/${r.tone.rows.filter((x) => x.harsh).length} | all |`);
    p(`| Tone check: false alarms / misses | ${c['FALSE ALARM'] ?? 0} / ${c['MISS'] ?? 0} | 0 / 0 |`);
  }
  p();

  // Worst failures: safety first, then wrong answers/refusals, then missed requirements, then tone
  const failures: { severity: number; title: string; detail: string }[] = [];
  for (const x of r.prepare ?? [])
    for (const f of x.readyWithoutMatch) failures.push({ severity: 0, title: `Prepare with AI marked a requirement ready without a matching document (${x.centreName}, ${x.scenario})`, detail: `"${f.requirement}" ← ${f.matchedDocument ?? 'no file'}: ${f.why}. Answered by ${x.answeredBy}.` });
  for (const x of r.prepare ?? []) if (x.outsideList.length) failures.push({ severity: 0, title: `Prepare with AI listed requirements the centre never confirmed (${x.centreName})`, detail: x.outsideList.join('; ') });
  for (const x of r.ask?.rows ?? []) {
    if (x.correct) continue;
    if (x.expect === 'refuse')
      failures.push({ severity: 1, title: `Ask CareQ answered a question it should refuse (${x.id}: "${x.question}")`, detail: `Got: "${x.answer.slice(0, 300)}" · sources: ${x.quotes.map((q) => `${q.operatorId} p.${q.page}`).join(', ') || 'none'} · ${x.answeredBy}` });
    else
      failures.push({
        severity: x.answered ? 1 : 2,
        title: x.answered ? `Ask CareQ cited the wrong document (${x.id}: "${x.question}")` : `Ask CareQ refused an answerable question (${x.id}: "${x.question}")`,
        detail: `Expected ${x.source?.operatorId} p.${x.source?.pages.join('/')}. Got: "${x.answer.slice(0, 300)}" · sources: ${x.quotes.map((q) => `${q.operatorId} p.${q.page}`).join(', ') || 'none'} · ${x.answeredBy}, ${secs(x.latencyMs)}`,
      });
  }
  for (const x of r.ask?.rows ?? []) for (const q of x.quotes) if (!q.verbatim) failures.push({ severity: 1, title: `Ask CareQ quote not found verbatim (${x.id})`, detail: `"${q.quote}" (chunk ${q.chunkId})` });
  for (const x of r.extract ?? []) if (x.missed.length) failures.push({ severity: 3, title: `Policy reader missed ${x.missed.length}/${x.labels.length} labelled requirements (${x.operatorId})`, detail: x.missed.map((m) => `"${m.label}"${m.nearest ? ` (nearest extracted: "${m.nearest}", ${m.score!.toFixed(2)})` : ''}`).join('; ') + `. Answered by ${x.answeredBy}.` });
  for (const x of r.tone?.rows ?? []) {
    const o = r.tone!.outcome(x);
    if (o === 'MISS' || o === 'FALSE ALARM') failures.push({ severity: o === 'MISS' ? 2 : 4, title: `Tone check ${o === 'MISS' ? 'missed a harsh message' : 'flagged a calm message'} (${x.role})`, detail: `"${x.text}"${x.reason ? ` · reason given: ${x.reason}` : ''} · ${x.answeredBy}` });
  }
  failures.sort((a, b) => a.severity - b.severity);
  p('## Worst failures');
  p();
  if (!failures.length) p('No failures in this run.');
  failures.slice(0, 3).forEach((f, i) => {
    p(`${i + 1}. **${f.title}**  `);
    p(`   ${f.detail}`);
  });
  if (failures.length > 3) p(`\n(${failures.length} failures in total; all are in the tables below.)`);
  p();

  if (r.ask) {
    p('## 1. Ask CareQ');
    p();
    p('Correct answer = answered with at least one citation from the labelled operator\'s document. Page ±1 = a citation from that document within one page of a labelled page. Correct refusal = the standard "I don\'t have that information" reply with no citations. Quotes are re-checked against the stored passage text in MongoDB (whitespace, curly quotes, dashes and case unified). The answer\'s wording is not graded.');
    p();
    p('| ID | Question | Expected | Answer | Sources (operator, page) | Doc | Page ±1 | Quotes | Answered by | Time | Pass |');
    p('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    const yn = (b: boolean | null) => (b == null ? '-' : b ? 'yes' : 'no');
    for (const x of r.ask.rows)
      p(`| ${x.id} | ${cell(x.question)} | ${x.expect}${x.source ? ` (${x.source.operatorId} p.${x.source.pages.join('/')})` : ''} | ${cell(x.answer.slice(0, 220))}${x.answer.length > 220 ? '…' : ''} | ${cell([...new Set(x.quotes.map((q) => `${q.operatorId} p.${q.page}`))].join('; ') || '-')} | ${yn(x.sourceOk)} | ${yn(x.pageOk)} | ${x.quotes.length ? `${x.quotes.filter((q) => q.verbatim).length}/${x.quotes.length}` : '-'} | ${cell(x.answeredBy)} | ${secs(x.latencyMs)} | ${x.correct ? '✅' : '❌'} |`);
    p();
  }
  if (r.extract) {
    p('## 2. Requirement extraction vs labels');
    p();
    p(`Labels are matched to extracted requirements by meaning: ${EMBED_MODEL} embeddings (task SEMANTIC_SIMILARITY), cosine ≥ ${MATCH}, one-to-one, highest first. "Repeat" means an extra item that matches a label already paired (cosine ≥ the threshold). "No label" means an extracted requirement no label matched; the labels list documents only, so waitlist or registration steps the reader finds also land here. Every extracted item carries a quote verified verbatim in the handbook.`);
    for (const x of r.extract) {
      p();
      p(`### ${x.operatorId} (signed in as the demo account of ${x.centreId}; ${x.answeredBy}, ${secs(x.latencyMs)})`);
      p();
      p('| Label | Extracted | Cosine | |');
      p('| --- | --- | --- | --- |');
      for (const m of x.pairs) p(`| ${cell(m.label)} | ${cell(m.extracted)} | ${m.score.toFixed(3)} | found |`);
      for (const m of x.missed) p(`| ${cell(m.label)} | (nearest: ${cell(m.nearest ?? '-')}) | ${m.score?.toFixed(3) ?? '-'} | **missed** |`);
      for (const i of x.invented) p(`| (nearest: ${cell(i.nearest ?? '-')}) | ${cell(i.extracted.requirement)} [${i.extracted.category}, ${cell(i.extracted.page)}] “${cell(i.extracted.quote)}” | ${i.score?.toFixed(3) ?? '-'} | ${isRepeat(i) ? 'repeat of a found label' : 'no label'}${i.verbatim ? '' : ' · quote NOT verbatim'} |`);
    }
    p();
  }
  if (r.prepare) {
    p('## 3. Prepare with AI safety');
    p();
    p(`Each demo centre runs twice, as Priya (simulated parent): with no documents, and with two unattached files: one named after the centre's first confirmed requirement and a decoy ("${DECOY}"). A "ready" counts as without a matching document if it has no file, a file that was not uploaded, the decoy, or the named file on a different requirement. Results are what the parent sees (after the app's guardrails in src/lib/prepareApplication.ts), not the raw model output.`);
    p();
    p('| Centre | Scenario | Checklist (status) | "Ready" without match | Outside list | Answered by | Time |');
    p('| --- | --- | --- | --- | --- | --- | --- |');
    for (const x of r.prepare) {
      if (x.skipped) p(`| ${cell(x.centreName)} | skipped: ${x.skipped} | | | | | |`);
      else p(`| ${cell(x.centreName)} | ${cell(x.scenario)} | ${cell(x.checklist.map((c) => `${c.requirement}: ${c.status}${c.matchedDocument ? ` ← ${c.matchedDocument}` : ''}`).join('; '))} | ${x.readyWithoutMatch.length ? cell(x.readyWithoutMatch.map((f) => `${f.requirement} (${f.why})`).join('; ')) : 0} | ${x.outsideList.length ? cell(x.outsideList.join('; ')) : 0} | ${cell(x.answeredBy)} | ${secs(x.latencyMs)} |`);
    }
    p();
  }
  if (r.tone) {
    p('## 4. Tone check');
    p();
    p('| Message | Role | Label | Flagged | Result | Reason given | Answered by |');
    p('| --- | --- | --- | --- | --- | --- | --- |');
    for (const x of r.tone.rows) p(`| ${cell(x.text)} | ${x.role} | ${x.harsh ? 'harsh' : 'ok'} | ${x.flagged == null ? '-' : x.flagged ? 'yes' : 'no'} | ${r.tone.outcome(x)} | ${cell(x.reason)} | ${cell(x.answeredBy)} |`);
    p();
  }

  p('## Raw outputs');
  p();
  p('Full responses as returned by the server (also in eval/raw/*.json; server log in eval/raw/server.log when the script started the server).');
  const raw = (title: string, data: unknown) => {
    p();
    p(`<details><summary>${title}</summary>`);
    p();
    p('```json');
    p(JSON.stringify(data, null, 2));
    p('```');
    p();
    p('</details>');
  };
  if (r.ask) raw('Ask CareQ', r.ask.rows.map((x) => ({ id: x.id, question: x.question, centreId: x.centreId, response: x.raw })));
  if (r.extract) raw('Requirement extraction', r.extract.map((x) => ({ operatorId: x.operatorId, centreId: x.centreId, response: x.raw })));
  if (r.prepare) raw('Prepare with AI', r.prepare.map((x) => ({ centreId: x.centreId, scenario: x.scenario, documents: x.documents, skipped: x.skipped, response: x.raw })));
  if (r.tone) raw('Tone check', r.tone.rows.map((x) => ({ text: x.text, role: x.role, label: x.harsh, response: x.raw })));
  fs.writeFileSync(path.join(EVAL, 'results.md'), L.join('\n') + '\n');
}

// ---------------- Main ----------------

async function main() {
  const started = new Date();
  const server = await startServer();
  const done = () => {
    if (server && server.exitCode == null) server.kill();
  };
  process.on('SIGINT', () => (done(), process.exit(130)));
  try {
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => ({}));
    if (health.dataMode !== 'mongo') throw new Error(`server is in ${health.dataMode} mode; the eval needs the shared MongoDB (policy index, demo accounts)`);
    const ask = ONLY.has('ask') ? await evalAsk() : undefined;
    const extract = ONLY.has('extract') ? await evalExtract() : undefined;
    const prepare = ONLY.has('prepare') ? await evalPrepare() : undefined;
    const tone = ONLY.has('tone') ? await evalTone() : undefined;
    fs.mkdirSync(path.join(EVAL, 'raw'), { recursive: true });
    const save = (n: string, d: unknown) => d && fs.writeFileSync(path.join(EVAL, 'raw', `${n}.json`), JSON.stringify(d, null, 2));
    save('ask', ask?.rows);
    save('extract', extract);
    save('prepare', prepare);
    save('tone', tone?.rows);
    writeReport({ ask, extract, prepare, tone, health, started, finished: new Date() });
    log(`\nWrote eval/results.md and eval/raw/*.json`);
  } finally {
    done();
    await mongo?.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
