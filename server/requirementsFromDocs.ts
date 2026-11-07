/**
 * Centre policy reader, from published documents: requirements (registration, admission, required
 * documents, waitlist rules) suggested from the centre's own retrieved chunks, each with a verbatim
 * quote (verified like Ask CareQ's citations), page and document title. The centre reviews, edits
 * and confirms; nothing is published until then.
 *
 *   4 fixed queries -> operator chunks for this centre (vector + keyword) -> Gemini (JSON schema)
 *     -> verifiedQuote per requirement -> drop unverified -> candidates
 *   fallback (no Gemini): requirement-like sentences from the same chunks (verbatim by construction)
 */
import { Type } from '@google/genai';
import { MAX_QUOTE_WORDS, pageOf, verifiedQuote } from './askAgent';
import { splitSentences } from './policyText';
import { RetrieverDeps, StoredChunk, keywordSearch, retrieve } from './retrieval';

export type RequirementCategory = 'registration' | 'admission' | 'documents' | 'waitlist';
export const REQUIREMENT_CATEGORIES: RequirementCategory[] = ['registration', 'admission', 'documents', 'waitlist'];

export const REQUIREMENT_QUERIES: { category: RequirementCategory; query: string }[] = [
  { category: 'registration', query: 'how to register or apply for a child care space, registration form' },
  { category: 'admission', query: 'admission requirements before the first day, admission package, enrolment' },
  { category: 'documents', query: 'documents parents must provide: immunization record, birth certificate, health form, emergency contacts' },
  { category: 'waitlist', query: 'waitlist policy: how spaces are offered, priority, how to stay on the waiting list' },
];
export const MAX_CHUNKS = 14;
export const MAX_REQUIREMENTS = 15;

export interface RequirementCandidate {
  requirement: string;
  category: RequirementCategory;
  /** Verbatim from the chunk, at most 25 words. */
  quote: string;
  chunkId: string;
  docKey: string;
  docTitle: string;
  /** "PDF p.N" or the HTML section heading. */
  page: string;
  sourceUrl: string | null;
  sourceNote: string | null;
}

/** The chunks the requirements are read from: this centre's operator chunks only (optionally one document). */
export async function gatherRequirementChunks(centreId: string, deps: RetrieverDeps, docKey?: string): Promise<StoredChunk[]> {
  const all = (await deps.source.all().catch(() => [] as StoredChunk[])).filter(
    (c) => c.scope === 'operator' && c.appliesToCentreIds.includes(centreId) && (!docKey || c.docKey === docKey)
  );
  if (!all.length) return [];
  const byId = new Map(all.map((c) => [c.chunkId, c]));
  const picked = new Map<string, StoredChunk>();
  for (const { query } of REQUIREMENT_QUERIES) {
    // Vector search where embeddings exist; keyword search always (uploaded chunks may have no embeddings)
    const vec = await retrieve(query, { centreId, scope: 'operator', limit: 4 }, deps).catch(() => null);
    for (const p of vec?.passages ?? []) {
      const c = byId.get(p.chunkId);
      if (c && !picked.has(c.chunkId)) picked.set(c.chunkId, c);
    }
    for (const c of keywordSearch(query, all, 3)) if (!picked.has(c.chunkId)) picked.set(c.chunkId, byId.get(c.chunkId)!);
  }
  return [...picked.values()].slice(0, MAX_CHUNKS);
}

const candidateFrom = (c: StoredChunk, requirement: string, category: RequirementCategory, quote: string): RequirementCandidate => ({
  requirement: requirement.trim().slice(0, 120),
  category,
  quote,
  chunkId: c.chunkId,
  docKey: c.docKey,
  docTitle: c.docTitle,
  page: pageOf(c),
  sourceUrl: c.sourceUrl,
  sourceNote: c.sourceNote,
});

// ---------------- AI ----------------

export const EXTRACT_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      requirement: { type: Type.STRING, description: 'Short title a parent can act on, e.g. "Immunization record".' },
      category: { type: Type.STRING, enum: REQUIREMENT_CATEGORIES },
      chunkId: { type: Type.STRING },
      quote: { type: Type.STRING, description: 'Exact words copied from that passage, at most 25 words.' },
    },
    required: ['requirement', 'category', 'chunkId', 'quote'],
  },
};

