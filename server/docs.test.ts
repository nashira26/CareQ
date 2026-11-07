import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_CENTRE_NAME, makePdf, samplePdf } from '../scripts/fixtures/samplePdf';
import { UPLOAD_SOURCE_NOTE, extractPages, ingestUpload } from './ingest';
import { fallbackCandidates, gatherRequirementChunks, verifyCandidates } from './requirementsFromDocs';
import { buildFollowUpContext, fallbackFollowUp, finaliseFollowUp, handbookQuery, stripSimulatedWord } from './followUp';
import { namesMatch, verifyLicence } from './licence';
import { quoteIsVerbatim } from './askAgent';
import { MemoryQueryStore, RetrieverDeps, StoredChunk, memoryChunkSource } from './retrieval';
import type { PolicyChunk } from './policyIndexConfig';

const NEW_CENTRE = 'c-self-test';

/** A policyChunks stand-in that records writes. */
function fakeCollection() {
  const docs: PolicyChunk[] = [];
  return {
    docs,
    coll: {
      deleteMany: async (f: { docKey: string }) => {
        for (let i = docs.length - 1; i >= 0; i--) if (docs[i].docKey === f.docKey) docs.splice(i, 1);
      },
      insertMany: async (records: PolicyChunk[]) => {
        docs.push(...records);
      },
    } as any,
  };
}

async function uploadSample(embed?: (t: string[]) => Promise<number[][]>) {
  const { docs, coll } = fakeCollection();
  const result = await ingestUpload(
    { centreId: NEW_CENTRE, centreName: SAMPLE_CENTRE_NAME, fileName: 'Maple Grove Handbook.pdf', title: 'Parent Handbook 2026', data: samplePdf() },
    coll,
    embed
  );
  return { result, docs };
}

// ---------------- Ingestion ----------------

test('upload: a PDF becomes this centre’s operator chunks with pages; quota failure -> keyword-only', async () => {
  const { result, docs } = await uploadSample(async () => {
    throw new Error('429 quota');
  });
  assert.equal(result.pages, 3);
  assert.ok(result.chunks >= 3);
  assert.equal(result.keywordOnly, result.chunks);
  assert.match(result.embeddingNote ?? '', /keyword search/);
  for (const c of docs) {
    assert.equal(c.scope, 'operator');
    assert.deepEqual(c.appliesToCentreIds, [NEW_CENTRE]);
    assert.equal(c.operatorId, `self-${NEW_CENTRE}`);
    assert.equal(c.sourceUrl, null);
    assert.equal(c.sourceNote, UPLOAD_SOURCE_NOTE);
    assert.equal(c.embedding, null);
  }
  assert.ok(docs.some((c) => c.page === 2 && /birth certificate/i.test(c.text)));
});

test('upload: embeddings are stored when the quota allows; re-uploading replaces, never duplicates', async () => {
  const { docs, coll } = fakeCollection();
  const embed = async (texts: string[]) => texts.map(() => Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)));
  const input = { centreId: NEW_CENTRE, centreName: SAMPLE_CENTRE_NAME, fileName: 'handbook.pdf', title: 'Handbook', data: samplePdf() };
  const first = await ingestUpload(input, coll, embed);
  assert.equal(first.keywordOnly, 0);
  assert.ok(docs.every((c) => c.embedding?.length === 768));
  await ingestUpload(input, coll, embed);
  assert.equal(docs.length, first.chunks);
});

