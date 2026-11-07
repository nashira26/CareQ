/**
 * Retrieval over the published documents (policyChunks).
 *
 *   question ──► query embedding (cached by normalised question) ──► Atlas $vectorSearch
 *                       │ quota/timeout/no key                         │ index unavailable
 *                       ▼                                              ▼
 *                keyword search over the chunks            cosine over the chunks in memory
 *                (notice: "AI search limited right now: basic search used")
 *
 * Never throws for retrieval problems: the worst case is keyword search (or no passages).
 * Scope: a centre's question sees its operator's handbook (appliesToCentreIds) plus provincial
 * documents; without a centre, all documents.
 */
import { createHash } from 'node:crypto';
import type { Collection, Db } from 'mongodb';
import {
  EMBED_DIMENSIONS,
  EMBED_MODEL,
  POLICY_CHUNKS,
  PolicyChunk,
  QUERY_EMBEDDINGS,
  VECTOR_INDEX_NAME,
  normalise,
} from './policyIndexConfig';

export const BASIC_SEARCH_NOTICE = 'AI search limited right now: basic search used';
/** Shown with every passage from a provincial document (e.g. the licensing manual). */
export const PROVINCIAL_LABEL = 'General Ontario rule; check with the centre.';
/** Most keyword-only passages (chunks without embeddings) added to a vector search result. */
export const KEYWORD_ONLY_LIMIT = 2;

export type StoredChunk = Omit<PolicyChunk, 'embedding'> & { embedding?: number[] | null };

export interface RetrievedPassage {
  chunkId: string;
  text: string;
  heading: string;
  page: number | null;
  docTitle: string;
  sourceUrl: string | null;
  sourceNote: string | null;
  retrieved: string | null;
  operatorId: string;
  operatorName: string;
  scope: 'operator' | 'provincial';
  score: number;
  /** vector = similarity search; keyword = word match (no embedding for the chunk or the question). */
  matchedBy: 'vector' | 'keyword';
  /** PROVINCIAL_LABEL for provincial documents. */
  label?: string;
}

export interface RetrievalResult {
  passages: RetrievedPassage[];
  /** vector = Atlas Vector Search; vector-local = cosine in memory; keyword = basic search. */
  method: 'vector' | 'vector-local' | 'keyword';
  /** Set when the AI (embedding) search could not be used. */
  notice?: string;
  queryEmbeddingFromCache: boolean;
}

export interface RetrieveOptions {
  /** Restrict to this centre's operator handbook (+ provincial documents when includeProvincial). */
  centreId?: string;
  includeProvincial?: boolean;
  /** Only this kind of document (e.g. 'provincial' for the licensing manual alone). */
  scope?: 'operator' | 'provincial';
  limit?: number;
}

// ---------------- Query embedding cache ----------------

/** "What's the IMMUNIZATION policy??" -> "whats the immunization policy" */
export const normaliseQuestion = (q: string) =>
  q
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const queryCacheKey = (question: string) =>
  createHash('sha256').update(`${EMBED_MODEL}|${EMBED_DIMENSIONS}|${normaliseQuestion(question)}`).digest('hex');

export interface QueryEmbeddingStore {
  get(key: string): Promise<number[] | null>;
  set(key: string, question: string, embedding: number[]): Promise<void>;
}

/** In-memory store (local mode, tests), bounded. */
export class MemoryQueryStore implements QueryEmbeddingStore {
  private map = new Map<string, number[]>();
  constructor(private max = 1000) {}
  async get(key: string) {
    return this.map.get(key) ?? null;
  }
  async set(key: string, _q: string, embedding: number[]) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value!);
    this.map.set(key, embedding);
  }
}

/** MongoDB store: shared by all server instances and kept across restarts; memory in front. */
export class MongoQueryStore implements QueryEmbeddingStore {
  private memory = new MemoryQueryStore();
  private coll: Collection<{ key: string; question: string; embedding: number[]; model: string; dimensions: number; createdAt: Date }>;
  private indexed = false;
  constructor(db: Db) {
    this.coll = db.collection(QUERY_EMBEDDINGS);
  }
  async get(key: string) {
    const hit = await this.memory.get(key);
    if (hit) return hit;
    const doc = await this.coll.findOne({ key }, { projection: { _id: 0, embedding: 1 } });
    if (doc?.embedding?.length === EMBED_DIMENSIONS) {
      await this.memory.set(key, '', doc.embedding);
      return doc.embedding;
    }
    return null;
  }
  async set(key: string, question: string, embedding: number[]) {
    await this.memory.set(key, question, embedding);
    if (!this.indexed) {
      await this.coll.createIndex({ key: 1 }, { unique: true }).catch(() => {});
      this.indexed = true;
    }
    await this.coll
      .updateOne(
        { key },
        { $setOnInsert: { key, question: normaliseQuestion(question).slice(0, 300), embedding, model: EMBED_MODEL, dimensions: EMBED_DIMENSIONS, createdAt: new Date() } },
        { upsert: true }
      )
      .catch(() => {}); // the cache is an optimisation: never fail the question over it
  }
}

