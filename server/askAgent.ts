/**
 * Ask CareQ: a small Gemini function-calling agent with exactly two tools.
 *
 *   question ──► Gemini ──► search_documents(query)   (centreId injected by the server, never the model)
 *                   │   └─► get_my_application()      (signed-in parent, current centre only)
 *                   ▼  (max 2 tool calls, 15 s in total)
 *            JSON sentences + {chunkId, quote} ──► verify every quote verbatim ──► drop unsupported
 *            sentences ──► server writes application facts itself ──► answer + citations
 *
 * If Gemini fails or runs out of time: the top 2 passages, under "Here's what the handbook says:".
 * Rules that never depend on the model: no position / wait / availability unless the parent's
 * own application returned it (then "reported by … on …", "Simulated"); provincial passages carry
 * "General Ontario rule; check with the centre."; nothing relevant -> NO_INFO exactly.
 */
import type { Content, FunctionCall, FunctionDeclaration, GenerateContentConfig } from '@google/genai';
import { HELP_FAQS } from '../src/data/helpData';
import { BF_TORONTO_OPERATOR_ID, BF_TORONTO_SOURCE_NOTE } from '../src/data/policyCoverage';
import { estimateLine, reportedLine } from '../src/lib/simulated';
import {
  BASIC_SEARCH_NOTICE,
  PROVINCIAL_LABEL,
  RetrievalResult,
  RetrievedPassage,
  RetrieverDeps,
  StoredChunk,
  keywordHits,
  keywordSearch,
  keywordTerms,
  normaliseQuestion,
  retrieve,
} from './retrieval';

export const NO_INFO = "I don't have that information; please contact the centre or use Help.";
export const FALLBACK_HEADING = "Here's what the handbook says:";
export const MAX_TOOL_CALLS = 2;
export const ASK_DEADLINE_MS = 15_000;
export const ASK_TOP = 4;
export const MAX_QUOTE_WORDS = 25;
/** A single word proves nothing; 2 words keeps table cells such as "Toddler 1:5". */
export const MIN_QUOTE_WORDS = 2;

/**
 * Relevance floors on the Atlas vectorSearchScore scale ((1 + cosine) / 2). Calibrated on
 * 2026-11-07 against careq_dev: relevant handbook passages scored 0.838–0.884, the best match for a
 * question the handbook doesn't cover ("swimming lessons") 0.812; clearly relevant manual passages
 * 0.88–0.92, loosely related ones 0.82–0.83.
 */
export const OPERATOR_MIN_SCORE = 0.82;
export const PROVINCIAL_MIN_SCORE = 0.85;
/**
 * With a centre, up to this many slots go to clear keyword matches in that centre's own handbook.
 * Its embedding scores sit in a narrow band (0.79–0.85 in the 2026-11-08 debug runs), so a short query
 * like "registration documents" left every passage just under 0.82, and the section that answers
 * "What documents do I need to register?" (ADMISSION PROCEDURES) wasn't in the vector top 4 at all.
 * Every sentence still needs a verbatim quote from a passage that was retrieved.
 */
export const OPERATOR_KEYWORD_SLOTS = 2;

