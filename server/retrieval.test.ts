import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASIC_SEARCH_NOTICE,
  ChunkSource,
  MemoryQueryStore,
  StoredChunk,
  keywordSearch,
  normaliseQuestion,
  queryCacheKey,
  retrieve,
  stem,
  vectorFilter,
} from './retrieval';

const D = 768;
/** Unit vector pointing mostly along axis i. */
const axis = (i: number) => {
  const v = new Array(D).fill(0);
  v[i] = 1;
  return v;
};

const chunk = (id: string, over: Partial<StoredChunk>): StoredChunk => ({
  chunkId: id,
  docKey: 'doc',
  text: '',
  heading: '',
  page: 1,
  scope: 'operator',
  operatorId: 'op',
  operatorName: 'Operator',
  appliesToCentreIds: [],
  docTitle: 'Parent Handbook',
  sourceUrl: null,
  sourceNote: null,
  retrieved: null,
  embeddingModel: 'gemini-embedding-2',
  embeddingDimensions: D,
  createdAt: '',
  ...over,
});

const CHUNKS: StoredChunk[] = [
  chunk('jk#1', {
    operatorId: 'telccs',
    appliesToCentreIds: ['on-00576'],
    heading: 'CHILDREN’S IMMUNIZATION',
    text: 'Licensed child care centres are required to collect and retain up-to-date immunization for all children not attending school.',
    embedding: axis(0),
  }),
  chunk('jk#2', { operatorId: 'telccs', appliesToCentreIds: ['on-00576'], heading: 'FEES', text: 'Fees are paid monthly by pre-authorized debit.', embedding: axis(1) }),
  chunk('harmony#1', {
    operatorId: 'harmony',
    appliesToCentreIds: ['on-03394'],
    heading: 'HEALTH POLICY',
    text: 'Immunization Records must be on record, current and kept up-to-date for your child to attend.',
    embedding: axis(2),
  }),
  chunk('manual#1', {
    scope: 'provincial',
    operatorId: 'ontario-licensing-manual',
    heading: 'Part 11.6 Waiting Lists',
    text: 'A licensee that maintains a waiting list must have a written policy explaining how priority is determined; no fee may be charged to be placed on a waiting list.',
    embedding: axis(3),
  }),
];

