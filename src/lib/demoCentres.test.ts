import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ontario from '../data/ontarioCentres.json';
import type { OntarioCentresFile } from '../data/ontarioTypes';
import { DEMO_CENTRES, DEMO_CENTRE_ID, HARMONY_ID, REAL_DEMO_CENTRES } from '../data/demoCentres';
import { INITIAL_APPLICATIONS, INITIAL_CENTRES, PARENT_PROFILE, PRIYA_CHILDREN } from '../data/mockData';
import { buildSeedWorld, DEMO_ACCOUNT_IDS, PasswordHasher } from './world';
import { doesntServeLabel } from './searchCriteria';

const hasher: PasswordHasher = {
  hash: async (p) => createHash('sha256').update(p).digest('hex'),
  verify: async (p, h) => createHash('sha256').update(p).digest('hex') === h,
};

const policiesDir = path.join(process.cwd(), 'data', 'policies');
const metas = fs
  .readdirSync(policiesDir)
  .filter((d) => fs.existsSync(path.join(policiesDir, d, 'meta.json')))
  .map((d) => JSON.parse(fs.readFileSync(path.join(policiesDir, d, 'meta.json'), 'utf8')) as { demoCentreId: string; appliesToCentreIds: string[] });
const openData = (ontario as unknown as OntarioCentresFile).centres;

test('demo centres = each policy folder\'s demoCentreId + one fictional CareQ Demo Centre', () => {
  const expected = [...metas.map((m) => m.demoCentreId), DEMO_CENTRE_ID].sort();
  assert.deepEqual(INITIAL_CENTRES.map((c) => c.id).sort(), expected);
  assert.equal(INITIAL_CENTRES.filter((c) => c.demoKind === 'fictional').length, 1);
  assert.match(INITIAL_CENTRES.find((c) => c.id === DEMO_CENTRE_ID)!.name, /\(fictional\)/);
});

test("the operators' other sites stay open-data only (not seeded, no applications)", () => {
  const others = new Set(metas.flatMap((m) => m.appliesToCentreIds.filter((id) => id !== m.demoCentreId)));
  assert.ok(others.size > 0);
  assert.ok(!INITIAL_CENTRES.some((c) => others.has(c.id)));
  assert.ok(!INITIAL_APPLICATIONS.some((a) => others.has(a.centreId)));
});

test('real demo centres keep their open-data details exactly', () => {
  for (const c of REAL_DEMO_CENTRES) {
    const o = openData.find((x) => x.id === c.id);
    assert.ok(o, `${c.id} is in the open data`);
    assert.equal(c.name, o.name);
    assert.equal(c.address, o.address);
    assert.equal(c.lat, o.lat);
    assert.equal(c.lng, o.lng);
    assert.deepEqual(c.ageGroups, o.ageGroups);
    assert.deepEqual(c.programOptions, o.programOptions);
    assert.deepEqual(c.languages, o.languages);
    assert.equal(c.licenceNumber, o.licenceNumber);
    assert.equal(c.capacity, o.capacity);
    assert.equal(Boolean(c.feeNote), Boolean(o.cwelcc));
    assert.equal(c.demoKind, 'open-data');
  }
});

test('every real-centre requirement has a word-for-word quote and a citation', () => {
  // A merged item may cite more than one page ("PDF p.15 and p.17"), each page given explicitly
  for (const c of REAL_DEMO_CENTRES) {
    assert.ok(c.requirements.length > 0, c.id);
    assert.ok(c.requirementsExtractedFrom?.docTitle, c.id);
    for (const r of c.requirements) {
      assert.ok(c.requirementSources?.[r]?.length, `${c.id}: quote for ${r}`);
      assert.match(c.requirementCitations?.[r] ?? '', /, (PDF p\.\d+( and p\.\d+)*|section \d+ \(.+\))$/, `${c.id}: citation for ${r}`);
      assert.ok(c.requirementCitations![r].startsWith(c.requirementsExtractedFrom!.docTitle));
    }
  }
  // Macaulay: the two immunization items are one checklist item quoting both pages
  const macaulay = REAL_DEMO_CENTRES.find((c) => c.id === 'on-0004062')!;
  assert.equal(macaulay.requirements.filter((r) => /immuni[sz]/i.test(r)).length, 1);
  assert.match(macaulay.requirementCitations!['Admission forms and up-to-date immunization records'], /PDF p\.15 and p\.17$/);
  // B.F. Toronto: real handbook, download link not found
  const bf = REAL_DEMO_CENTRES.find((c) => c.id === 'on-07205')!;
  assert.ok(Object.values(bf.requirementCitations!).every((x) => x.includes('(source link not found)')));
  // Family Day Care: handbook has no admission list -> licensing manual
  assert.equal(REAL_DEMO_CENTRES.find((c) => c.id === 'on-12256')!.requirementsExtractedFrom!.fallback, 'licensing-manual');
});

test('Priya lives in The Annex; Anya is a 22-month-old toddler in full day care', () => {
  assert.equal(PARENT_PROFILE.homeArea, 'The Annex');
  assert.equal(PRIYA_CHILDREN[0].homeArea, 'The Annex');
  assert.equal(PRIYA_CHILDREN[0].careType, 'Full day');
  assert.equal(PARENT_PROFILE.childAgeMonths, 22);
});