/** ASK_DEBUG=1: log retrieval scores, the model's raw sentences/quotes and why each source was dropped. */
const askDebug = (...args: unknown[]) => {
  if (process.env.ASK_DEBUG === '1') console.log('[ask-debug]', ...args);
};
const short = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n)}…` : s);

// ---------------- Types ----------------

export type AskScope = 'operator' | 'provincial' | 'help';
export type AskPassage = Omit<RetrievedPassage, 'scope'> & { scope: AskScope };
export type RetrievalMode = RetrievalResult['method'] | 'none';

export interface AppFact {
  childName: string;
  centreName: string;
  status: string;
  position: number | null;
  reportedBy: string | null;
  reportedDate: string | null;
  estimate: string | null;
  simulated: boolean;
}

export interface Citation {
  kind: 'document' | 'application';
  chunkId?: string;
  scope?: AskScope;
  operatorName: string;
  docTitle: string;
  /** "PDF p.N", or the section heading for HTML documents and Help answers. */
  page: string;
  sourceUrl: string | null;
  sourceNote: string | null;
  /** ≤ 25 words, verified verbatim in the retrieved passage (application: the server-written line). */
  quote: string;
  label?: string;
  simulated?: boolean;
}

export interface AskResult {
  answer: string;
  citations: Citation[];
  toolsUsed: string[];
  retrievalMode: RetrievalMode;
  /** rule = answered by the server without Gemini (position / wait / availability questions). */
  aiMode: 'gemini' | 'fallback' | 'rule';
  modelUsed: string | null;
  fallbackReason?: 'timeout' | 'error';
  notice?: string;
}

export interface AskContext {
  question: string;
  /** From the request (the centre page the user is on). The model can never change it. */
  centreId?: string;
  deps: RetrieverDeps;
  /** Present only for a signed-in parent with a centre: their applications there. */
  getApplications?: () => Promise<AppFact[]>;
}

export interface ModelResponse {
  functionCalls?: FunctionCall[];
  text?: string;
  candidates?: { content?: Content }[];
}
/** One Gemini call (main model, then backup); must give up by `deadline` (epoch ms). */
export type AskModelCall = (
  params: { contents: Content[]; config: GenerateContentConfig },
  deadline: number
) => Promise<{ response: ModelResponse; modelUsed: string }>;

// ---------------- Question guards ----------------

/** "Is there a space next week?": CareQ never answers availability. */
export const AVAILABILITY_Q =
  /\b(is|are) there (a |any )?(space|spot|place|opening|vacanc)|\b(space|spot|place|opening|vacanc\w*)s? (available|open|free)\b|\bavailab\w* (next|this)\b|\bnext (week|month)\b.*\b(space|spot|place|opening)|\b(space|spot|place|opening)s?\b.*\bnext (week|month)\b/i;
/** "Where am I on the list?" */
export const POSITION_Q =
  /\bwhere am i\b|\bmy (position|place|spot|number|rank|status)\b|\bhow far (down|up)\b|\b(what|which) (position|number) am i\b|\bam i on the (wait ?)?list\b/i;
/** "When will I get a spot?" */
export const WHEN_Q = /\bwhen (will|would|do|can|might) (i|we|my \w+) (get|have|receive|be offered)\b|\bhow long (will|would|do|until) (i|we)\b/i;
/** A sentence that states a position, wait or availability (only allowed from the parent's application). */
export const WAIT_CLAIM =
  /#\s?\d|\b(you are|you're|your child is)\b.*\b(position|number|\d+(st|nd|rd|th))\b|\b(space|spot|place|opening|vacanc\w*)s? (is|are|will be) (available|open)\b|\b\d+\s*(day|week|month|year)s?\b.*\b(wait|waitlist|waiting)\b|\b(wait|waitlist|waiting)\b.*\b\d+\s*(day|week|month|year)s?\b/i;

const personalQuestion = (q: string) => POSITION_Q.test(q) || WHEN_Q.test(q);

/** "How long is the wait?", "how many families are ahead of us?" */
const WAIT_Q = /\bhow long (is|will be) (the|my|our) wait|\bwait(ing)? time\b|\b(people|children|kids|families) ahead\b|\bam i next\b/i;

/**
 * Questions about the user's own position, list place, wait, spot or availability. These are
 * answered by the server without Gemini (answerQueueQuestion). Narrower than UNCACHEABLE_Q, so
 * "How does the waitlist work?" still goes to the handbook.
 */
export const isQueueQuestion = (q: string) => personalQuestion(q) || AVAILABILITY_Q.test(q) || WAIT_Q.test(q);

// ---------------- Retrieval rules ----------------

const HELP_CHUNKS: StoredChunk[] = HELP_FAQS.map((f) => ({
  chunkId: `help#${f.id}`,
  docKey: 'careq-help',
  text: f.answer,
  heading: f.question,
  page: null,
  embedding: null,
  scope: 'operator', // keywordSearch ignores scope; replaced by 'help' below
  operatorId: 'careq',
  operatorName: 'CareQ',
  appliesToCentreIds: [],
  docTitle: 'Help FAQ',
  sourceUrl: null,
  sourceNote: 'In the Help tab',
  retrieved: null,
  embeddingModel: '',
  embeddingDimensions: 0,
  createdAt: '',
}));

/**
 * Help FAQ answers by keyword (scope "help"): at least half of the question's terms, and 2+ (or the
 * only one), must match, so "waiting list policy" doesn't pull in the FAQ about intake lists.
 */