export const extractPrompt = (chunks: StoredChunk[]) => `From the centre's own published document passages below, list what a parent must do or provide to register, be admitted, or stay on the waitlist.

Rules:
- Use ONLY these passages. Never add requirements from general knowledge.
- One item per distinct requirement (documents, forms, steps, waitlist rules). At most ${MAX_REQUIREMENTS}.
- requirement: a short title (e.g. "Immunization record", "Child Admission Package", "Two weeks written withdrawal notice").
- quote: words copied exactly, character for character, from the passage with that chunkId; at most ${MAX_QUOTE_WORDS} words.
- Skip passages about fees, staff, programming or anything else.

Passages (JSON):
${JSON.stringify(chunks.map((c) => ({ chunkId: c.chunkId, heading: c.heading, text: c.text })))}`;

/** Keeps only items whose quote is verbatim in the chunk they name; trims long quotes; drops duplicates. */
export function verifyCandidates(raw: unknown, chunks: StoredChunk[]): RequirementCandidate[] {
  const byId = new Map(chunks.map((c) => [c.chunkId, c]));
  const out: RequirementCandidate[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(raw) ? raw : []) {
    const c = byId.get(String(item?.chunkId ?? ''));
    const title = typeof item?.requirement === 'string' ? item.requirement.trim() : '';
    const category = REQUIREMENT_CATEGORIES.includes(item?.category) ? (item.category as RequirementCategory) : 'documents';
    const quote = c && typeof item?.quote === 'string' ? verifiedQuote(item.quote, c.text) : null;
    if (!c || !title || !quote || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    out.push(candidateFrom(c, title, category, quote));
    if (out.length >= MAX_REQUIREMENTS) break;
  }
  return out;
}

// ---------------- Fallback (no AI) ----------------

const ASKS = /\b(must|required|requires?|need(s|ed)? to|please (provide|submit|complete|bring)|provide|submit|complete|mandatory|is necessary)\b/i;
const TOPICS: { re: RegExp; title: string; category: RequirementCategory }[] = [
  { re: /immuni[sz]ation|vaccin/i, title: 'Immunization record', category: 'documents' },
  { re: /birth certificate|proof of (age|birth)/i, title: 'Birth certificate or proof of age', category: 'documents' },
  { re: /admission package|enrol(l)?ment (form|package)|registration form|application form/i, title: 'Admission / registration forms', category: 'admission' },
  { re: /emergency contact/i, title: 'Emergency contact information', category: 'documents' },
  { re: /health (assessment|form|record)|medical (form|information)|doctor/i, title: 'Health information', category: 'documents' },
  { re: /allerg|anaphyla/i, title: 'Allergy information', category: 'documents' },
  { re: /proof of (address|residen)/i, title: 'Proof of address', category: 'documents' },
  { re: /wait ?list|waiting list/i, title: 'Waitlist rules', category: 'waitlist' },
  { re: /\bregist(er|ration)\b|\bapply\b/i, title: 'How to register', category: 'registration' },
  { re: /withdraw|notice/i, title: 'Withdrawal notice', category: 'admission' },
];

/** Requirement-like sentences from the chunks, with a title from a small topic list. Verbatim by construction. */
export function fallbackCandidates(chunks: StoredChunk[]): RequirementCandidate[] {
  const out: RequirementCandidate[] = [];
  const used = new Map<string, number>();
  for (const c of chunks) {
    for (const sentence of splitSentences(c.text.replace(/\s+/g, ' '))) {
      if (!ASKS.test(sentence)) continue;
      const topic = TOPICS.find((t) => t.re.test(sentence));
      if (!topic) continue;
      const n = used.get(topic.title) ?? 0;
      if (n >= 1 && topic.category !== 'waitlist') continue; // one quote per document topic
      if (n >= 2) continue;
      const quote = verifiedQuote(sentence.split(/\s+/).slice(0, MAX_QUOTE_WORDS + 5).join(' '), c.text);
      if (!quote) continue;
      used.set(topic.title, n + 1);
      out.push(candidateFrom(c, n ? `${topic.title} (${n + 1})` : topic.title, topic.category, quote));
      if (out.length >= MAX_REQUIREMENTS) return out;
    }
  }
  return out;
}
