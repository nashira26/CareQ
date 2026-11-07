/**
 * npm run build:index                 Extract, clean, chunk and embed every published document listed in
 *                                     data/policies/<operator>/meta.json and data/provincial/<doc>/meta.json,
 *                                     store the chunks in MongoDB (policyChunks), create the Atlas Vector Search
 *                                     index, and write data/index/policyChunks.json for local mode.
 * npm run build:index -- --dry-run    Extract and chunk only (no Gemini calls, no database writes).
 * npm run build:index -- --only=<folder>  Just one folder (e.g. --only=rolph-road-day-care).
 *
 * The PDFs/HTML are third-party documents kept out of git: get them from the team shared drive.
 * Re-running replaces each document's chunks (chunkId = "<operatorId>/<file>#<n>"), so there are no duplicates.
 */
import 'dotenv/config';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { PageText, TextChunk, chunkPages, cleanPages, htmlToText, tooLittleText } from '../server/policyText';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const OUT_FILE = path.join(DATA, 'index', 'policyChunks.json');
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-2';
export const EMBED_DIMENSIONS = 768;
export const VECTOR_INDEX_NAME = 'policy_chunks_vector';
const BATCH_SIZE = 50;
const MAX_TRIES = 6;
/** A request that hasn't answered by then is abandoned and retried. */
const REQUEST_TIMEOUT_MS = 60_000;
/** Longest single wait between retries, even if the API asks for more. */
const MAX_WAIT_MS = 65_000;
/** Small pause between batches to stay under per-minute limits. */
const BATCH_PAUSE_MS = 1_000;
/** Embeddings already paid for, keyed by text + model + dimensions (git-ignored with data/index/). */
const CACHE_FILE = path.join(DATA, 'index', '.cache', `embeddings-${EMBED_MODEL}-${EMBED_DIMENSIONS}.jsonl`);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice('--only='.length);

interface MetaDoc {
  file: string;
  title: string;
  sourceUrl?: string;
  sourceNote?: string;
  retrieved?: string;
}
interface Meta {
  operator: string;
  scope?: 'provincial';
  demoCentreId?: string;
  appliesToCentreIds?: string[];
  documents: MetaDoc[];
}

export interface PolicyChunk {
  chunkId: string;
  docKey: string;
  text: string;
  heading: string;
  page: number | null;
  embedding: number[];
  scope: 'operator' | 'provincial';
  operatorId: string;
  operatorName: string;
  appliesToCentreIds: string[];
  docTitle: string;
  sourceUrl: string | null;
  sourceNote: string | null;
  retrieved: string | null;
  embeddingModel: string;
  embeddingDimensions: number;
  createdAt: string;
}

interface SummaryRow {
  operator: string;
  scope: string;
  documents: number;
  indexed: number;
  pages: number;
  htmlDocs: number;
  chunks: number;
  skipped: string[];
}

// ---------------- Extraction ----------------

async function extract(filePath: string): Promise<PageText[]> {
  if (/\.pdf$/i.test(filePath)) {
    const parser = new PDFParse({ data: fs.readFileSync(filePath) });
    try {
      const result = await parser.getText();
      return result.pages.map((p) => ({ page: p.num, text: p.text }));
    } finally {
      await parser.destroy();
    }
  }
  if (/\.html?$/i.test(filePath)) return [{ page: null, text: htmlToText(fs.readFileSync(filePath, 'utf8')) }];
  throw new Error(`Unsupported file type: ${path.basename(filePath)}`);
}

// ---------------- Embeddings ----------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const normalise = (v: number[]) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => Number((x / n).toFixed(6)));
};