export function searchHelp(question: string, limit = 2): AskPassage[] {
  const n = new Set(keywordTerms(question)).size;
  const needed = Math.max(Math.min(2, n), Math.ceil(n / 2));
  return keywordSearch(question, HELP_CHUNKS, limit)
    .filter((h) => h.matchedTerms >= needed)
    .map((h) => ({
      chunkId: h.chunkId,
      text: h.text,
      heading: h.heading,
      page: null,
      docTitle: h.docTitle,
      sourceUrl: null,
      sourceNote: h.sourceNote,
      retrieved: null,
      operatorId: h.operatorId,
      operatorName: h.operatorName,
      scope: 'help' as const,
      score: Number(h.score.toFixed(4)),
      matchedBy: 'keyword' as const,
    }));
}

/** Scores on one scale: in-memory cosine search returns the raw cosine, Atlas returns (1 + cos) / 2. */
const vectorScore = (p: RetrievedPassage, method: RetrievalResult['method']) => (method === 'vector-local' ? (1 + p.score) / 2 : p.score);

const passesOperator = (p: RetrievedPassage, method: RetrievalResult['method']) =>
  p.matchedBy === 'keyword' || vectorScore(p, method) >= OPERATOR_MIN_SCORE;

/** Provincial passages must clearly match: vector score, or (keyword search) 2+ distinct question terms. */
const passesProvincial = (question: string, p: RetrievedPassage, method: RetrievalResult['method']) => {
  if (p.matchedBy === 'vector') return vectorScore(p, method) >= PROVINCIAL_MIN_SCORE;
  const words = new Set(keywordTerms(`${p.heading} ${p.text}`));
  return [...new Set(keywordTerms(question))].filter((t) => words.has(t)).length >= 2;
};

/**
 * With a centre: that centre's operator passages first, plus at most 1 provincial passage, only if
 * it passes its threshold and beats the best operator passage. Without a centre: provincial
 * passages + the CareQ Help FAQ. Top 4 either way.
 */
export async function retrieveForAsk(
  question: string,
  centreId: string | undefined,
  deps: RetrieverDeps
): Promise<{ passages: AskPassage[]; mode: RetrievalResult['method']; notice?: string }> {
  if (centreId) {
    const [op, prov, kw] = await Promise.all([
      retrieve(question, { centreId, scope: 'operator', limit: ASK_TOP }, deps),
      retrieve(question, { scope: 'provincial', limit: 1 }, deps),
      keywordHits(question, { centreId, scope: 'operator' }, deps, OPERATOR_KEYWORD_SLOTS).catch(() => [] as RetrievedPassage[]),
    ]);
    const vectorOps = op.passages.filter((p) => passesOperator(p, op.method));
    // Keyword matches the vector search missed get reserved slots; vector passages fill the rest
    const extra = kw.filter((k) => !vectorOps.some((v) => v.chunkId === k.chunkId));
    // Order: best vector passage, keyword additions, other vector passages (a provincial passage replaces the last)
    const ops = [...vectorOps.slice(0, 1), ...extra, ...vectorOps.slice(1, ASK_TOP - extra.length)];
    for (const k of kw) askDebug(`  operator ${k.chunkId} keyword score ${k.score.toFixed(2)} ${extra.includes(k) ? 'added' : 'already found'} · ${short(k.heading, 60)}`);
    for (const p of op.passages)
      askDebug(`  operator ${p.chunkId} ${p.matchedBy} score ${vectorScore(p, op.method).toFixed(3)} ${passesOperator(p, op.method) ? 'kept' : `below ${OPERATOR_MIN_SCORE}`} · ${short(p.heading, 60)}`);
    const top = prov.passages[0];
    if (top) askDebug(`  provincial ${top.chunkId} ${top.matchedBy} score ${vectorScore(top, prov.method).toFixed(3)} ${passesProvincial(question, top, prov.method) ? 'passes' : 'fails'} threshold`);
    let provincial: RetrievedPassage | undefined;
    if (top && passesProvincial(question, top, prov.method)) {
      const comparable = top.matchedBy === 'vector' && ops[0]?.matchedBy === 'vector';
      if (!ops.length || (comparable && vectorScore(top, prov.method) > vectorScore(ops[0], op.method))) provincial = top;
    }
    const passages: AskPassage[] = [...ops.slice(0, provincial ? ASK_TOP - 1 : ASK_TOP), ...(provincial ? [provincial] : [])];
    return { passages, mode: op.method, notice: op.notice ?? prov.notice };
  }
  const prov = await retrieve(question, { scope: 'provincial', limit: ASK_TOP }, deps);
  const provincial = prov.passages.filter((p) => passesProvincial(question, p, prov.method));
  return { passages: [...searchHelp(question), ...provincial].slice(0, ASK_TOP), mode: prov.method, notice: prov.notice };
}

