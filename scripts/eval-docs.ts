/**
 * Live check of requirements-from-documents, Prepare with AI and follow-up messages against a running
 * server (real Gemini when available, else each endpoint's fallback; MongoDB policy index).
 *
 *   npm run eval:docs -- http://localhost:3100            # also cleans up the test centre it creates
 *   npm run eval:docs -- http://localhost:3100 --keep     # keep the test centre (to look at it in the UI)
 *
 *  1. Prepare with AI for Priya at two demo centres (citations come from the confirmed requirements)
 *  2. A follow-up message about Priya's Macaulay offer (mentions the centre and the offer; cites a
 *     handbook line when one is found; "simulated" never in the body)
 *  3. A new centre registers, uploads a small FICTIONAL sample PDF, and the policy reader extracts
 *     requirements from it (each with a verbatim quote and page)
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { samplePdf, SAMPLE_CENTRE_NAME } from './fixtures/samplePdf';
import type { Snapshot } from '../src/lib/world';

const args = process.argv.slice(2);
const BASE = (args.find((a) => !a.startsWith('--')) || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const KEEP = args.includes('--keep');

type Json = Record<string, any>;
class Session {
  cookie = '';
  async call(method: string, path: string, body?: unknown): Promise<{ status: number; data: Json; ms: number }> {
    const started = Date.now();
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    return { status: res.status, data: (await res.json().catch(() => ({}))) as Json, ms: Date.now() - started };
  }
}

const cell = (s: unknown) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const model = (d: Json) => (d.aiMode === 'fallback' ? 'fallback (no AI)' : d.modelUsed ?? '-');
const secs = (d: Json, ms: number) => `${((d.latencyMs ?? ms) / 1000).toFixed(1)} s`;
const rows: string[] = [];
let failed = 0;
const row = (group: string, what: string, expected: string, got: string, sources: string, d: Json, ms: number, ok: boolean) => {
  if (!ok) failed++;
  rows.push(`| ${group} | ${cell(what)} | ${cell(expected)} | ${cell(got)} | ${cell(sources)} | ${cell(model(d))} | ${secs(d, ms)} | ${ok ? '✅' : '❌'} |`);
};

async function prepareFor(s: Session, snap: Snapshot, centreId: string) {
  const app = snap.applications.find((a) => a.centreId === centreId)!;
  const centre = snap.centres.find((c) => c.id === centreId)!;
  const input = {
    centreName: centre.name,
    parentFirstName: snap.account!.name.split(/\s+/)[0],
    childFirstName: app.childName.split(/\s+/)[0],
    childAgeMonths: app.childAgeMonths,
    careType: app.careType,
    preferredStartDate: app.preferredStartDate,
    parentNotes: app.parentNotes ?? '',
    documents: Object.entries(app.uploadedDocuments ?? {}).map(([attachedTo, d]) => ({ fileName: d.fileName, attachedTo })),
    requirements: centre.requirements.map((requirement) => ({
      requirement,
      sourceSentence: centre.requirementSources?.[requirement] ?? '',
      citation: centre.requirementCitations?.[requirement],
      sourceUrl: centre.requirementSourceUrls?.[requirement] ?? (centre.requirementCitations?.[requirement] ? centre.requirementsExtractedFrom?.sourceUrl : undefined),
    })),
  };
  const r = await s.call('POST', '/prepare-application', input);
  const list: Json[] = r.data.checklist ?? [];
  const cited = list.filter((c) => c.citation);
  const ok = r.status === 200 && list.length === centre.requirements.length && cited.length === list.length && list.every((c) => c.sourceSentence);
  row(
    'Prepare with AI',
    `Priya at ${centre.name}`,
    'Checklist = confirmed requirements, each with quote + page + link',
    `${list.length} items: ${list.map((c) => `${c.requirement} (${c.status})`).join('; ')}`,
    [...new Set(cited.map((c) => `${c.citation}${c.sourceUrl ? ' + link' : ''}`))].slice(0, 3).join('; '),
    r.data,
    r.ms,
    ok
  );
}

async function main() {
  // ---- Priya ----
  const priya = new Session();
  const login = await priya.call('POST', '/auth/login', { email: 'priya@example.ca', password: 'password', role: 'parent' });
  if (login.status !== 200) throw new Error(`Priya login failed: ${login.status}`);
  const snap = (await priya.call('GET', '/state')).data as Snapshot;
  await prepareFor(priya, snap, 'on-00576'); // Jesse Ketchum
  await prepareFor(priya, snap, 'on-0002575'); // Leaside (HTML handbook: sections, not pages)

  const macaulayApp = snap.applications.find((a) => a.centreId === 'on-0004062')!;
  const msg = await priya.call('POST', '/generate-message', {
    role: 'parent',
    applicationId: macaulayApp.id,
    intent: 'Accept the offer and ask about next steps',
  });
  const text: string = msg.data.draftMessage ?? '';
  const c = msg.data.citation;
  const msgOk =
    msg.status === 200 &&
    /macaulay/i.test(text) &&
    /offer/i.test(text) &&
    !/simulated/i.test(text) &&
    (msg.data.facts ?? []).some((f: Json) => f.label === 'Application status' && f.simulated);
  row(
    'Follow-up message',
    `Priya → Macaulay (status ${macaulayApp.status}): accept the offer`,
    'Mentions centre + offer; cites a handbook line if found; no "simulated" in body',
    text,
    c ? `${c.operatorName}'s ${c.docTitle}, ${c.page}: “${c.quote}”` : 'no handbook line found',
    msg.data,
    msg.ms,
    msgOk
  );

  // ---- A new centre uploads a sample PDF ----
  const centre = new Session();
  const email = `eval-docs-${Date.now()}@careq-test.example`;
  const signup = await centre.call('POST', '/auth/signup', { role: 'centre', name: 'Eval Docs', email, password: 'evaldocs-pass-1', termsAccepted: true });
  if (signup.status >= 300) throw new Error(`centre signup failed: ${signup.status} ${JSON.stringify(signup.data)}`);
  const reg = await centre.call('POST', '/centres/register', {
    form: {
      name: SAMPLE_CENTRE_NAME, street: '1 Example Ave', postalCode: 'M4K 3S3', neighbourhood: 'Danforth & Pape', licenceNumber: '',
      ageGroups: ['Toddler', 'Preschool'], programOptions: ['Full day'], languages: ['English'], hours: '7:30 AM – 6:00 PM', capacity: '', contactEmail: email, policyText: '',
    },
  });
  const centreId: string | undefined = (reg.data as Snapshot).account?.centreId;
  if (!centreId) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.data).slice(0, 200)}`);
  const registered = (reg.data as Snapshot).centres.find((x) => x.id === centreId)!;
  row(
    'Licence label',
    'New centre registered without a licence number',
    'Self-registered · not verified',
    registered.registration?.licenceVerified ? 'Licensed · verified against Ontario open data' : 'Self-registered · not verified',
    '-',
    { aiMode: 'rule' },
    reg.ms,
    !registered.registration?.licenceVerified
  );

  try {
    const up = await centre.call('POST', `/centres/${centreId}/documents`, {
      fileName: 'maple-grove-handbook.pdf',
      title: 'Parent Handbook 2026 (fictional)',
      dataBase64: samplePdf().toString('base64'),
    });
    row(
      'Upload',
      'Sample PDF (3 pages, fictional)',
      'Indexed for this centre (embeddings if quota allows, else keyword)',
      up.status === 201 ? `${up.data.pages} pages → ${up.data.chunks} passages, ${up.data.keywordOnly} keyword-only${up.data.embeddingNote ? ` (${up.data.embeddingNote})` : ''}` : `${up.status} ${up.data.error}`,
      up.data.docKey ?? '-',
      { aiMode: 'rule' },
      up.ms,
      up.status === 201 && up.data.chunks > 0
    );
    const docs = await centre.call('GET', `/centres/${centreId}/documents`);
    const ex = await centre.call('POST', `/centres/${centreId}/extract-from-documents`, { docKey: up.data.docKey });
    const reqs: Json[] = ex.data.requirements ?? [];
    row(
      'Requirements from document',
      `Policy reader on the uploaded PDF (listed: ${(docs.data.documents ?? []).map((d: Json) => d.docTitle).join(', ')})`,
      'Birth certificate, immunization, emergency contacts, waitlist rules… each with verbatim quote + page',
      reqs.map((r) => `${r.requirement} (${r.page})`).join('; '),
      reqs.slice(0, 3).map((r) => `“${r.quote}”`).join(' '),
      ex.data,
      ex.ms,
      ex.status === 200 && reqs.length >= 3 && reqs.every((r) => r.quote && /^PDF p\.\d/.test(r.page))
    );
    console.log('\nRequirements extracted from the uploaded sample PDF:\n');
    console.log('| Requirement | Category | Page | Quote (verbatim) |');
    console.log('| --- | --- | --- | --- |');
    for (const r of reqs) console.log(`| ${cell(r.requirement)} | ${r.category} | ${r.page} | ${cell(r.quote)} |`);

    // A real demo centre's simulated account can't upload
    const jk = new Session();
    await jk.call('POST', '/auth/login', { email: 'jesse-ketchum.demo@careq.example', password: 'password', role: 'centre' });
    const denied = await jk.call('POST', '/centres/on-00576/documents', { fileName: 'x.pdf', dataBase64: samplePdf().toString('base64') });
    row('Upload rule', 'Jesse Ketchum (simulated demo account) tries to upload', '403: self-registered centres only', `${denied.status} ${denied.data.error ?? ''}`, '-', { aiMode: 'rule' }, denied.ms, denied.status === 403);
  } finally {
    if (!KEEP && process.env.MONGODB_URI && process.env.MONGODB_DB) {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db(process.env.MONGODB_DB);
      await Promise.all([
        db.collection('policyChunks').deleteMany({ operatorId: `self-${centreId}` }),
        db.collection('centres').deleteOne({ id: centreId }),
        db.collection('accounts').deleteOne({ emailLower: email.toLowerCase() }),
        db.collection('sessions').deleteMany({ accountId: (signup.data as Snapshot).account?.id }),
      ]);
      await client.close();
      console.log(`\n(cleaned up test centre ${centreId}; use --keep to keep it)`);
    }
  }

  console.log('\n| Group | What | Expected | Got | Sources | Model | Server time | Pass |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) console.log(r);
  console.log(`\n${rows.length - failed}/${rows.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