/** "Retry in 31s" / retryDelay "31s" in a Gemini error -> milliseconds. */
const retryDelayOf = (msg: string) => {
  const m = msg.match(/retry(?:Delay)?["\s:]*(?:in\s*)?"?(\d+(?:\.\d+)?)s/i);
  return m ? Math.ceil(Number(m[1]) * 1000) : null;
};

/** The embedding quota is used up for now; the document is skipped and can be resumed later. */
class QuotaError extends Error {}

const cacheKey = (text: string) => createHash('sha256').update(text).digest('hex');

function loadCache(): Map<string, number[]> {
  const cache = new Map<string, number[]>();
  if (!fs.existsSync(CACHE_FILE)) return cache;
  for (const line of fs.readFileSync(CACHE_FILE, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const { k, v } = JSON.parse(line) as { k: string; v: number[] };
      if (v?.length === EMBED_DIMENSIONS) cache.set(k, v);
    } catch {
      // a partly written last line (interrupted run): ignore it
    }
  }
  return cache;
}

function appendCache(entries: { k: string; v: number[] }[]) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.appendFileSync(CACHE_FILE, entries.map((e) => JSON.stringify(e) + '\n').join(''));
}

async function embedBatch(ai: GoogleGenAI, texts: string[]): Promise<number[][]> {
  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    try {
      const request = ai.models.embedContent({
        model: EMBED_MODEL,
        // One Content per text: a plain string array is merged into ONE embedding by gemini-embedding-2
        contents: texts.map((text) => ({ parts: [{ text }] })),
        config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBED_DIMENSIONS, abortSignal: controller.signal },
      });
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`timeout after ${REQUEST_TIMEOUT_MS / 1000}s`));
        }, REQUEST_TIMEOUT_MS);
      });
      const res = await Promise.race([request, timeout]);
      const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
      if (vectors.length !== texts.length || vectors.some((v) => v.length !== EMBED_DIMENSIONS)) {
        throw new Error(`Unexpected embedding response: ${vectors.length} vectors for ${texts.length} texts`);
      }
      return vectors.map(normalise);
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      const status = (e as { status?: number }).status;
      const retryable = status === 429 || (status !== undefined && status >= 500) || /429|RESOURCE_EXHAUSTED|UNAVAILABLE|INTERNAL|503|500|ECONNRESET|fetch failed|timeout/i.test(msg);
      const quota = (msg.match(/"quotaMetric":\s*"([^"]+)"/) ?? [])[1]?.split('/').pop();
      const asked = retryDelayOf(msg);
      // Asked to wait over 30 minutes: a daily quota. Retrying now can't succeed.
      if (asked !== null && asked > 30 * 60_000) {
        throw new QuotaError(`embedding quota reached${quota ? ` (${quota})` : ''}; resets in about ${Math.round(asked / 3_600_000 * 10) / 10} h`);
      }
      if (!retryable || attempt >= MAX_TRIES) {
        throw new Error(
          `${msg.slice(0, 200)}${quota ? ` [quota: ${quota}]` : ''}\nEmbeddings done so far are cached; run npm run build:index again later to resume.`
        );
      }
      // Never sleep long: a requested delay is capped at MAX_WAIT_MS
      const wait = asked !== null ? Math.min(asked, MAX_WAIT_MS) : 2000 * 2 ** (attempt - 1);
      console.warn(
        `  embeddings: ${status ?? 'error'}${quota ? ` [quota: ${quota}]` : ''}${asked !== null && asked > MAX_WAIT_MS ? ` (asked to wait ${Math.round(asked / 1000)}s)` : ''}; retry ${attempt}/${MAX_TRIES - 1} in ${Math.round(wait / 1000)}s`
      );
      await sleep(wait);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** What gets embedded: the document title and heading give the passage its context. Stored text stays as extracted. */
const embedInput = (docTitle: string, c: TextChunk) => `${docTitle}\n${c.heading}\n\n${c.text}`;

// ---------------- Vector index ----------------

export const vectorIndexDefinition = {
  fields: [
    { type: 'vector', path: 'embedding', numDimensions: EMBED_DIMENSIONS, similarity: 'cosine' },
    { type: 'filter', path: 'scope' },
    { type: 'filter', path: 'appliesToCentreIds' },
  ],
};