// ---------------- Citations & quote verification ----------------

/** Comparable form of a quote: same characters, ignoring case, spacing, curly quotes and dash kinds. */
export const normaliseQuote = (s: string) =>
  s
    .normalize('NFKC')
    .replace(/[‘’ʼ′`]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'.…\s]+|["'.…,;:\s]+$/g, '')
    .toLowerCase();

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** True when the quote is 2–25 words and appears verbatim (after normaliseQuote) in the text. */
export function quoteIsVerbatim(quote: string, text: string): boolean {
  const q = normaliseQuote(quote);
  const n = wordCount(q);
  if (n < MIN_QUOTE_WORDS || n > MAX_QUOTE_WORDS) return false;
  return normaliseQuote(text).includes(q);
}

/**
 * The quote to show for a citation, or null if it isn't in the passage. A verbatim quote longer
 * than 25 words is cut to its first 25 words + "…" (still word for word from the passage).
 */
export function verifiedQuote(quote: string, text: string): string | null {
  const words = quote.trim().split(/\s+/).filter(Boolean);
  if (words.length <= MAX_QUOTE_WORDS) return quoteIsVerbatim(quote, text) ? quote.trim() : null;
  if (!normaliseQuote(text).includes(normaliseQuote(quote))) return null;
  return `${words.slice(0, MAX_QUOTE_WORDS).join(' ').replace(/[,;:—–-]+$/, '')}…`;
}

export const pageOf = (p: Pick<AskPassage, "page" | "heading" | "operatorId">) => {
  const page = p.page != null ? `PDF p.${p.page}` : p.heading;
  return p.operatorId === BF_TORONTO_OPERATOR_ID ? `${page} ${BF_TORONTO_SOURCE_NOTE}` : page;
};

export const citationFor = (p: AskPassage, quote: string): Citation => ({
  kind: 'document',
  chunkId: p.chunkId,
  scope: p.scope,
  operatorName: p.operatorName,
  docTitle: p.docTitle,
  page: pageOf(p),
  sourceUrl: p.sourceUrl,
  sourceNote: p.sourceNote,
  quote: quote.trim(),
  ...(p.scope === 'provincial' ? { label: PROVINCIAL_LABEL } : {}),
});

/** First n words of a passage (a verbatim excerpt, for the fallback). */
export const excerpt = (text: string, n: number) => {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  return words.length <= n ? words.join(' ') : `${words.slice(0, n).join(' ')}…`;
};

// ---------------- Application facts (written by the server, never the model) ----------------

export function applicationLines(a: AppFact): string[] {
  const lines = [`${a.childName}'s application at ${a.centreName}: ${a.status}.`];
  if (a.position != null) {
    const by = a.reportedBy || a.centreName;
    const date = a.reportedDate || 'date not given';
    lines.push(`Position #${a.position}. ${a.simulated ? reportedLine(by, date) : `Reported by ${by} · ${date}`}.`);
  } else {
    lines.push('No queue position reported by the centre yet.');
  }
  if (a.estimate) lines.push(`${a.simulated ? estimateLine(a.estimate) : `Centre's estimate: ${a.estimate}, not a guarantee`}.`);
  return lines;
}

const applicationCitation = (a: AppFact, lines: string[]): Citation => ({
  kind: 'application',
  operatorName: a.centreName,
  docTitle: 'Your application',
  page: '',
  sourceUrl: null,
  sourceNote: null,
  quote: lines.join(' '),
  simulated: a.simulated,
});

// ---------------- Post-processing ----------------

/** Why a model source was rejected (ASK_DEBUG), or the verified citation. */
export type SourceCheck = { citation: Citation } | { reason: 'no source' | 'wrong chunk' | 'too short' | 'too long' | 'quote not found' };

export function checkSource(src: { chunkId?: string; quote?: string }, passages: Map<string, AskPassage>): SourceCheck {
  if (!src?.chunkId || typeof src.quote !== 'string' || !src.quote.trim()) return { reason: 'no source' };
  const p = passages.get(src.chunkId);
  if (!p) return { reason: 'wrong chunk' };
  const quote = verifiedQuote(src.quote, p.text);
  if (quote) return { citation: citationFor(p, quote) };
  const n = wordCount(normaliseQuote(src.quote));
  if (n < MIN_QUOTE_WORDS) return { reason: 'too short' };
  if (n > MAX_QUOTE_WORDS && !normaliseQuote(p.text).includes(normaliseQuote(src.quote))) return { reason: 'quote not found' };
  return { reason: n > MAX_QUOTE_WORDS ? 'too long' : 'quote not found' };
}

export interface ModelSentence {
  text: string;
  sources?: { chunkId?: string; quote?: string }[];
  fromApplication?: boolean;
}

/** Lenient: the model's JSON may come in a ```json fence or with text around it. */
export function parseModelAnswer(text: string | undefined): ModelSentence[] | null {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (obj?.noInformation === true) return [];
    if (!Array.isArray(obj?.sentences)) return null;
    return obj.sentences
      .filter((s: any) => typeof s?.text === 'string' && s.text.trim())
      .map((s: any) => ({
        text: String(s.text).trim().slice(0, 600),
        sources: Array.isArray(s.sources) ? s.sources.slice(0, 4) : [],
        fromApplication: s.fromApplication === true,
      }));
  } catch {
    return null;
  }
}

/**
 * Keeps only what the tool results support: each citation's quote must be verbatim in the chunk it
 * names (a chunk that was actually retrieved); sentences left without a citation are dropped;
 * position / wait / availability only from the parent's application, in the server's own words.
 */
export function finaliseAnswer(
  question: string,
  sentences: ModelSentence[],
  passages: Map<string, AskPassage>,
  apps: AppFact[] | null
): { answer: string; citations: Citation[] } {
  if (AVAILABILITY_Q.test(question)) return { answer: NO_INFO, citations: [] };
  const hasApps = Boolean(apps?.length);
  if (personalQuestion(question) && !hasApps) return { answer: NO_INFO, citations: [] };

  const kept: string[] = [];
  const citations: Citation[] = [];
  const seen = new Set<string>();
  let wantsApplication = personalQuestion(question);
  for (const s of sentences) {
    if (s.fromApplication) {
      wantsApplication = true; // replaced by the server-written lines below
      continue;
    }
    if (WAIT_CLAIM.test(s.text)) {
      askDebug(`  dropped (wait claim): ${short(s.text)}`);
      continue;
    }
    const valid: Citation[] = [];
    const reasons: string[] = [];
    for (const src of s.sources ?? []) {
      const r = checkSource(src, passages);
      if ('citation' in r) valid.push(r.citation);
      else reasons.push(`${r.reason} (${src?.chunkId ?? '-'}: "${short(String(src?.quote ?? ''), 80)}")`);
    }
    if (!valid.length) {
      askDebug(`  dropped: ${short(s.text)} · ${reasons.length ? reasons.join('; ') : 'no source'}`);
      continue;
    }
    askDebug(`  kept: ${short(s.text)} · ${valid.length} verified quote(s)`);
    kept.push(s.text);
    for (const c of valid) {
      const key = `${c.chunkId}|${normaliseQuote(c.quote)}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push(c);
      }
    }
  }

  const appParts: string[] = [];
  const appCitations: Citation[] = [];
  if (wantsApplication && hasApps) {
    for (const a of apps!) {
      const lines = applicationLines(a);
      appParts.push(lines.join(' '));
      appCitations.push(applicationCitation(a, lines));
    }
  }
  if (!kept.length && !appParts.length) return { answer: NO_INFO, citations: [] };
  // When earlier sentences were dropped, don't start with "Additionally," / "Also," …
  if (kept.length) kept[0] = kept[0].replace(/^(additionally|also|however|furthermore|in addition|moreover),\s*(\w)/i, (_m, _w, c: string) => c.toUpperCase());
  const provincial = citations.some((c) => c.scope === 'provincial');
  const answer = [...appParts, kept.join(' '), provincial ? PROVINCIAL_LABEL : ''].filter(Boolean).join('\n\n');
  return { answer, citations: [...appCitations, ...citations] };
}

// ---------------- Non-AI fallback ----------------

export async function askFallback(
  ctx: AskContext,
  reason: 'timeout' | 'error',
  known?: { passages: AskPassage[]; mode: RetrievalMode; notice?: string; apps?: AppFact[] | null }
): Promise<AskResult> {
  const base = { aiMode: 'fallback' as const, modelUsed: null, fallbackReason: reason };
  const q = ctx.question;
  if (AVAILABILITY_Q.test(q)) return { ...base, answer: NO_INFO, citations: [], toolsUsed: [], retrievalMode: known?.mode ?? 'none' };
  if (personalQuestion(q)) {
    const apps = known?.apps ?? (ctx.getApplications ? await ctx.getApplications().catch(() => []) : []);
    const used = ctx.getApplications ? ['get_my_application'] : [];
    if (!apps.length) return { ...base, answer: NO_INFO, citations: [], toolsUsed: used, retrievalMode: 'none' };
    const { answer, citations } = finaliseAnswer(q, [], new Map(), apps);
    return { ...base, answer, citations, toolsUsed: used, retrievalMode: 'none' };
  }
  const found = known?.passages.length ? known : await retrieveForAsk(q, ctx.centreId, ctx.deps).catch(() => null);
  const top = (found?.passages ?? []).slice(0, 2);
  const mode = (found?.mode ?? 'none') as RetrievalMode;
  const notice = mode === 'keyword' ? BASIC_SEARCH_NOTICE : undefined;
  if (!top.length) return { ...base, answer: NO_INFO, citations: [], toolsUsed: ['search_documents'], retrievalMode: mode, notice };
  const citations = top.map((p) => citationFor(p, excerpt(p.text, MAX_QUOTE_WORDS).replace(/…$/, '')));
  const body = top.map((p) => `“${excerpt(p.text, 60)}”\n— From ${p.operatorName}'s ${p.docTitle}, ${pageOf(p)}`);
  const provincial = top.some((p) => p.scope === 'provincial');
  const answer = [FALLBACK_HEADING, ...body, provincial ? PROVINCIAL_LABEL : ''].filter(Boolean).join('\n\n');
  return { ...base, answer, citations, toolsUsed: ['search_documents'], retrievalMode: mode, notice };
}

// ---------------- The agent ----------------

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'search_documents',
    description:
      "Search the published documents for this question: the current centre's operator handbook (when the user is on a centre page), Ontario's Child Care Centre Licensing Manual, and the CareQ Help FAQ. Returns passages with a chunkId.",
    parametersJsonSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to look for, in plain words.' } },
      required: ['query'],
    },
  },
  {
    name: 'get_my_application',
    description:
      "The signed-in parent's own application(s) at the current centre: status, queue position, who reported it and when, the centre's estimate, and whether it is simulated. Returns nothing for anonymous users or centre accounts.",
    parametersJsonSchema: { type: 'object', properties: {} },
  },
];

