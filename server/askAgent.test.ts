import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Content } from '@google/genai';
import {
  AskCache,
  AskContext,
  AskModelCall,
  AppFact,
  AskPassage,
  FALLBACK_HEADING,
  MAX_TOOL_CALLS,
  NO_INFO,
  askCacheKey,
  checkSource,
  finaliseAnswer,
  isCacheable,
  isQueueQuestion,
  quoteIsVerbatim,
  verifiedQuote,
  retrieveForAsk,
  searchHelp,
  runAskAgent,
} from './askAgent';
import { MemoryQueryStore, PROVINCIAL_LABEL, RetrieverDeps, StoredChunk, memoryChunkSource } from './retrieval';

const JK = 'on-00576'; // Jesse Ketchum (Toronto Early Learning & Child Care Services)
const MACAULAY = 'on-0004062';

const chunk = (id: string, over: Partial<StoredChunk>): StoredChunk => ({
  chunkId: id,
  docKey: 'doc',
  text: '',
  heading: '',
  page: 1,
  embedding: null,
  scope: 'operator',
  operatorId: 'op',
  operatorName: 'Operator',
  appliesToCentreIds: [],
  docTitle: 'Parent Handbook',
  sourceUrl: null,
  sourceNote: null,
  retrieved: null,
  embeddingModel: '',
  embeddingDimensions: 0,
  createdAt: '',
  ...over,
});

const JK_WITHDRAW = chunk('telccs#20', {
  operatorId: 'toronto-early-learning-child-care-services',
  operatorName: 'Toronto Early Learning & Child Care Services (City of Toronto)',
  docTitle: 'Parent Handbook (March 2026)',
  appliesToCentreIds: [JK],
  page: 20,
  heading: 'WITHDRAWING YOUR CHILD FROM CARE',
  text: 'We require two weeks written notice if you plan to withdraw your child from the centre for any reason.',
  sourceUrl: 'https://www.toronto.ca/handbook.pdf',
  sourceNote: 'Exact file',
});
const MAC_WITHDRAW = chunk('macaulay#9', {
  operatorId: 'macaulay-centres-for-children',
  operatorName: 'Macaulay Centres for Children',
  appliesToCentreIds: [MACAULAY],
  page: 9,
  heading: 'WITHDRAWAL',
  text: 'Macaulay requires one month written notice to withdraw your child from the program.',
});
const MANUAL = chunk('manual#36', {
  scope: 'provincial',
  operatorId: 'ontario-licensing-manual',
  operatorName: 'Government of Ontario',
  docTitle: 'Child Care Centre Licensing Manual',
  page: 36,
  heading: 'Part 2.4 Notice of Disenrollment',
  text: 'A licensee must give written notice of disenrollment to the parent of a child withdrawn from the program.',
});

const keywordDeps = (chunks: StoredChunk[]): RetrieverDeps => ({ source: memoryChunkSource(chunks), queryStore: new MemoryQueryStore() });

const PRIYA_APP: AppFact = {
  childName: 'Anya',
  centreName: 'Jesse Ketchum Early Learning & Child Care Centre',
  status: 'Waitlisted',
  position: 4,
  reportedBy: 'Jesse Ketchum Early Learning & Child Care Centre',
  reportedDate: 'Nov 2',
  estimate: '4–6 months',
  simulated: true,
};

/** A fake Gemini that plays back scripted turns and records every request. */
function scriptedModel(turns: ((contents: Content[]) => { functionCalls?: any[]; text?: string })[]) {
  const requests: { contents: Content[]; mode: string }[] = [];
  const model: AskModelCall = async ({ contents, config }) => {
    requests.push({ contents: structuredClone(contents), mode: String((config.toolConfig?.functionCallingConfig as any)?.mode) });
    const turn = turns[Math.min(requests.length - 1, turns.length - 1)];
    const r = turn(contents);
    return { response: { ...r, candidates: [{ content: { role: 'model', parts: (r.functionCalls ?? []).map((c) => ({ functionCall: c })) } }] }, modelUsed: 'fake-model' };
  };
  return { model, requests };
}