async function ensureVectorIndex(client: MongoClient, dbName: string) {
  const coll = client.db(dbName).collection('policyChunks');
  const pasteable = JSON.stringify({ name: VECTOR_INDEX_NAME, type: 'vectorSearch', definition: vectorIndexDefinition }, null, 2);
  try {
    const existing = (await coll.listSearchIndexes(VECTOR_INDEX_NAME).toArray())[0] as { latestDefinition?: unknown; status?: string } | undefined;
    if (!existing) {
      await coll.createSearchIndex({ name: VECTOR_INDEX_NAME, type: 'vectorSearch', definition: vectorIndexDefinition });
      console.log(`Vector index "${VECTOR_INDEX_NAME}": created`);
    } else if (JSON.stringify(existing.latestDefinition) !== JSON.stringify(vectorIndexDefinition)) {
      await coll.updateSearchIndex(VECTOR_INDEX_NAME, vectorIndexDefinition);
      console.log(`Vector index "${VECTOR_INDEX_NAME}": definition updated`);
    } else {
      console.log(`Vector index "${VECTOR_INDEX_NAME}": already up to date (${existing.status})`);
    }
    // Wait (up to ~2 min) until it can be queried
    for (let i = 0; i < 24; i++) {
      const idx = (await coll.listSearchIndexes(VECTOR_INDEX_NAME).toArray())[0] as { status?: string; queryable?: boolean } | undefined;
      if (idx?.queryable || idx?.status === 'READY') {
        console.log(`Vector index "${VECTOR_INDEX_NAME}": READY`);
        return true;
      }
      await sleep(5000);
    }
    console.log(`Vector index "${VECTOR_INDEX_NAME}": still building; it becomes queryable shortly (check Atlas > Search).`);
    return true;
  } catch (e) {
    console.log(`\nCould not create the vector index from code (${(e as Error).message}).`);
    console.log(`Create it in Atlas: Database > ${dbName}.policyChunks > Search Indexes > Create > Atlas Vector Search > JSON editor:\n`);
    console.log(pasteable);
    return false;
  }
}

// ---------------- Main ----------------

