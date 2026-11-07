/**
 * Settings shared by the index build (scripts/build-index.ts) and retrieval (server/retrieval.ts).
 * Changing the model or dimensions means rebuilding the index (npm run build:index).
 */
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-2';
export const EMBED_DIMENSIONS = 768;
export const VECTOR_INDEX_NAME = 'policy_chunks_vector';
export const POLICY_CHUNKS = 'policyChunks';
export const QUERY_EMBEDDINGS = 'queryEmbeddings';

/** One retrieval passage, as stored in MongoDB policyChunks and in data/index/policyChunks.json. */
export interface PolicyChunk {
  chunkId: string;
  docKey: string;
  text: string;
  heading: string;
  /** PDF page the passage starts on; null for HTML documents. */
  page: number | null;
  /**
   * Unit-length vector, or null when the chunk couldn't be embedded yet (e.g. quota): such chunks
   * are found by keyword search only, and the next npm run build:index retries them.
   */
  embedding: number[] | null;
  scope: 'operator' | 'provincial';
  operatorId: string;
  operatorName: string;
  /** Centres the operator's handbook applies to (empty for provincial documents). */
  appliesToCentreIds: string[];
  docTitle: string;
  sourceUrl: string | null;
  sourceNote: string | null;
  retrieved: string | null;
  embeddingModel: string;
  embeddingDimensions: number;
  createdAt: string;
}

/** Unit-length vector (cosine similarity = dot product). */
export const normalise = (v: number[]) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => Number((x / n).toFixed(6)));
};