export const SYSTEM_INSTRUCTION = `You are Ask CareQ, a help assistant for Ontario child care in the CareQ prototype.

Rules:
- Use ONLY the results of your tools. Never use your own knowledge. Call search_documents before answering any question about rules, documents, fees, withdrawal, immunization or waitlists.
- For questions about the user's own application, position, wait or spot, call get_my_application. Never state or estimate a position, wait time or availability yourself; if get_my_application returns it, write one sentence with "fromApplication": true and the server will fill in the exact reported facts.
- Every other sentence must have at least one source: the chunkId of a passage you were given and an exact quote copied character for character from that passage, at most 25 words.
- Short, plain language (1–4 sentences). No legal advice. Never rank or compare families or centres.
- If the first search doesn't answer the question, search again with different words (e.g. "admission package", "enrolment forms"; at most 2 searches in total).
- If the passages still don't answer the question, reply {"noInformation": true}.

Final reply: JSON only, no other text:
{"sentences":[{"text":"…","sources":[{"chunkId":"…","quote":"…"}],"fromApplication":false}]}`;

class AskTimeout extends Error {}

const withDeadline = <T>(p: Promise<T>, deadline: number): Promise<T> => {
  const ms = deadline - Date.now();
  if (ms <= 0) return Promise.reject(new AskTimeout('Ask CareQ ran out of time'));
  let t: NodeJS.Timeout | undefined;
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      t = setTimeout(() => reject(new AskTimeout('Ask CareQ ran out of time')), ms);
    }),
  ]).finally(() => clearTimeout(t));
};

