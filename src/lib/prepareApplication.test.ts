import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizePrepareInput,
  prepareFallback,
  finalizePrepared,
  isFirstPerson,
  mergePrepared,
  isConditionRequirement,
  matchDocument,
  centreStatusLabel,
  PrepareInput,
  PreparedDraft,
} from './prepareApplication';

const input: PrepareInput = {
  centreName: 'CareQ Demo Centre (fictional)',
  parentFirstName: 'Priya',
  childFirstName: 'Anya',
  childAgeMonths: 22,
  careType: 'Full-time',
  preferredStartDate: 'March 2027',
  parentNotes: '',
  documents: [
    { fileName: 'anya_patel_birth_certificate.pdf', attachedTo: "Child's Birth Certificate" },
    { fileName: 'anya_ispa_yellow_card_scan.pdf', attachedTo: '' },
  ],
  requirements: [
    { requirement: "Child's Birth Certificate", sourceSentence: 'Applications must include a copy of the birth certificate.' },
    { requirement: 'Immunization History', sourceSentence: "Please attach your child's immunization history." },
    { requirement: 'Emergency Contact Authorization', sourceSentence: 'An emergency contact authorization is required.' },
    { requirement: 'Residence in the Annex catchment area', sourceSentence: 'Applicants must live within the catchment area.' },
  ],
};

test('sanitizePrepareInput keeps only allowed fields and first names', () => {
  const s = sanitizePrepareInput({
    ...input,
    parentFirstName: 'Priya Patel',
    email: 'priya@example.ca',
    dateOfBirth: '2025-01-01',
  })!;
  assert.equal(s.parentFirstName, 'Priya');
  assert.equal((s as any).email, undefined);
  assert.equal((s as any).dateOfBirth, undefined);
  assert.equal(sanitizePrepareInput({ ...input, requirements: [] }), null);
});

test('condition vs document requirements', () => {
  assert.ok(isConditionRequirement('Residence in the Annex catchment area'));
  assert.ok(isConditionRequirement('Child must be toilet trained'));
  assert.ok(!isConditionRequirement('Proof of Toronto Residency'));
  assert.ok(!isConditionRequirement('Emergency Contact & Medical Consent Form'));
});

test('matchDocument: attached first, then clear keyword match only', () => {
  assert.equal(matchDocument("Child's Birth Certificate", input.documents), 'anya_patel_birth_certificate.pdf');
  assert.equal(matchDocument('Immunization History', input.documents), 'anya_ispa_yellow_card_scan.pdf');
  assert.equal(matchDocument('Emergency Contact Authorization', input.documents), undefined);
});

test('fallback: ready / missing / needs parent check, template note, missing items', () => {
  const r = prepareFallback(input);
  assert.deepEqual(r.checklist.map((c) => c.status), ['ready', 'ready', 'missing', 'needs parent check']);
  assert.deepEqual(r.fields.map((f) => f.label), ['Child name', 'Child age', 'Care type', 'Preferred start date']);
  assert.ok(r.fields.every((f) => f.source === 'family profile'));
  assert.deepEqual(r.missingItems, ['Upload: Emergency Contact Authorization', 'Confirm: Residence in the Annex catchment area']);
  assert.ok(r.noteToCentre.split(/\s+/).length <= 80);
  assert.match(r.noteToCentre, /Anya/);
});

test('finalizePrepared: model cannot invent docs, override conditions, change profile values or add requirements', () => {
  const r = finalizePrepared(input, {
    fields: [
      { label: 'Child name', value: 'Annie', source: 'family profile' },
      { label: 'Emergency contact', value: 'Grandma, 416-555-0100', source: 'family profile' },
    ],
    checklist: [
      { requirement: 'Emergency Contact Authorization', status: 'ready', matchedDocument: 'emergency_form.pdf' },
      { requirement: 'Residence in the Annex catchment area', status: 'ready', matchedDocument: 'anya_patel_birth_certificate.pdf' },
      { requirement: 'Invented requirement', status: 'missing' },
    ],
    noteToCentre: 'Please give us priority over other families.',
  });
  assert.equal(r.fields[0].value, 'Anya'); // profile value from code
  const ec = r.fields.find((f) => f.label === 'Emergency contact')!;
  assert.deepEqual([ec.value, ec.source], ['', 'parent to provide']); // never a model value
  assert.equal(r.checklist.length, 4);
  assert.equal(r.checklist[2].status, 'missing'); // invented document -> missing
  assert.equal(r.checklist[3].status, 'needs parent check'); // condition stays a parent check
  assert.equal(r.checklist[0].status, 'ready'); // attached document is a fact
  assert.equal(r.checklist[3].sourceSentence, 'Applicants must live within the catchment area.');
  assert.doesNotMatch(r.noteToCentre, /priority/i); // replaced with template
  assert.ok(r.missingItems.includes('Provide: Emergency contact'));
});