const lastToolResult = (contents: Content[]) => (contents.at(-1)?.parts?.[0] as any)?.functionResponse?.response?.result;
const answerJson = (sentences: object[]) => ({ text: JSON.stringify({ sentences }) });

// ---------------- Quote verification ----------------

test('quoteIsVerbatim: exact quotes pass; spacing, case, curly quotes and dashes are ignored', () => {
  const text = 'Parents must provide the child’s  immunization record — signed by a doctor — before the first day.';
  assert.equal(quoteIsVerbatim("the child's immunization record - signed by a doctor", text), true);
  assert.equal(quoteIsVerbatim('PARENTS MUST PROVIDE THE CHILD’S IMMUNIZATION RECORD', text), true);
  assert.equal(quoteIsVerbatim('"before the first day."', text), true);
});

test('quoteIsVerbatim: paraphrases, invented words, too short or over 25 words fail', () => {
  const text = 'We require two weeks written notice if you plan to withdraw your child from the centre for any reason.';
  assert.equal(quoteIsVerbatim('We require 2 weeks written notice', text), false); // paraphrase
  assert.equal(quoteIsVerbatim('We require two weeks notice in writing', text), false);
  assert.equal(quoteIsVerbatim('notice', text), false); // one word proves nothing
  assert.equal(quoteIsVerbatim('two weeks', text), true); // short but verbatim (e.g. a table cell like "Toddler 1:5")
  const long = Array.from({ length: 26 }, () => 'word').join(' ');
  assert.equal(quoteIsVerbatim(long, `${long} more`), false);
});

test('verifiedQuote: a verbatim quote over 25 words is cut to 25 words + "…"; an invented one is rejected', () => {
  const text = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
  const long = Array.from({ length: 27 }, (_, i) => `w${i}`).join(' ');
  const cut = verifiedQuote(long, text)!;
  assert.equal(cut, `${Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ')}…`);
  assert.equal(quoteIsVerbatim(cut.replace('…', ''), text), true);
  assert.equal(verifiedQuote(`${long} invented`, text), null);
  assert.equal(verifiedQuote('w1 w2 w3', text), 'w1 w2 w3');
  assert.equal(verifiedQuote('w1 w3', text), null);
});

test('finaliseAnswer drops unsupported sentences and citations, keeps verified ones', () => {
  const passages = new Map<string, AskPassage>([[JK_WITHDRAW.chunkId, { ...JK_WITHDRAW, score: 1, matchedBy: 'keyword' } as AskPassage]]);
  const out = finaliseAnswer(
    'How do I withdraw?',
    [
      { text: 'Give two weeks written notice.', sources: [{ chunkId: 'telccs#20', quote: 'We require two weeks written notice if you plan to withdraw' }] },
      { text: 'Refunds are given within 5 days.', sources: [{ chunkId: 'telccs#20', quote: 'Refunds are given within five business days' }] }, // quote not in chunk
      { text: 'Macaulay needs a month.', sources: [{ chunkId: 'macaulay#9', quote: 'Macaulay requires one month written notice' }] }, // chunk never retrieved
      { text: 'You will get a spot soon.', sources: [] },
    ],
    passages,
    null
  );
  assert.equal(out.answer, 'Give two weeks written notice.');
  assert.equal(out.citations.length, 1);

  const connective = finaliseAnswer(
    'How do I withdraw?',
    [
      { text: 'Invented first sentence.', sources: [] },
      { text: 'Additionally, give two weeks written notice.', sources: [{ chunkId: 'telccs#20', quote: 'We require two weeks written notice' }] },
    ],
    passages,
    null
  );
  assert.equal(connective.answer, 'Give two weeks written notice.');
  assert.deepEqual(
    { operatorName: out.citations[0].operatorName, docTitle: out.citations[0].docTitle, page: out.citations[0].page, sourceUrl: out.citations[0].sourceUrl },
    { operatorName: 'Toronto Early Learning & Child Care Services (City of Toronto)', docTitle: 'Parent Handbook (March 2026)', page: 'PDF p.20', sourceUrl: 'https://www.toronto.ca/handbook.pdf' }
  );
});