/** The model only sees what it needs to answer and cite. */
const passageForModel = (p: AskPassage) => ({
  chunkId: p.chunkId,
  source: `${p.operatorName}, ${p.docTitle}, ${pageOf(p)}`,
  ...(p.scope === 'provincial' ? { note: PROVINCIAL_LABEL } : {}),
  heading: p.heading,
  text: p.text,
});

/**
 * Position / list / wait / spot / availability questions, without the model: the exact refusal for
 * anonymous users, centre accounts and parents with no application at this centre; otherwise the
 * server-written application lines ("From your application · Simulated"). Null for other questions.
 */
export async function answerQueueQuestion(ctx: AskContext): Promise<AskResult | null> {
  if (!isQueueQuestion(ctx.question)) return null;
  const base = { toolsUsed: [] as string[], retrievalMode: 'none' as const, aiMode: 'rule' as const, modelUsed: null };
  if (!ctx.getApplications) return { ...base, answer: NO_INFO, citations: [] };
  const apps = await ctx.getApplications().catch(() => [] as AppFact[]);
  const toolsUsed = ['get_my_application'];
  if (!apps.length) return { ...base, toolsUsed, answer: NO_INFO, citations: [] };
  const lines = apps.map(applicationLines);
  return { ...base, toolsUsed, answer: lines.map((l) => l.join(' ')).join('\n\n'), citations: apps.map((a, i) => applicationCitation(a, lines[i])) };
}