test('upload: HTML works; unsupported, empty, scanned-like or fake files get plain-language errors', async () => {
  const html = `<html><body><nav>Menu</nav><h1>Admission</h1><p>${'Parents must provide an immunization record before the first day of care. '.repeat(40)}</p></body></html>`;
  const pages = await extractPages('policy.html', Buffer.from(html));
  assert.equal(pages[0].page, null);
  assert.match(pages[0].text, /immunization record/);
  assert.doesNotMatch(pages[0].text, /Menu/);

  const { coll } = fakeCollection();
  const base = { centreId: NEW_CENTRE, centreName: 'X', title: 'X' };
  await assert.rejects(ingestUpload({ ...base, fileName: 'photo.png', data: Buffer.from('x') }, coll), /PDF, HTML or Word/);
  await assert.rejects(ingestUpload({ ...base, fileName: 'empty.pdf', data: Buffer.alloc(0) }, coll), /empty/);
  await assert.rejects(ingestUpload({ ...base, fileName: 'fake.pdf', data: Buffer.from('not a pdf at all') }, coll), /couldn't read/);
  await assert.rejects(ingestUpload({ ...base, fileName: 'short.pdf', data: makePdf([['Hi.']]) }, coll), /too little text/);
});

// ---------------- Requirements from documents ----------------

async function sampleDeps(): Promise<{ deps: RetrieverDeps; chunks: StoredChunk[] }> {
  const { docs } = await uploadSample();
  const other: StoredChunk = {
    ...(docs[1] as StoredChunk),
    chunkId: 'other#1',
    docKey: 'other/handbook.pdf',
    operatorId: 'other',
    appliesToCentreIds: ['on-other'],
    text: 'Parents must provide a passport and a signed photo consent form.',
  };
  const chunks = [...(docs as StoredChunk[]), other];
  return { deps: { source: memoryChunkSource(chunks), queryStore: new MemoryQueryStore() }, chunks };
}

test('requirements: only this centre’s chunks are read (optionally one document)', async () => {
  const { deps } = await sampleDeps();
  const chunks = await gatherRequirementChunks(NEW_CENTRE, deps);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((c) => c.appliesToCentreIds.includes(NEW_CENTRE)));
  assert.deepEqual(await gatherRequirementChunks(NEW_CENTRE, deps, 'other/handbook.pdf'), []);
});

test('requirements: AI items keep only verbatim quotes from chunks that were read', async () => {
  const { deps } = await sampleDeps();
  const chunks = await gatherRequirementChunks(NEW_CENTRE, deps);
  const page2 = chunks.find((c) => c.page === 2)!;
  const out = verifyCandidates(
    [
      { requirement: 'Birth certificate', category: 'documents', chunkId: page2.chunkId, quote: "parents must provide a copy of the child's birth certificate" },
      { requirement: 'Passport', category: 'documents', chunkId: 'other#1', quote: 'Parents must provide a passport' }, // not read
      { requirement: 'Police check', category: 'documents', chunkId: page2.chunkId, quote: 'Parents must provide a police check' }, // invented
      { requirement: 'Birth certificate', category: 'documents', chunkId: page2.chunkId, quote: 'a copy of the child’s birth certificate' }, // duplicate
    ],
    chunks
  );
  assert.equal(out.length, 1);
  assert.deepEqual(
    { requirement: out[0].requirement, page: out[0].page, docTitle: out[0].docTitle, sourceUrl: out[0].sourceUrl },
    { requirement: 'Birth certificate', page: 'PDF p.2', docTitle: 'Parent Handbook 2026', sourceUrl: null }
  );
});

test('requirements fallback (no AI): requirement sentences, each quote verbatim, with page and title', async () => {
  const { deps } = await sampleDeps();
  const chunks = await gatherRequirementChunks(NEW_CENTRE, deps);
  const out = fallbackCandidates(chunks);
  const titles = out.map((r) => r.requirement);
  for (const t of ['Birth certificate or proof of age', 'Immunization record', 'Emergency contact information', 'Waitlist rules']) assert.ok(titles.includes(t), `${t} in ${titles}`);
  for (const r of out) {
    const c = chunks.find((x) => x.chunkId === r.chunkId)!;
    assert.ok(quoteIsVerbatim(r.quote.replace(/…$/, ''), c.text), r.quote);
    assert.match(r.page, /^PDF p\.\d$/);
  }
});

// ---------------- Follow-up messages ----------------

const MACAULAY = { id: 'on-0004062', name: 'Macaulay - Dovercourt Child Care Centre', registration: undefined };
const offerApp = {
  childName: 'Anya Patel',
  status: 'Offer' as const,
  waitlistPosition: undefined,
  waitlistReportedBy: undefined,
  waitlistReportedDate: undefined,
  waitlistEstimate: undefined,
  preferredStartDate: 'March 2027',
  submittedAt: 'Aug 20, 2026',
  careType: 'Full day',
};
const offerPassage = {
  chunkId: 'macaulay#12',
  text: 'When a space is offered, parents must confirm acceptance in writing within 3 business days to secure the space.',
  heading: 'OFFERS',
  page: 12,
  docTitle: 'Parent Handbook (January 2024)',
  sourceUrl: 'https://macaulaycentre.org/x',
  sourceNote: null,
  retrieved: null,
  operatorId: 'macaulay-centres-for-children',
  operatorName: 'Macaulay Centres for Children',
  scope: 'operator' as const,
  score: 0.9,
  matchedBy: 'vector' as const,
};