/** Embeds one question for retrieval (task type RETRIEVAL_QUERY). Throws on any failure. */
export type QueryEmbedder = (question: string) => Promise<number[]>;

/** Gemini query embedder with a timeout. */
export function geminiQueryEmbedder(
  ai: { models: { embedContent: (p: any) => Promise<{ embeddings?: { values?: number[] }[] }> } },
  timeoutMs = 8000
): QueryEmbedder {
  return async (question) => {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    try {
      const res = await Promise.race([
        ai.models.embedContent({
          model: EMBED_MODEL,
          contents: [{ parts: [{ text: question }] }],
          config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: EMBED_DIMENSIONS, abortSignal: controller.signal },
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error(`query embedding timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
      const v = res.embeddings?.[0]?.values;
      if (!v || v.length !== EMBED_DIMENSIONS) throw new Error('No query embedding returned');
      return normalise(v);
    } finally {
      clearTimeout(timer);
    }
  };
}

// ---------------- Chunk sources ----------------

export interface ChunkSource {
  /** All chunks (with embeddings when available), for keyword and in-memory search. */
  all(): Promise<StoredChunk[]>;
  /** Atlas Vector Search; throws when unavailable (local mode, index missing). */
  vectorSearch?(queryVector: number[], filter: object | undefined, limit: number): Promise<(StoredChunk & { score: number })[]>;
  /** Forget cached chunks (after a centre uploads a document). */
  invalidate?(): void;
}

/** Chunks from MongoDB, cached in memory for a few minutes; Atlas Vector Search when the index exists. */
export function mongoChunkSource(db: Db, ttlMs = 10 * 60_000): ChunkSource {
  const coll = db.collection<PolicyChunk>(POLICY_CHUNKS);
  let cache: { at: number; chunks: StoredChunk[] } | null = null;
  return {
    async all() {
      if (cache && Date.now() - cache.at < ttlMs) return cache.chunks;
      const chunks = (await coll.find({}, { projection: { _id: 0 } }).toArray()) as StoredChunk[];
      cache = { at: Date.now(), chunks };
      return chunks;
    },
    invalidate() {
      cache = null;
    },
    async vectorSearch(queryVector, filter, limit) {
      return (await coll
        .aggregate([
          {
            $vectorSearch: {
              index: VECTOR_INDEX_NAME,
              path: 'embedding',
              queryVector,
              numCandidates: Math.max(100, limit * 20),
              limit,
              ...(filter ? { filter } : {}),
            },
          },
          { $project: { _id: 0, embedding: 0, score: { $meta: 'vectorSearchScore' } } },
        ])
        .toArray()) as (StoredChunk & { score: number })[];
    },
  };
}

/** Chunks from a list already in memory (data/index/policyChunks.json in local mode, tests). */
export const memoryChunkSource = (chunks: StoredChunk[]): ChunkSource => ({ all: async () => chunks });

// ---------------- Scoring ----------------

const STOPWORDS = new Set(
  'a an and are as at be by can could do does for from has have how i if in is it its me my of on or our should so than that the their them there these they this to was we were what when where which who why will with would you your yours about any also am been before being but child childs children centre center daycare care'.split(' ')
);

/** Light stemming so "immunizations" matches "immunization", "fees" matches "fee". */
export const stem = (w: string) => {
  if (/ations?$/.test(w)) return w.replace(/ations?$/, 'at'); // immunization(s) -> immunizat
  if (/ies$/.test(w) && w.length > 4) return w.replace(/ies$/, 'y'); // policies -> policy
  if (/(ss|x|ch|sh|z)es$/.test(w)) return w.slice(0, -2); // classes -> class
  if (/ings?$/.test(w) && w.length > 6) return w.replace(/ings?$/, ''); // waiting -> wait
  if (/[^s]s$/.test(w)) return w.slice(0, -1); // fees -> fee, lists -> list
  return w;
};

export const keywordTerms = (text: string) =>
  normaliseQuestion(text)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem);

/** Child-care words parents use for the same thing as handbooks (fallback search only). */
const SYNONYMS: string[][] = [
  ['enrol', 'enroll', 'enrolment', 'enrollment', 'admission', 'admit', 'register', 'registration', 'apply', 'application'],
  ['document', 'form', 'paperwork', 'record'],
  ['immunization', 'immunisation', 'immunize', 'vaccine', 'vaccination', 'shot'],
  ['withdraw', 'withdrawal', 'leave', 'notice', 'cancel'],
  ['fee', 'cost', 'price', 'pay', 'payment', 'tuition'],
  ['deposit', 'hold', 'secure'],
  ['waitlist', 'waiting'],
  ['late', 'pickup', 'pick'],
  ['sick', 'ill', 'illness', 'fever'],
  ['allergy', 'allergies', 'anaphylaxis', 'anaphylactic'],
];
const synonymsOf = (term: string): string[] => {
  const group = SYNONYMS.find((g) => g.some((w) => stem(w) === term));
  return group ? group.map(stem) : [term];
};

/** "enrol" matches "enrolment"; short words must match exactly. */
const termMatches = (term: string, token: string) =>
  token === term || (term.length >= 5 && token.length >= 5 && (token.startsWith(term) || term.startsWith(token)));

/**
 * BM25-style keyword score of each chunk (text + heading). Terms are stemmed and expanded with a few
 * child-care synonyms (a synonym counts half); words match by prefix (enrol ~ enrolment); heading
 * matches count double. Returns chunks with score > 0, best first.
 */
export function keywordSearch(
  question: string,
  chunks: StoredChunk[],
  limit: number
): (StoredChunk & { score: number; matchedTerms: number })[] {
  const asked = [...new Set(keywordTerms(question))];
  if (!asked.length || !chunks.length) return [];
  // Each asked term is a group: itself (weight 1) or a synonym (weight 0.5)
  const groups = asked.map((t) => ({ term: t, alts: synonymsOf(t).filter((s) => s !== t) }));
  const docs = chunks.map((c) => {
    const body = keywordTerms(c.text);
    const head = keywordTerms(c.heading);
    const tf = new Map<string, number>();
    for (const g of groups) {
      let f = 0;
      for (const [tokens, w] of [
        [body, 1],
        [head, 2],
      ] as const) {
        for (const tok of tokens) {
          if (termMatches(g.term, tok)) f += w;
          else if (g.alts.some((a) => termMatches(a, tok))) f += w * 0.5;
        }
      }
      if (f) tf.set(g.term, f);
    }
    return { c, tf, len: body.length + head.length };
  });
  const terms = asked;
  const avgLen = docs.reduce((n, d) => n + d.len, 0) / docs.length || 1;
  const df = new Map(terms.map((t) => [t, docs.filter((d) => d.tf.has(t)).length]));
  const k1 = 1.2;
  const b = 0.75;
  return docs
    .map(({ c, tf, len }) => {
      let score = 0;
      let matchedTerms = 0;
      for (const t of terms) {
        const f = tf.get(t) ?? 0;
        if (!f) continue;
        matchedTerms++;
        const idf = Math.log(1 + (docs.length - df.get(t)! + 0.5) / (df.get(t)! + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / avgLen)));
      }
      return { ...c, score, matchedTerms };
    })
    .filter((x) => x.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, limit);
}

const dot = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export function cosineSearch(queryVector: number[], chunks: StoredChunk[], limit: number): (StoredChunk & { score: number })[] {
  return chunks
    .filter((c) => c.embedding?.length === queryVector.length)
    .map((c) => ({ ...c, score: dot(queryVector, c.embedding!) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------------- Retrieve ----------------

/** Which chunks a question may see. */
export function inScope(c: Pick<StoredChunk, 'scope' | 'appliesToCentreIds'>, opts: RetrieveOptions): boolean {
  if (opts.scope && c.scope !== opts.scope) return false;
  const includeProvincial = opts.includeProvincial ?? true;
  if (c.scope === 'provincial') return includeProvincial;
  return !opts.centreId || c.appliesToCentreIds.includes(opts.centreId);
}

/** The same scope as an Atlas Vector Search pre-filter (fields: scope, appliesToCentreIds). */
export function vectorFilter(opts: RetrieveOptions): object | undefined {
  if (opts.scope === 'provincial') return { scope: 'provincial' };
  if (opts.scope === 'operator') return opts.centreId ? { appliesToCentreIds: opts.centreId } : { scope: 'operator' };
  const includeProvincial = opts.includeProvincial ?? true;
  if (!opts.centreId) return includeProvincial ? undefined : { scope: 'operator' };
  return includeProvincial
    ? { $or: [{ appliesToCentreIds: opts.centreId }, { scope: 'provincial' }] }
    : { appliesToCentreIds: opts.centreId };
}

const toPassage = (matchedBy: 'vector' | 'keyword') => (c: StoredChunk & { score: number }): RetrievedPassage => ({
  chunkId: c.chunkId,
  text: c.text,
  heading: c.heading,
  page: c.page,
  docTitle: c.docTitle,
  sourceUrl: c.sourceUrl,
  sourceNote: c.sourceNote,
  retrieved: c.retrieved,
  operatorId: c.operatorId,
  operatorName: c.operatorName,
  scope: c.scope,
  score: Number(c.score.toFixed(4)),
  matchedBy,
  ...(c.scope === 'provincial' ? { label: PROVINCIAL_LABEL } : {}),
});

export interface RetrieverDeps {
  source: ChunkSource;
  embed?: QueryEmbedder; // absent: no API key -> keyword search
  queryStore: QueryEmbeddingStore;
  log?: (msg: string) => void;
}

export async function retrieve(question: string, opts: RetrieveOptions, deps: RetrieverDeps): Promise<RetrievalResult> {
  const limit = opts.limit ?? 6;
  const log = deps.log ?? (() => {});
  const keyword = async (notice?: string): Promise<RetrievalResult> => {
    const chunks = (await deps.source.all().catch(() => [] as StoredChunk[])).filter((c) => inScope(c, opts));
    return { passages: keywordSearch(question, chunks, limit).map(toPassage('keyword')), method: 'keyword', notice, queryEmbeddingFromCache: false };
  };

  /**
   * Chunks stored without embeddings (e.g. the licensing manual before its embeddings exist) are
   * invisible to vector search: find them by keyword. Only clear matches (2+ question terms, or the
   * only term) are added, after the vector results.
   */
  const keywordOnly = async (): Promise<RetrievedPassage[]> => {
    const pending = (await deps.source.all().catch(() => [] as StoredChunk[])).filter((c) => inScope(c, opts) && !c.embedding?.length);
    if (!pending.length) return [];
    const needed = Math.min(2, new Set(keywordTerms(question)).size);
    return keywordSearch(question, pending, KEYWORD_ONLY_LIMIT)
      .filter((h) => h.matchedTerms >= needed)
      .map(toPassage('keyword'));
  };

  // 1. Query embedding: cache first, then Gemini
  const key = queryCacheKey(question);
  let vector = await deps.queryStore.get(key).catch(() => null);
  const fromCache = Boolean(vector);
  if (!vector) {
    if (!deps.embed) return keyword(BASIC_SEARCH_NOTICE);
    try {
      vector = await deps.embed(question);
      await deps.queryStore.set(key, question, vector).catch(() => {});
    } catch (e) {
      log(`[retrieval] query embedding unavailable (${(e as Error).message.slice(0, 120)}); keyword search`);
      return keyword(BASIC_SEARCH_NOTICE);
    }
  }

  // 2. Atlas Vector Search, else cosine over the chunks in memory
  if (deps.source.vectorSearch) {
    try {
      const hits = await deps.source.vectorSearch(vector, vectorFilter(opts), limit);
      return { passages: [...hits.map(toPassage('vector')), ...(await keywordOnly())], method: 'vector', queryEmbeddingFromCache: fromCache };
    } catch (e) {
      log(`[retrieval] vector search unavailable (${(e as Error).message.slice(0, 120)}); searching in memory`);
    }
  }
  const chunks = (await deps.source.all().catch(() => [] as StoredChunk[])).filter((c) => inScope(c, opts));
  if (!chunks.some((c) => c.embedding?.length)) return keyword();
  return {
    passages: [...cosineSearch(vector, chunks, limit).map(toPassage('vector')), ...(await keywordOnly())],
    method: 'vector-local',
    queryEmbeddingFromCache: fromCache,
  };
}