export async function runAskAgent(ctx: AskContext, model: AskModelCall, deadlineMs = ASK_DEADLINE_MS): Promise<AskResult> {
  const rule = await answerQueueQuestion(ctx);
  if (rule) return rule;
  const deadline = Date.now() + deadlineMs;
  const passages = new Map<string, AskPassage>();
  const toolsUsed: string[] = [];
  // Set by the tools (an object, so TypeScript doesn't narrow what the closure assigns)
  const st: { mode: RetrievalMode; notice?: string; apps: AppFact[] | null } = { mode: 'none', apps: null };
  let toolCalls = 0;
  const toolCallNames: string[] = [];
  let modelUsed: string | null = null;

  const runTool = async (call: FunctionCall): Promise<object> => {
    if (!toolsUsed.includes(call.name ?? '')) toolsUsed.push(call.name ?? '');
    if (call.name === 'search_documents') {
      const query = typeof call.args?.query === 'string' && call.args.query.trim() ? call.args.query.slice(0, 300) : ctx.question;
      // Scope comes from the request (ctx.centreId); any centre the model names is ignored.
      askDebug(`search_documents("${query}") centre ${ctx.centreId ?? '-'}`);
      const r = await withDeadline(retrieveForAsk(query, ctx.centreId, ctx.deps), deadline);
      askDebug(`  -> ${r.mode}: ${r.passages.map((p) => p.chunkId).join(', ') || 'no passages'}`);
      if (st.mode === 'none' || r.mode === 'keyword') st.mode = r.mode;
      st.notice = st.notice ?? r.notice;
      for (const p of r.passages) passages.set(p.chunkId, p);
      return r.passages.length ? { passages: r.passages.map(passageForModel) } : { passages: [], note: 'No relevant passages found.' };
    }
    if (call.name === 'get_my_application') {
      if (!ctx.getApplications) return { available: false, reason: 'Not available: the user is not a signed-in parent on a centre page.' };
      const apps = await withDeadline(ctx.getApplications(), deadline);
      st.apps = apps;
      if (!apps.length) return { available: false, reason: 'No application at this centre.' };
      return { available: true, applications: apps };
    }
    return { error: `Unknown tool ${call.name}` };
  };

  const contents: Content[] = [
    { role: 'user', parts: [{ text: `${ctx.centreId ? 'The user is on a centre page; search_documents covers that centre.' : 'The user is not on a centre page.'}\n\nQuestion: ${ctx.question.slice(0, 500)}` }] },
  ];
  try {
    let nudged = false;
    // MAX_TOOL_CALLS tool turns + 1 nudge + the answer
    for (let turn = 0; turn <= MAX_TOOL_CALLS + 1; turn++) {
      const noMoreTools = toolCalls >= MAX_TOOL_CALLS;
      const { response, modelUsed: used } = await withDeadline(
        model(
          {
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0,
              // Low thinking: up to three model turns must fit in 15 s (default thinking took 10-12 s per turn)
              thinkingConfig: { thinkingLevel: 'LOW' as any },
              tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
              toolConfig: {
                functionCallingConfig: noMoreTools ? { mode: 'NONE' as any } : { mode: 'AUTO' as any },
              },
            },
          },
          deadline
        ),
        deadline
      );
      modelUsed = used;
      const calls = noMoreTools ? [] : response.functionCalls ?? [];
      if (!calls.length) {
        const parsed = parseModelAnswer(response.text);
        askDebug(`model ${used} answer:`, parsed === null ? `unparseable: ${short(response.text ?? '', 300)}` : parsed.length ? '' : 'noInformation');
        for (const ms of parsed ?? []) askDebug(`  sentence: ${short(ms.text)} · sources ${JSON.stringify(ms.sources ?? [])}`);
        if (parsed === null) throw new Error('Ask CareQ: the model did not return the answer JSON');
        // "No information" after a single search: ask once for another search with different words
        const searches = toolCallNames.filter((n) => n === 'search_documents').length;
        if (!parsed.length && !nudged && searches === 1 && toolCalls < MAX_TOOL_CALLS && !personalQuestion(ctx.question) && !AVAILABILITY_Q.test(ctx.question)) {
          nudged = true;
          askDebug('nudge: asking for a second search with other words');
          contents.push(response.candidates?.[0]?.content ?? { role: 'model', parts: [{ text: response.text ?? '' }] });
          contents.push({ role: 'user', parts: [{ text: 'Those passages may use different words. Call search_documents once more with other words for the same question, then answer or reply {"noInformation": true}.' }] });
          continue;
        }
        const { answer, citations } = finaliseAnswer(ctx.question, parsed, passages, st.apps);
        return { answer, citations, toolsUsed, retrievalMode: st.mode, aiMode: 'gemini', modelUsed, ...(st.mode === 'keyword' ? { notice: st.notice ?? BASIC_SEARCH_NOTICE } : {}) };
      }
      const modelContent = response.candidates?.[0]?.content ?? { role: 'model', parts: calls.map((c) => ({ functionCall: c })) };
      contents.push(modelContent);
      const parts = [];
      for (const call of calls) {
        const result = toolCalls < MAX_TOOL_CALLS ? await runTool(call) : { error: 'Tool limit reached; answer now.' };
        toolCalls++;
        toolCallNames.push(call.name ?? '');
        parts.push({ functionResponse: { name: call.name, ...(call.id ? { id: call.id } : {}), response: { result } } });
      }
      contents.push({ role: 'user', parts });
    }
    throw new Error('Ask CareQ: no answer after the tool limit');
  } catch (err) {
    const reason = err instanceof AskTimeout || (err as Error)?.name === 'GeminiTimeoutError' || /timed out/i.test((err as Error)?.message ?? '') ? 'timeout' : 'error';
    const result = await askFallback(ctx, reason, passages.size ? { passages: [...passages.values()], mode: st.mode, notice: st.notice, apps: st.apps } : st.apps ? { passages: [], mode: st.mode, apps: st.apps } : undefined);
    return { ...result, toolsUsed: [...new Set([...toolsUsed, ...result.toolsUsed])] };
  }
}