test('follow-up facts come from the application; demo-centre facts are labelled simulated', () => {
  const ctx = buildFollowUpContext(offerApp, MACAULAY, 'parent', 'Priya Patel', 'Accept the offer');
  assert.equal(ctx.childFirstName, 'Anya');
  assert.equal(ctx.senderName, 'Priya');
  assert.equal(ctx.simulated, true);
  assert.deepEqual(ctx.facts.find((f) => f.label === 'Application status'), { label: 'Application status', value: 'Offer made by the centre', simulated: true });
  assert.equal(ctx.facts.find((f) => f.label === 'Centre')!.simulated, false);
  assert.match(handbookQuery('Accept the offer', 'Offer'), /offer of a space .*before the first day/);
  assert.match(handbookQuery('Withdraw my application', 'Waitlisted'), /notice period/);
  // A self-registered centre's application is real, not simulated
  assert.equal(buildFollowUpContext(offerApp, { ...MACAULAY, registration: {} as any }, 'parent', 'Priya', 'x').simulated, false);
});

test('follow-up draft: a handbook quote must be verbatim; the body never says "simulated"', () => {
  const ctx = buildFollowUpContext(offerApp, MACAULAY, 'parent', 'Priya Patel', 'Accept the offer');
  const ok = finaliseFollowUp(ctx, [offerPassage], {
    message: 'Hello, we would like to accept the (simulated) offer for Anya at Macaulay. We understand acceptance must be confirmed in writing within 3 business days.',
    handbookQuote: { chunkId: 'macaulay#12', quote: 'parents must confirm acceptance in writing within 3 business days' },
  })!;
  assert.doesNotMatch(ok.draftMessage, /simulated/i);
  assert.equal(ok.citation?.page, 'PDF p.12');
  assert.equal(ok.simulated, true);
  // Unverifiable handbook claim -> rejected (the endpoint uses the template instead)
  assert.equal(finaliseFollowUp(ctx, [offerPassage], { message: 'x', handbookQuote: { chunkId: 'macaulay#12', quote: 'parents must pay a $500 deposit' } }), null);
  assert.equal(stripSimulatedWord('Position #4 (simulated) and Simulated offer'), 'Position #4 and offer');
});

test('follow-up fallback: mentions the centre and the offer, cites the handbook line it found', () => {
  const ctx = buildFollowUpContext(offerApp, MACAULAY, 'parent', 'Priya Patel', 'Accept the offer');
  const out = fallbackFollowUp(ctx, [offerPassage]);
  assert.match(out.draftMessage, /Macaulay - Dovercourt Child Care Centre/);
  assert.match(out.draftMessage, /offer/i);
  assert.match(out.draftMessage, /PDF p\.12/);
  assert.doesNotMatch(out.draftMessage, /simulated/i);
  assert.ok(out.citation && quoteIsVerbatim(out.citation.quote, offerPassage.text));
  // No handbook line found: still a useful draft, no citation
  assert.equal(fallbackFollowUp(ctx, []).citation, null);
});

// ---------------- Licence verification ----------------

test('licence: number AND (postal code or close name) must match the Ontario open data', () => {
  const jk = { licenceNumber: '00576', postalCode: 'M5R 1M7', name: 'My Centre' };
  assert.equal(verifyLicence(jk)?.openDataId, 'on-00576');
  assert.equal(verifyLicence({ ...jk, licenceNumber: '576' })?.matchedBy, 'licence number and postal code'); // leading zeros
  assert.equal(verifyLicence({ ...jk, postalCode: 'M4K 3S3' }), undefined); // licence number alone proves nothing
  assert.equal(verifyLicence({ ...jk, postalCode: 'M4K 3S3', name: 'Jesse Ketchum Child Care' })?.matchedBy, 'licence number and name');
  assert.equal(verifyLicence({ ...jk, licenceNumber: '99999999' }), undefined);
  assert.equal(verifyLicence({ ...jk, licenceNumber: '' }), undefined);
  assert.equal(namesMatch('Sunny Steps Child Care Centre', 'Jesse Ketchum Early Learning & Child Care Centre'), false);
});