const source = (opts: { vectorFails?: boolean } = {}): ChunkSource & { vectorCalls: number } => {
  const s = {
    vectorCalls: 0,
    all: async () => CHUNKS,
    vectorSearch: async (q: number[], filter: object | undefined, limit: number) => {
      s.vectorCalls++;
      if (opts.vectorFails) throw new Error('index not found');
      // Fake Atlas: honour the centre filter like the real pre-filter
      const centre = JSON.stringify(filter ?? {}).match(/"appliesToCentreIds":"([^"]+)"/)?.[1];
      return CHUNKS.filter((c) => !centre || c.scope === 'provincial' || c.appliesToCentreIds.includes(centre))
        .map((c) => ({ ...c, score: c.embedding!.reduce((n, x, i) => n + x * q[i], 0) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
  };
  return s;
};

test('questions that differ only in case/punctuation share one cache key', () => {
  assert.equal(normaliseQuestion("  What's the IMMUNIZATION policy?? "), 'whats the immunization policy');
  assert.equal(queryCacheKey('What is the immunization policy?'), queryCacheKey('what is the immunization policy'));
  assert.notEqual(queryCacheKey('immunization policy'), queryCacheKey('fee policy'));
});

test('stemming: plurals and -ation forms match', () => {
  assert.equal(stem('fees'), stem('fee'));
  assert.equal(stem('immunizations'), stem('immunization'));
  assert.equal(stem('policies'), stem('policy'));
  assert.equal(stem('lists'), stem('list'));
  assert.equal(stem('class'), 'class');
});

test('a repeated question uses the cached query embedding (no second Gemini call)', async () => {
  let calls = 0;
  const deps = { source: source(), queryStore: new MemoryQueryStore(), embed: async () => (calls++, axis(0)) };
  const first = await retrieve('What immunization records do I need?', { centreId: 'on-00576' }, deps);
  const again = await retrieve('what immunization records do I need', { centreId: 'on-00576' }, deps);
  assert.equal(calls, 1);
  assert.equal(first.queryEmbeddingFromCache, false);
  assert.equal(again.queryEmbeddingFromCache, true);
  assert.equal(again.method, 'vector');
  assert.equal(again.passages[0].chunkId, 'jk#1');
});

test('quota exhausted: keyword search over the chunks with the "basic search" notice (never throws)', async () => {
  const deps = {
    source: source(),
    queryStore: new MemoryQueryStore(),
    embed: async () => {
      throw new Error('429 RESOURCE_EXHAUSTED embed_content_free_tier_requests');
    },
  };
  const r = await retrieve('Which immunizations are required?', { centreId: 'on-00576' }, deps);
  assert.equal(r.method, 'keyword');
  assert.equal(r.notice, BASIC_SEARCH_NOTICE);
  assert.equal(r.passages[0].chunkId, 'jk#1');
  // Scope still applies: Harmony's handbook is not in Jesse Ketchum's answer
  assert.ok(!r.passages.some((p) => p.operatorId === 'harmony'));
});

test('no API key: keyword search with the notice', async () => {
  const r = await retrieve('waiting list fee', {}, { source: source(), queryStore: new MemoryQueryStore() });
  assert.equal(r.method, 'keyword');
  assert.equal(r.notice, BASIC_SEARCH_NOTICE);
  assert.equal(r.passages[0].chunkId, 'manual#1');
});

test('vector index unavailable: cosine search in memory, same scope', async () => {
  const src = source({ vectorFails: true });
  const r = await retrieve('immunization', { centreId: 'on-03394' }, { source: src, queryStore: new MemoryQueryStore(), embed: async () => axis(2) });
  assert.equal(src.vectorCalls, 1);
  assert.equal(r.method, 'vector-local');
  assert.equal(r.notice, undefined);
  assert.equal(r.passages[0].chunkId, 'harmony#1');
  assert.ok(r.passages.every((p) => p.operatorId === 'harmony' || p.scope === 'provincial'));
});

test('scope filter: centre handbook + provincial; provincial can be excluded', () => {
  assert.deepEqual(vectorFilter({ centreId: 'on-00576' }), { $or: [{ appliesToCentreIds: 'on-00576' }, { scope: 'provincial' }] });
  assert.deepEqual(vectorFilter({ centreId: 'on-00576', includeProvincial: false }), { appliesToCentreIds: 'on-00576' });
  assert.equal(vectorFilter({}), undefined);
});

test('keyword search ranks heading matches and ignores stopwords', () => {
  const hits = keywordSearch('How do the fees work?', CHUNKS, 3);
  assert.equal(hits[0].chunkId, 'jk#2');
  assert.deepEqual(keywordSearch('the and of', CHUNKS, 3), []);
});

// ---- Provincial chunks stored without embeddings (quota) ----

const PENDING: StoredChunk[] = [
  ...CHUNKS.filter((c) => c.scope === 'operator'),
  chunk('manual#waitlist', {
    scope: 'provincial',
    operatorId: 'ontario-licensing-manual',
    docTitle: 'Child Care Centre Licensing Manual',
    heading: 'Part 11.6 Waiting Lists',
    text: 'A licensee must not charge a fee to place a child on a waiting list, and must have a written waiting list policy.',
    embedding: null,
  }),
];
const pendingSource = (): ChunkSource => ({
  all: async () => PENDING,
  // Atlas only returns chunks that have a vector
  vectorSearch: async (q, _f, limit) =>
    PENDING.filter((c) => c.embedding?.length && c.appliesToCentreIds.includes('on-00576'))
      .map((c) => ({ ...c, score: c.embedding!.reduce((n, x, i) => n + x * q[i], 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit),
});

test('chunks without embeddings: operator handbook by vector, provincial by keyword, labelled', async () => {
  const r = await retrieve('Can the centre charge a fee for the waiting list?', { centreId: 'on-00576' }, {
    source: pendingSource(),
    queryStore: new MemoryQueryStore(),
    embed: async () => axis(1),
  });
  assert.equal(r.method, 'vector');
  assert.equal(r.notice, undefined, 'no "basic search" notice: the AI search worked');
  assert.equal(r.passages[0].chunkId, 'jk#2');
  assert.equal(r.passages[0].matchedBy, 'vector');
  assert.equal(r.passages[0].label, undefined);
  const prov = r.passages.find((p) => p.chunkId === 'manual#waitlist');
  assert.ok(prov, 'provincial chunk found by keyword');
  assert.equal(prov.matchedBy, 'keyword');
  assert.equal(prov.label, 'General Ontario rule; check with the centre.');
  assert.equal(new Set(r.passages.map((p) => p.chunkId)).size, r.passages.length, 'no duplicates');
});

test('chunks without embeddings: an unrelated question does not pull in provincial passages', async () => {
  const r = await retrieve('What happens on snow days?', { centreId: 'on-00576' }, {
    source: pendingSource(),
    queryStore: new MemoryQueryStore(),
    embed: async () => axis(0),
  });
  assert.ok(!r.passages.some((p) => p.scope === 'provincial'));
});

test('once provincial chunks have embeddings they are found by vector search (automatic switch)', async () => {
  const r = await retrieve('waiting list policy', { centreId: 'on-00576' }, { source: source(), queryStore: new MemoryQueryStore(), embed: async () => axis(3) });
  const prov = r.passages.find((p) => p.chunkId === 'manual#1');
  assert.equal(prov?.matchedBy, 'vector');
  assert.equal(prov?.label, 'General Ontario rule; check with the centre.');
});