// ---------------- Answer cache ----------------

/** Never cached: anything personal (the parent's application) or about positions, lists, waits, spots, availability. */
export const UNCACHEABLE_Q = /\b(position|list|lists|wait\w*|spots?|availab\w*)\b/i;

export type AskUser = { kind: 'anonymous' } | { kind: 'parent'; accountId: string } | { kind: 'centre'; accountId: string };

export const askCacheKey = (user: AskUser, centreId: string | undefined, question: string) =>
  `${user.kind === 'anonymous' ? 'anonymous' : `${user.kind}:${user.accountId}`}|${centreId ?? '-'}|${normaliseQuestion(question)}`;

export const isCacheable = (question: string, result: AskResult) =>
  result.aiMode === 'gemini' &&
  // A refusal may be a one-off model miss; don't let it stick for 30 minutes
  result.answer !== NO_INFO &&
  !result.toolsUsed.includes('get_my_application') &&
  !UNCACHEABLE_Q.test(question) &&
  !POSITION_Q.test(question) &&
  !WHEN_Q.test(question) &&
  !AVAILABILITY_Q.test(question);

export class AskCache {
  private map = new Map<string, { result: AskResult; expiresAt: number }>();
  constructor(private ttlMs = 30 * 60_000, private max = 200) {}
  get(key: string): AskResult | null {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return hit.result;
  }
  set(key: string, question: string, result: AskResult) {
    if (!isCacheable(question, result)) return;
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value!);
    this.map.set(key, { result, expiresAt: Date.now() + this.ttlMs });
  }
}