test("Priya's seeded applications: Submitted, Waitlisted (with history) and one Offer at the named centres, plus one draft", () => {
  const all = INITIAL_APPLICATIONS.filter((a) => a.parentAccountId === 'parent-priya');
  assert.deepEqual(
    all.filter((a) => a.status === 'Draft').map((a) => a.centreId),
    ['on-12256']
  );
  const mine = all.filter((a) => a.status !== 'Draft');
  assert.deepEqual(
    mine.map((a) => a.centreId).sort(),
    ['on-00576', 'on-0002899', 'on-0004062', 'on-0002575', DEMO_CENTRE_ID].sort()
  );
  const statuses = new Set(mine.map((a) => a.status));
  for (const s of ['Submitted', 'Waitlisted', 'Offer'] as const) assert.ok(statuses.has(s), s);
  assert.equal(mine.filter((a) => a.status === 'Offer').length, 1);
  for (const a of mine.filter((x) => x.status === 'Waitlisted')) {
    assert.ok((a.positionHistory?.length ?? 0) >= 2, `${a.id} has a short position history`);
    assert.ok(a.waitlistReportedBy && a.waitlistReportedDate, `${a.id} says who reported it and when`);
  }
  // Every application is at a demo centre (never at another open-data centre)
  const ids = new Set(DEMO_CENTRES.map((c) => c.id));
  assert.ok(INITIAL_APPLICATIONS.every((a) => ids.has(a.centreId)));
});

test("Harmony is preschool-only: \"Doesn't serve toddlers\" for Anya", () => {
  const harmony = DEMO_CENTRES.find((c) => c.id === HARMONY_ID)!;
  assert.equal(doesntServeLabel(harmony.ageGroups, 22), "Doesn't serve toddlers");
  assert.equal(doesntServeLabel(harmony.ageGroups, 40), null);
  assert.ok(!INITIAL_APPLICATIONS.some((a) => a.centreId === HARMONY_ID && a.childId === 'child-anya'));
});

test('real centres get "{centre} · simulated demo account" portal accounts; all are demo accounts', async () => {
  const world = await buildSeedWorld(hasher);
  for (const c of REAL_DEMO_CENTRES) {
    const acc = world.accounts.find((a) => a.role === 'centre' && a.centreId === c.id);
    assert.ok(acc, c.id);
    assert.equal(acc.name, `${c.name} · simulated demo account`);
    assert.ok(DEMO_ACCOUNT_IDS.includes(acc.id));
  }
  assert.ok(world.accounts.some((a) => a.email === 'centre@careq-demo.example' && a.centreId === DEMO_CENTRE_ID));
  assert.ok(world.accounts.some((a) => a.email === 'jesse-ketchum.demo@careq.example' && a.centreId === 'on-00576'));
});

test('Jesse Ketchum seed: every status but Draft/Offer, one family per waitlist position, ages and files fit the centre', () => {
  const jk = REAL_DEMO_CENTRES.find((c) => c.id === 'on-00576')!;
  const apps = INITIAL_APPLICATIONS.filter((a) => a.centreId === jk.id);
  assert.ok(apps.length >= 8, `${apps.length} applications`);
  for (const s of ['Submitted', 'Under review', 'Waitlisted', 'Accepted', 'Withdrawn'] as const) {
    assert.ok(apps.some((a) => a.status === s), `no ${s} application`);
  }
  // No open offers or drafts: the offer made live in the demo (to Priya) is the only one
  assert.ok(!apps.some((a) => a.status === 'Offer' || a.status === 'Draft'));
  // Priya/Anya keeps her seeded #4 and history
  const anya = apps.find((a) => a.childId === 'child-anya')!;
  assert.deepEqual([anya.status, anya.waitlistPosition, anya.positionHistory!.map((h) => h.position)], ['Waitlisted', 4, [9, 6, 4]]);
  const positions = apps.filter((a) => a.status === 'Waitlisted').map((a) => a.waitlistPosition).sort();
  assert.deepEqual(positions, [1, 2, 3, 4, 5, 6]);
  for (const a of apps) {
    const group = a.childAgeMonths < 18 ? 'Infant' : a.childAgeMonths < 30 ? 'Toddler' : 'Preschool';
    assert.ok(jk.ageGroups.includes(group), `${a.childName} (${a.childAgeMonths} months) is ${group}`);
    assert.match(a.submittedAt ?? '', /^(Aug|Sep|Oct|Nov) \d{1,2}, 2026$/, a.childName);
    if (a.status === 'Waitlisted') assert.ok((a.positionHistory?.length ?? 0) >= 2 && a.waitlistReportedDate, a.childName);
    for (const r of [...a.completedRequirements, ...Object.keys(a.uploadedDocuments ?? {})]) assert.ok(jk.requirements.includes(r), r);
  }
  // Review has both cases: all documents uploaded, and one missing
  const uploaded = (a: (typeof apps)[number]) => Object.keys(a.uploadedDocuments ?? {}).length;
  assert.ok(apps.some((a) => a.status === 'Submitted' && uploaded(a) === jk.requirements.length));
  assert.ok(apps.some((a) => a.status === 'Submitted' && uploaded(a) === jk.requirements.length - 1));
  // Seeded children are unique (conversations find their family by child id)
  assert.equal(new Set(INITIAL_APPLICATIONS.map((a) => `${a.centreId}/${a.childId}`)).size, INITIAL_APPLICATIONS.length);
});