test('finalizePrepared: a requirement is never repeated as a field to type in', () => {
  const withSheet: PrepareInput = {
    ...input,
    requirements: [
      ...input.requirements,
      { requirement: 'Family Information & Schedule Sheet', sourceSentence: 'Families fill in an information and schedule sheet.' },
    ],
  };
  const r = finalizePrepared(withSheet, {
    fields: [
      { label: 'Immunization History' },
      { label: 'emergency contact authorization' },
      { label: 'Family information and schedule' },
      { label: 'Emergency contact' },
    ],
  });
  assert.deepEqual(
    r.fields.filter((f) => f.source === 'parent to provide').map((f) => f.label),
    ['Emergency contact']
  );
});

test('finalizePrepared: a document requirement is never a "parent check"', () => {
  const withAddress: PrepareInput = {
    ...input,
    requirements: [{ requirement: 'Proof of Ontario Address', sourceSentence: 'Proof of an Ontario address is required.' }],
  };
  const r = finalizePrepared(withAddress, {
    checklist: [{ requirement: 'Proof of Ontario Address', status: 'needs parent check' }],
  });
  assert.equal(r.checklist[0].status, 'missing');
});

test('mergePrepared never overwrites parent edits', () => {
  const first: PreparedDraft = { ...finalizePrepared(input, { fields: [{ label: 'Emergency contact' }] }), aiMode: 'gemini', modelUsed: 'm' };
  first.fields = first.fields.map((f) => (f.label === 'Emergency contact' ? { ...f, value: 'Raj, 416-555-0101', editedByParent: true } : f));
  first.checklist[2] = { ...first.checklist[2], status: 'ready', setBy: 'parent' };
  first.checklist[3] = { ...first.checklist[3], parentConfirmed: true };
  first.noteToCentre = 'My own note';
  first.noteEditedByParent = true;
  const second: PreparedDraft = { ...prepareFallback(input), aiMode: 'fallback', modelUsed: null };
  const merged = mergePrepared(first, second);
  assert.equal(merged.fields.find((f) => f.label === 'Emergency contact')?.value, 'Raj, 416-555-0101');
  assert.equal(merged.checklist[2].status, 'ready');
  assert.equal(merged.checklist[2].setBy, 'parent');
  assert.equal(merged.checklist[3].parentConfirmed, true);
  assert.equal(merged.noteToCentre, 'My own note');
  assert.ok(!merged.missingItems.some((m) => m.startsWith('Confirm:')));
});

test('centre labels show who set each status', () => {
  const base = { requirement: 'x', sourceSentence: 'y' };
  assert.equal(centreStatusLabel({ ...base, status: 'ready', matchedDocument: 'a.pdf', setBy: 'ai' }), 'Ready · document attached');
  assert.equal(centreStatusLabel({ ...base, status: 'ready', setBy: 'parent' }), 'Ready · marked by parent');
  assert.equal(centreStatusLabel({ ...base, status: 'missing', setBy: 'rules' }), 'Missing');
  assert.equal(centreStatusLabel({ ...base, status: 'needs parent check', setBy: 'rules', parentConfirmed: true }), 'Needs parent check · confirmed by parent');
});

test('Prepare with AI keeps each requirement\'s quote, citation and link from the centre (never from the model)', () => {
  const cited = sanitizePrepareInput({
    ...input,
    requirements: [
      { requirement: 'Child Admission Package', sourceSentence: 'review the Child Admission Package', citation: 'Parent Handbook (March 2026), PDF p.13', sourceUrl: 'https://www.toronto.ca/h.pdf' },
      { requirement: 'Immunization record', sourceSentence: 'up-to-date immunization', citation: 'Parent Handbook (March 2026), PDF p.14', sourceUrl: 'javascript:alert(1)' },
    ],
  })!;
  assert.equal(cited.requirements[1].sourceUrl, undefined); // only http(s) links
  for (const result of [
    prepareFallback(cited),
    finalizePrepared(cited, { checklist: [{ requirement: 'Child Admission Package', status: 'missing', citation: 'Invented p.99', sourceUrl: 'https://evil.example' }] }),
  ]) {
    assert.equal(result.checklist[0].citation, 'Parent Handbook (March 2026), PDF p.13');
    assert.equal(result.checklist[0].sourceUrl, 'https://www.toronto.ca/h.pdf');
    assert.equal(result.checklist[0].sourceSentence, 'review the Child Admission Package');
    assert.equal(result.checklist[1].citation, 'Parent Handbook (March 2026), PDF p.14');
  }
});

test('note to the centre is in the parent\'s own voice (first person); third person falls back to the template', () => {
  assert.match(prepareFallback(input).noteToCentre, /I'm applying for my child Anya/);
  const third = finalizePrepared(input, { fields: [], checklist: [], noteToCentre: 'Priya is applying for her child Anya and would love a spot.' });
  assert.match(third.noteToCentre, /^Hello .*I'm applying for my child Anya/);
  const own = 'Hello, I\'m applying for my child Anya for full day care from March 2027. Thank you, Priya.';
  assert.equal(finalizePrepared(input, { fields: [], checklist: [], noteToCentre: own }).noteToCentre, own);
  assert.equal(isFirstPerson('The parent would like a spot for Anya.', 'Priya'), false);
  assert.equal(isFirstPerson('Priya Patel would like to apply. I have the documents.', 'Priya'), false);
});