test('finaliseAnswer: nothing supported -> exactly the no-information message', () => {
  const out = finaliseAnswer('Do you offer swimming lessons?', [{ text: 'Yes, on Fridays.', sources: [{ chunkId: 'x', quote: 'Swimming lessons are on Fridays' }] }], new Map(), null);
  assert.equal(out.answer, NO_INFO);
  assert.equal(out.citations.length, 0);
});

test('finaliseAnswer: provincial content keeps "General Ontario rule; check with the centre."', () => {
  const passages = new Map<string, AskPassage>([[MANUAL.chunkId, { ...MANUAL, score: 1, matchedBy: 'keyword', label: PROVINCIAL_LABEL } as AskPassage]]);
  const out = finaliseAnswer(
    'notice of disenrollment',
    [{ text: 'Centres must give written notice of disenrollment.', sources: [{ chunkId: 'manual#36', quote: 'A licensee must give written notice of disenrollment' }] }],
    passages,
    null
  );
  assert.ok(out.answer.endsWith(PROVINCIAL_LABEL));
  assert.equal(out.citations[0].label, PROVINCIAL_LABEL);
});

test('finaliseAnswer: positions, waits and availability only from the parent’s application, in the server’s words', () => {
  const passages = new Map<string, AskPassage>([[JK_WITHDRAW.chunkId, { ...JK_WITHDRAW, score: 1, matchedBy: 'keyword' } as AskPassage]]);
  const claim = { text: 'The wait is usually 6 months.', sources: [{ chunkId: 'telccs#20', quote: 'We require two weeks written notice if you plan' }] };
  assert.equal(finaliseAnswer('How long is the wait?', [claim], passages, null).answer, NO_INFO);
  assert.equal(finaliseAnswer('Is there a space next week?', [claim], passages, [PRIYA_APP]).answer, NO_INFO);
  assert.equal(finaliseAnswer('Where am I on the list?', [{ text: 'You are #2.', fromApplication: true }], passages, null).answer, NO_INFO);

  const out = finaliseAnswer('Where am I on the list?', [{ text: 'You are #2 and will get in next week.', fromApplication: true }], passages, [PRIYA_APP]);
  assert.match(out.answer, /Position #4\. Reported by Jesse Ketchum Early Learning & Child Care Centre · Simulated · Nov 2/);
  assert.match(out.answer, /Centre's estimate: 4–6 months, not a guarantee · Simulated/);
  assert.doesNotMatch(out.answer, /#2|next week/); // the model's own words are never used
  assert.equal(out.citations[0].kind, 'application');
  assert.equal(out.citations[0].simulated, true);
});

// ---------------- Scope injection ----------------

test('search_documents: the centre comes from the request; a centreId chosen by the model is ignored', async () => {
  const { model, requests } = scriptedModel([
    () => ({ functionCalls: [{ name: 'search_documents', args: { query: 'Macaulay withdrawal notice', centreId: MACAULAY } }] }),
    (contents) => {
      const ids = (lastToolResult(contents)?.passages ?? []).map((p: any) => p.chunkId);
      return answerJson([{ text: 'Notice.', sources: ids.map((id: string) => ({ chunkId: id, quote: 'requires one month written notice to withdraw' })) }]);
    },
  ]);
  const ctx: AskContext = { question: 'What is the withdrawal notice at Macaulay?', centreId: JK, deps: keywordDeps([JK_WITHDRAW, MAC_WITHDRAW, MANUAL]) };
  const out = await runAskAgent(ctx, model);
  const seen = (lastToolResult(requests[1].contents)?.passages ?? []).map((p: any) => p.chunkId);
  assert.ok(seen.length > 0);
  assert.ok(!seen.includes('macaulay#9'), `Macaulay chunk leaked: ${seen}`);
  assert.ok(out.citations.every((c) => c.operatorName !== 'Macaulay Centres for Children'));
  assert.equal(out.answer, NO_INFO); // the Macaulay quote can't be verified against Jesse Ketchum's passages
});

// ---------------- get_my_application ----------------

const QUEUE_QUESTIONS = [
  'Where am I on the list?',
  'What is my position?',
  'When will I get a spot?',
  'How long is the wait?',
  'Is there a space next week?',
  'Are there any spots available?',
];
const neverCalled: AskModelCall = async () => {
  throw new Error('the model must not be called for position/availability questions');
};

test('position / wait / availability questions are answered without Gemini (mode "rule")', async () => {
  for (const question of QUEUE_QUESTIONS) {
    assert.ok(isQueueQuestion(question), question);
    // Anonymous user or centre account (no getApplications): the exact refusal
    const anon = await runAskAgent({ question, centreId: JK, deps: keywordDeps([JK_WITHDRAW]) }, neverCalled);
    assert.deepEqual([anon.answer, anon.aiMode, anon.modelUsed, anon.citations.length], [NO_INFO, 'rule', null, 0], question);
    // Signed-in parent without an application at this centre: the exact refusal
    const none = await runAskAgent({ question, centreId: JK, deps: keywordDeps([JK_WITHDRAW]), getApplications: async () => [] }, neverCalled);
    assert.deepEqual([none.answer, none.aiMode], [NO_INFO, 'rule'], question);
    // Signed-in parent with an application here: the server-written lines, "From your application · Simulated"
    const priya = await runAskAgent({ question, centreId: JK, deps: keywordDeps([JK_WITHDRAW]), getApplications: async () => [PRIYA_APP] }, neverCalled);
    assert.equal(priya.aiMode, 'rule');
    assert.match(priya.answer, /^Anya's application at Jesse Ketchum Early Learning & Child Care Centre: Waitlisted\. Position #4\. Reported by Jesse Ketchum Early Learning & Child Care Centre · Simulated · Nov 2\. Centre's estimate: 4–6 months, not a guarantee · Simulated\.$/);
    assert.deepEqual([priya.citations.length, priya.citations[0].kind, priya.citations[0].simulated], [1, 'application', true]);
  }
});

test('questions about how waitlists work still go to the handbook (not the rule path)', () => {
  for (const q of ['How does the waitlist work?', "What must a centre's waiting list policy include?", 'How do I withdraw?', 'What do I need to register?']) {
    assert.equal(isQueueQuestion(q), false, q);
  }
});

test('get_my_application through the agent: nothing for anonymous users or centre accounts', async () => {
  const { model, requests } = scriptedModel([
    () => ({ functionCalls: [{ name: 'get_my_application', args: {} }] }),
    () => answerJson([{ text: 'Here is your status.', fromApplication: true }]),
  ]);
  const out = await runAskAgent({ question: 'What does my application say?', centreId: JK, deps: keywordDeps([JK_WITHDRAW]) }, model);
  assert.equal(lastToolResult(requests[1].contents).available, false);
  assert.equal(out.answer, NO_INFO);
});

test('get_my_application through the agent: a parent gets the server-written lines, never the model’s words', async () => {
  const { model } = scriptedModel([
    () => ({ functionCalls: [{ name: 'get_my_application', args: {} }] }),
    () => answerJson([{ text: 'You are number 1 and will start Monday.', fromApplication: true }]),
  ]);
  const out = await runAskAgent({ question: 'What does my application say?', centreId: JK, deps: keywordDeps([JK_WITHDRAW]), getApplications: async () => [PRIYA_APP] }, model);
  assert.equal(out.aiMode, 'gemini');
  assert.match(out.answer, /Position #4\. Reported by .* · Simulated · Nov 2/);
  assert.doesNotMatch(out.answer, /number 1|Monday/);
});

// ---------------- Limits and fallback ----------------

test(`the agent stops after ${MAX_TOOL_CALLS} tool calls and must then answer`, async () => {
  const { model, requests } = scriptedModel([
    (contents) =>
      contents.length >= 1 + 2 * MAX_TOOL_CALLS
        ? answerJson([{ text: 'Two weeks.', sources: [{ chunkId: 'telccs#20', quote: 'We require two weeks written notice' }] }])
        : { functionCalls: [{ name: 'search_documents', args: { query: 'withdraw' } }] },
  ]);
  const out = await runAskAgent({ question: 'How do I withdraw?', centreId: JK, deps: keywordDeps([JK_WITHDRAW]) }, model);
  assert.equal(requests.length, MAX_TOOL_CALLS + 1);
  assert.equal(requests.at(-1)!.mode, 'NONE');
  assert.equal(out.answer, 'Two weeks.');
});

test('fallback (Gemini down): the top passages with sources under "Here\'s what the handbook says:"', async () => {
  const model: AskModelCall = async () => {
    throw new Error('503 overloaded');
  };
  const out = await runAskAgent({ question: 'How much notice to withdraw my child?', centreId: JK, deps: keywordDeps([JK_WITHDRAW, MAC_WITHDRAW]) }, model);
  assert.equal(out.aiMode, 'fallback');
  assert.equal(out.modelUsed, null);
  assert.equal(out.fallbackReason, 'error');
  assert.ok(out.answer.startsWith(FALLBACK_HEADING));
  assert.ok(out.citations.length >= 1 && out.citations.length <= 2);
  assert.ok(out.citations.every((c) => c.operatorName !== 'Macaulay Centres for Children'));
  assert.ok(out.citations.every((c) => quoteIsVerbatim(c.quote, JK_WITHDRAW.text)));
  assert.equal(out.retrievalMode, 'keyword');
});

test('fallback: no passages -> exactly the no-information message; availability is never answered', async () => {
  const down: AskModelCall = async () => {
    throw new Error('down');
  };
  assert.equal((await runAskAgent({ question: 'Do you offer swimming lessons?', centreId: JK, deps: keywordDeps([JK_WITHDRAW]) }, down)).answer, NO_INFO);
  assert.equal((await runAskAgent({ question: 'Is there a space next week?', centreId: JK, deps: keywordDeps([JK_WITHDRAW]) }, down)).answer, NO_INFO);
});

// ---------------- Retrieval rules ----------------

const vec = (cos: number) => [cos, Math.sqrt(1 - cos * cos), 0];
const vectorDeps = (chunks: StoredChunk[]): RetrieverDeps => ({
  source: memoryChunkSource(chunks),
  embed: async () => [1, 0, 0],
  queryStore: new MemoryQueryStore(),
});

test('with a centre: at most 1 provincial passage, only when it beats the operator passages', async () => {
  const prov = (id: string, cos: number) => ({ ...MANUAL, chunkId: id, embedding: vec(cos) });
  const weakOp = { ...JK_WITHDRAW, embedding: vec(0.7) }; // (1+0.7)/2 = 0.85
  const strongOp = { ...JK_WITHDRAW, embedding: vec(0.95) };
  const r1 = await retrieveForAsk('notice', JK, vectorDeps([weakOp, prov('m1', 0.9), prov('m2', 0.88)]));
  assert.deepEqual(r1.passages.map((p) => p.chunkId), ['telccs#20', 'm1']);
  const r2 = await retrieveForAsk('notice', JK, vectorDeps([strongOp, prov('m1', 0.9)]));
  assert.deepEqual(r2.passages.map((p) => p.chunkId), ['telccs#20']);
  const r3 = await retrieveForAsk('notice', JK, vectorDeps([{ ...JK_WITHDRAW, embedding: vec(0.2) }, prov('m1', 0.5)])); // both below threshold
  assert.deepEqual(r3.passages, []);
});

test('with a centre: a clear keyword match (2+ terms) in its own handbook is kept even below the vector cutoff', async () => {
  // Debug run 2026-11-08: "registration documents" scored 0.815–0.820 on every JK passage (cutoff 0.82)
  const admission = chunk('telccs#28', {
    operatorId: 'toronto-early-learning-child-care-services',
    appliesToCentreIds: [JK],
    heading: 'ADMISSION PROCEDURES',
    text: 'Before your child starts, complete the registration forms in the Child Admission Package; the supervisor reviews the documents with you.',
    embedding: vec(0.62), // (1+0.62)/2 = 0.81, below 0.82
  });
  const unrelated = chunk('telccs#90', { appliesToCentreIds: [JK], heading: 'OUTDOOR PLAY', text: 'Children play outside twice a day.', embedding: vec(0.6) });
  const otherCentre = { ...MAC_WITHDRAW, text: 'Registration documents for Macaulay are listed in the admission forms.', embedding: vec(0.6) };
  const r = await retrieveForAsk('registration documents', JK, vectorDeps([admission, unrelated, otherCentre]));
  assert.deepEqual(r.passages.map((p) => p.chunkId), ['telccs#28']);
  assert.equal(r.passages[0].matchedBy, 'keyword');
  // One term is not enough evidence on its own
  assert.deepEqual((await retrieveForAsk('registration', JK, vectorDeps([admission]))).passages, []);
});

test('drop reasons: no source, wrong chunk, too short, quote not found; a verbatim quote passes', () => {
  const passages = new Map<string, AskPassage>([[JK_WITHDRAW.chunkId, { ...JK_WITHDRAW, score: 1, matchedBy: 'vector' } as AskPassage]]);
  assert.deepEqual(checkSource({}, passages), { reason: 'no source' });
  assert.deepEqual(checkSource({ chunkId: 'telccs#20', quote: '  ' }, passages), { reason: 'no source' });
  assert.deepEqual(checkSource({ chunkId: 'macaulay#9', quote: 'two weeks written notice' }, passages), { reason: 'wrong chunk' });
  assert.deepEqual(checkSource({ chunkId: 'telccs#20', quote: 'notice' }, passages), { reason: 'too short' });
  assert.deepEqual(checkSource({ chunkId: 'telccs#20', quote: 'one month written notice' }, passages), { reason: 'quote not found' });
  const ok = checkSource({ chunkId: 'telccs#20', quote: 'two weeks written notice' }, passages);
  assert.ok('citation' in ok && ok.citation.quote === 'two weeks written notice');
});

test('a refusal is never cached (it may be a one-off model miss)', () => {
  const base = { citations: [], toolsUsed: ['search_documents'], retrievalMode: 'vector' as const, aiMode: 'gemini' as const, modelUsed: 'm' };
  assert.equal(isCacheable('What documents do I need to register?', { ...base, answer: NO_INFO }), false);
  assert.equal(isCacheable('What documents do I need to register?', { ...base, answer: 'Complete the Child Admission Package.' }), true);
});

test('without a centre: provincial passages + the CareQ Help FAQ, no operator handbooks', async () => {
  const r = await retrieveForAsk('How are waitlist positions set?', undefined, keywordDeps([JK_WITHDRAW, MAC_WITHDRAW, MANUAL]));
  assert.ok(r.passages.some((p) => p.scope === 'help' && p.heading === 'How are waitlist positions set?'));
  assert.ok(r.passages.every((p) => p.scope !== 'operator'));
  assert.ok(r.passages.length <= 4);
});

test('Help FAQ: strong matches only (half the question terms), so a provincial question is not crowded out', () => {
  assert.deepEqual(searchHelp('What does simulated data mean?').map((p) => p.chunkId), ['help#faq-3']);
  assert.equal(searchHelp('How are waitlist positions set?')[0].chunkId, 'help#faq-2');
  assert.deepEqual(searchHelp("What must a centre's waiting list policy include?"), []);
});

const INDEX = path.resolve('data/index/policyChunks.json');
test('real handbooks: asking about Macaulay from Jesse Ketchum never returns Macaulay chunks', { skip: !fs.existsSync(INDEX) && 'data/index/policyChunks.json not present' }, async () => {
  const chunks: StoredChunk[] = JSON.parse(fs.readFileSync(INDEX, 'utf8')).chunks;
  assert.ok(chunks.some((c) => c.operatorId === 'macaulay-centres-for-children'));
  const deps = keywordDeps(chunks);
  for (const q of ['What is Macaulay Centres for Children withdrawal policy?', 'Macaulay fees and registration', 'Macaulay Dovercourt immunization']) {
    const r = await retrieveForAsk(q, JK, deps);
    assert.ok(r.passages.length > 0, q);
    assert.ok(r.passages.every((p) => p.operatorId !== 'macaulay-centres-for-children'), `${q}: ${r.passages.map((p) => p.chunkId)}`);
    assert.ok(r.passages.filter((p) => p.scope === 'provincial').length <= 1);
  }
});

// ---------------- Answer cache ----------------

test('cache key includes who is asking; personal and position/list/wait/spot/availability questions are never cached', () => {
  const ok = { answer: 'x', citations: [], toolsUsed: ['search_documents'], retrievalMode: 'vector' as const, aiMode: 'gemini' as const, modelUsed: 'm' };
  const anon = askCacheKey({ kind: 'anonymous' }, JK, 'How do I withdraw?');
  const priya = askCacheKey({ kind: 'parent', accountId: 'parent-priya' }, JK, 'How do I withdraw?');
  const centre = askCacheKey({ kind: 'centre', accountId: 'centre-on-00576' }, JK, 'How do I withdraw?');
  assert.equal(new Set([anon, priya, centre]).size, 3);

  const cache = new AskCache();
  cache.set(anon, 'How do I withdraw?', ok);
  assert.ok(cache.get(anon));
  assert.equal(cache.get(priya), null);

  for (const q of ['Where am I on the list?', 'What is my position?', 'How long is the wait?', 'When will I get a spot?', 'Is there availability?', 'Is there a space next week?']) {
    assert.equal(isCacheable(q, ok), false, q);
  }
  assert.equal(isCacheable('How do I withdraw?', { ...ok, toolsUsed: ['get_my_application'] }), false);
  assert.equal(isCacheable('How do I withdraw?', { ...ok, aiMode: 'fallback' }), false);

  // An anonymous refusal for "Where am I on the list?" is never stored, so it can't reach Priya
  cache.set(askCacheKey({ kind: 'anonymous' }, JK, 'Where am I on the list?'), 'Where am I on the list?', { ...ok, answer: NO_INFO, toolsUsed: [] });
  assert.equal(cache.get(askCacheKey({ kind: 'anonymous' }, JK, 'Where am I on the list?')), null);
});

test('"no information" after one search: the agent asks once for a second search with different words', async () => {
  const { model, requests } = scriptedModel([
    () => ({ functionCalls: [{ name: 'search_documents', args: { query: 'register documents' } }] }),
    () => ({ text: '{"noInformation": true}' }),
    () => ({ functionCalls: [{ name: 'search_documents', args: { query: 'withdraw notice' } }] }),
    () => answerJson([{ text: 'Give two weeks written notice.', sources: [{ chunkId: 'telccs#20', quote: 'We require two weeks written notice' }] }]),
  ]);
  const out = await runAskAgent({ question: 'How do I leave the centre?', centreId: JK, deps: keywordDeps([JK_WITHDRAW]) }, model);
  assert.equal(requests.length, 4);
  assert.equal(out.answer, 'Give two weeks written notice.');

  // A second "no information" is final: exactly the refusal
  const again = scriptedModel([
    () => ({ functionCalls: [{ name: 'search_documents', args: { query: 'swimming' } }] }),
    () => ({ text: '{"noInformation": true}' }),
    () => ({ functionCalls: [{ name: 'search_documents', args: { query: 'pool lessons' } }] }),
    () => ({ text: '{"noInformation": true}' }),
  ]);
  const refused = await runAskAgent({ question: 'Do you offer swimming lessons?', centreId: JK, deps: keywordDeps([JK_WITHDRAW]) }, again.model);
  assert.equal(again.requests.length, 4);
  assert.equal(refused.answer, NO_INFO);
});