function loadMetas(): { folder: string; scope: 'operator' | 'provincial'; dir: string; meta: Meta }[] {
  const out: { folder: string; scope: 'operator' | 'provincial'; dir: string; meta: Meta }[] = [];
  for (const [sub, scope] of [
    ['policies', 'operator'],
    ['provincial', 'provincial'],
  ] as const) {
    const base = path.join(DATA, sub);
    if (!fs.existsSync(base)) continue;
    for (const folder of fs.readdirSync(base).sort()) {
      const metaPath = path.join(base, folder, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;
      if (ONLY && ONLY !== folder) continue;
      out.push({ folder, scope, dir: path.join(base, folder), meta: JSON.parse(fs.readFileSync(metaPath, 'utf8')) as Meta });
    }
  }
  return out;
}

function printSummary(rows: SummaryRow[]) {
  const header = ['Operator', 'Scope', 'Docs', 'Pages', 'Chunks', 'Skipped'];
  const body = rows.map((r) => [r.operator, r.scope, `${r.indexed}/${r.documents}`, r.htmlDocs ? (r.pages ? `${r.pages} + HTML` : 'HTML') : String(r.pages), String(r.chunks), r.skipped.join('; ') || '-']);
  const total = ['TOTAL', '', `${rows.reduce((n, r) => n + r.indexed, 0)}/${rows.reduce((n, r) => n + r.documents, 0)}`, String(rows.reduce((n, r) => n + r.pages, 0)), String(rows.reduce((n, r) => n + r.chunks, 0)), ''];
  const all = [header, ...body, total];
  const widths = header.map((_, i) => Math.min(60, Math.max(...all.map((r) => r[i].length))));
  const line = (r: string[]) => r.map((c, i) => (c.length > widths[i] ? c.slice(0, widths[i] - 1) + '…' : c.padEnd(widths[i]))).join(' | ');
  console.log('\n' + line(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('-+-'));
  body.forEach((r) => console.log(line(r)));
  console.log(widths.map((w) => '-'.repeat(w)).join('-+-'));
  console.log(line(total));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!DRY_RUN && (!uri || !dbName || !apiKey)) {
    console.error('MONGODB_URI, MONGODB_DB and GEMINI_API_KEY must be set (see .env.example). Use --dry-run to only extract and chunk.');
    process.exit(1);
  }
  const ai = DRY_RUN ? null : new GoogleGenAI({ apiKey });
  const client = DRY_RUN ? null : new MongoClient(uri!, { serverSelectionTimeoutMS: 10000 });
  const coll = client ? (await client.connect(), client.db(dbName).collection<PolicyChunk>('policyChunks')) : null;
  if (coll) {
    await coll.createIndexes([{ key: { chunkId: 1 }, unique: true }, { key: { docKey: 1 } }, { key: { scope: 1, appliesToCentreIds: 1 } }]);
  }

  const cache = DRY_RUN ? new Map<string, number[]>() : loadCache();
  if (coll) {
    // Chunks already in the database (same model and size) count as cached: don't pay for them twice
    const stored = await coll
      .find({ embeddingModel: EMBED_MODEL, embeddingDimensions: EMBED_DIMENSIONS }, { projection: { _id: 0, docTitle: 1, heading: 1, text: 1, page: 1, embedding: 1 } })
      .toArray();
    const fresh: { k: string; v: number[] }[] = [];
    for (const c of stored) {
      const k = cacheKey(embedInput(c.docTitle, { index: 0, heading: c.heading, page: c.page, text: c.text }));
      if (!cache.has(k) && c.embedding?.length === EMBED_DIMENSIONS) {
        cache.set(k, c.embedding);
        fresh.push({ k, v: c.embedding });
      }
    }
    if (fresh.length) {
      appendCache(fresh);
      console.log(`Cache: ${fresh.length} embeddings taken from chunks already in the database`);
    }
  }
  const rows: SummaryRow[] = [];
  const createdAt = new Date().toISOString();
  console.log(`${DRY_RUN ? 'DRY RUN (no embeddings, no database). ' : ''}Embedding model: ${EMBED_MODEL}, ${EMBED_DIMENSIONS} dimensions${dbName && !DRY_RUN ? `, database: ${dbName}` : ''}\n`);

  for (const { folder, scope, dir, meta } of loadMetas()) {
    const row: SummaryRow = { operator: meta.operator, scope, documents: meta.documents.length, indexed: 0, pages: 0, htmlDocs: 0, chunks: 0, skipped: [] };
    rows.push(row);
    for (const doc of meta.documents) {
      const filePath = path.join(dir, doc.file);
      const docKey = `${folder}/${doc.file}`;
      if (!fs.existsSync(filePath)) {
        row.skipped.push(`${doc.file}: file missing (get it from the shared drive)`);
        continue;
      }
      let pages: PageText[];
      try {
        pages = await extract(filePath);
      } catch (e) {
        row.skipped.push(`${doc.file}: could not extract (${(e as Error).message})`);
        continue;
      }
      const cleaned = cleanPages(pages);
      const amount = tooLittleText(cleaned);
      if (amount.skip) {
        row.skipped.push(`${doc.file}: too little text (${amount.totalChars} chars, ${amount.avgPerPage}/page; scanned?)`);
        continue;
      }
      const chunks = chunkPages(cleaned, doc.title);
      const pageCount = pages[0]?.page == null ? 0 : pages.length;
      console.log(`${docKey}: ${pageCount || 'HTML'} ${pageCount ? 'pages' : ''}, ${amount.totalChars} chars -> ${chunks.length} chunks`);

      if (!DRY_RUN) {
        // Reuse cached embeddings and embed only what's new, so an interrupted run resumes
        const inputs = chunks.map((c) => embedInput(doc.title, c));
        const keys = inputs.map(cacheKey);
        const todo = keys.map((k, i) => (cache.has(k) ? -1 : i)).filter((i) => i >= 0);
        if (todo.length < chunks.length) console.log(`  ${chunks.length - todo.length} embeddings reused from the cache`);
        let quotaHit: string | null = null;
        for (let b = 0; b < todo.length; b += BATCH_SIZE) {
          const idx = todo.slice(b, b + BATCH_SIZE);
          const started = Date.now();
          let vecs: number[][];
          try {
            vecs = await embedBatch(ai!, idx.map((i) => inputs[i]));
          } catch (e) {
            if (!(e instanceof QuotaError)) throw e;
            quotaHit = e.message;
            break;
          }
          const entries = idx.map((i, j) => ({ k: keys[i], v: vecs[j] }));
          entries.forEach((e) => cache.set(e.k, e.v));
          appendCache(entries);
          console.log(`  embedded ${Math.min(b + BATCH_SIZE, todo.length)}/${todo.length} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
          await sleep(BATCH_PAUSE_MS);
        }
        if (quotaHit) {
          // Keep this document's existing chunks (if any); the embeddings done so far are cached
          const done = keys.filter((k) => cache.has(k)).length;
          console.log(`  ${quotaHit}: ${done}/${chunks.length} embedded and cached; run again later to finish`);
          row.skipped.push(`${doc.file}: ${quotaHit} (${done}/${chunks.length} embedded; re-run to resume)`);
          continue;
        }
        const vectors = keys.map((k) => cache.get(k)!);
        const records: PolicyChunk[] = chunks.map((c, i) => ({
          chunkId: `${docKey}#${c.index}`,
          docKey,
          text: c.text,
          heading: c.heading,
          page: c.page,
          embedding: vectors[i],
          scope,
          operatorId: folder,
          operatorName: meta.operator,
          appliesToCentreIds: scope === 'operator' ? meta.appliesToCentreIds ?? [] : [],
          docTitle: doc.title,
          sourceUrl: doc.sourceUrl ?? null,
          sourceNote: doc.sourceNote ?? null,
          retrieved: doc.retrieved ?? null,
          embeddingModel: EMBED_MODEL,
          embeddingDimensions: EMBED_DIMENSIONS,
          createdAt,
        }));
        // Replace this document's chunks only after all its embeddings succeeded
        await coll!.deleteMany({ docKey });
        if (records.length) await coll!.insertMany(records.map((r) => ({ ...r })));
      }
      row.indexed++;
      row.pages += pageCount;
      if (!pageCount) row.htmlDocs++;
      row.chunks += chunks.length;
    }
  }

  if (!DRY_RUN && client && coll) {
    // Local copy (all chunks currently in the database) for local mode and as a fallback
    const all = await coll.find({}, { projection: { _id: 0 } }).sort({ docKey: 1, chunkId: 1 }).toArray();
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(
      OUT_FILE,
      JSON.stringify({
        metadata: {
          generatedBy: 'scripts/build-index.ts',
          builtAt: createdAt,
          embeddingModel: EMBED_MODEL,
          embeddingDimensions: EMBED_DIMENSIONS,
          similarity: 'cosine (vectors are unit length)',
          documents: [...new Set(all.map((c) => c.docKey))],
          chunkCount: all.length,
        },
        chunks: all,
      })
    );
    console.log(`\nWrote ${path.relative(ROOT, OUT_FILE)} (${all.length} chunks, ${(fs.statSync(OUT_FILE).size / 1e6).toFixed(1)} MB)`);
    await ensureVectorIndex(client, dbName!);
    await client.close();
  }

  printSummary(rows);
  console.log(`\nEmbedding model: ${EMBED_MODEL} · ${EMBED_DIMENSIONS} dimensions · cosine`);
}

main().catch((e) => {
  console.error('build:index failed:', (e as Error).message);
  process.exit(1);
});
