import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { MemoryRepo } from './repo';
import { buildSeedWorld, actorOf, PasswordHasher, Actor } from './world';
import * as svc from './service';
import { AccessError, InputError } from './access';
import { DEMO_CENTRE_ID, HARMONY_ID, JESSE_KETCHUM_ID } from '../data/demoCentres';
import { conversationKey } from '../data/mockData';

const hasher: PasswordHasher = {
  hash: async (p) => createHash('sha256').update(p).digest('hex'),
  verify: async (p, h) => createHash('sha256').update(p).digest('hex') === h,
};

const child = (firstName: string) => ({
  id: 'tmp',
  firstName,
  dateOfBirth: '2025-03-10',
  careType: 'Full day' as const,
  preferredStartDate: 'January 2027',
  homeArea: 'Danforth & Pape',
  notes: '',
});

/** Seeded world + a second parent (Alex) and a second centre (Sunny Steps). */
async function setup() {
  const repo = new MemoryRepo(await buildSeedWorld(hasher));
  const priya = actorOf((await repo.getAccount('parent-priya'))!);
  const demoCentre = actorOf((await repo.getAccount('centre-careq-demo'))!);
  const jesseKetchum = actorOf((await repo.getAccount(`centre-${JESSE_KETCHUM_ID}`))!);

  const alexAcc = await svc.signUp(repo, hasher, { role: 'parent', name: 'Alex Morgan', email: 'alex@example.ca', password: 'alexpass1' });
  const alex: Actor = actorOf(alexAcc);
  await svc.completeOnboarding(repo, alex, [child('Mila')]);

  const sunnyAcc = await svc.signUp(repo, hasher, { role: 'centre', name: 'Jordan Lee', email: 'jordan@sunny.example', password: 'sunnysteps1' });
  const sunnyId = await svc.registerCentre(
    repo,
    actorOf(sunnyAcc),
    {
      name: 'Sunny Steps', street: '640 Pape Ave', postalCode: 'M4K 3S3', neighbourhood: 'Danforth & Pape', licenceNumber: '',
      ageGroups: ['Toddler'], programOptions: ['Full day'], languages: ['English'], hours: '8 – 6', capacity: '', contactEmail: 'jordan@sunny.example', policyText: '',
    },
    undefined,
    [{ name: 'Danforth & Pape', aliases: [], lat: 43.68, lng: -79.34 }],
    {}
  );
  const sunny = actorOf((await repo.getAccount(sunnyAcc.id))!);
  return { repo, priya, demoCentre, jesseKetchum, alex, sunny, sunnyId };
}

const rejects403 = (p: Promise<unknown>) => assert.rejects(p, (e) => e instanceof AccessError && (e as AccessError).status === 403);
const rejectsHidden = rejects403; // other people's records: 403

test('a parent only ever sees their own applications, conversations and notifications', async () => {
  const { repo, priya, alex } = await setup();
  const alexSnap = await svc.getSnapshot(repo, (await repo.getAccount(alex.accountId))!);
  assert.equal(alexSnap.applications.length, 0);
  assert.deepEqual(alexSnap.conversations, {});
  assert.equal(alexSnap.notifications.length, 0);
  assert.equal(alexSnap.supportRequests.length, 0);
  const priyaSnap = await svc.getSnapshot(repo, (await repo.getAccount(priya.accountId))!);
  assert.ok(priyaSnap.applications.length > 0);
  assert.ok(priyaSnap.applications.every((a) => a.parentAccountId === priya.accountId));
  assert.ok(Object.keys(priyaSnap.conversations).every((k) => k.endsWith('child-anya')));
});

test("a parent can't read or change another parent's application (403/404)", async () => {
  const { repo, alex, priya } = await setup();
  // A draft Priya starts at B.F. Toronto (real centre, simulated application)
  const draftId = await svc.createDraft(repo, priya, 'on-07205');
  await rejectsHidden(svc.updateDraft(repo, alex, draftId, { kind: 'noteToCentre', note: 'hijack' }));
  await rejectsHidden(svc.submitApplication(repo, alex, draftId));
  await rejectsHidden(svc.withdrawApplication(repo, alex, 'app-careq-demo-anya'));
  assert.equal((await repo.getApplication(draftId))!.status, 'Draft'); // unchanged
});

test("a centre can't read another centre's applications, or any drafts", async () => {
  const { repo, demoCentre, jesseKetchum, sunny, sunnyId, alex } = await setup();
  const draftId = await svc.createDraft(repo, alex, sunnyId);
  const sunnySnap = await svc.getSnapshot(repo, (await repo.getAccount(sunny.accountId))!);
  assert.equal(sunnySnap.applications.length, 0, 'draft not visible to the centre');
  await svc.submitApplication(repo, alex, draftId);
  const after = await svc.getSnapshot(repo, (await repo.getAccount(sunny.accountId))!);
  assert.deepEqual(after.applications.map((a) => a.id), [draftId]);
  const demoSnap = await svc.getSnapshot(repo, (await repo.getAccount(demoCentre.accountId))!);
  assert.ok(!demoSnap.applications.some((a) => a.id === draftId));
  assert.ok(demoSnap.applications.every((a) => a.centreId === DEMO_CENTRE_ID && a.status !== 'Draft'));
  // A real centre's simulated account sees only its own centre's applications
  const jkSnap = await svc.getSnapshot(repo, (await repo.getAccount(jesseKetchum.accountId))!);
  assert.ok(jkSnap.applications.length >= 3);
  assert.ok(jkSnap.applications.every((a) => a.centreId === JESSE_KETCHUM_ID));
  // The demo centre can't change Sunny Steps' or Jesse Ketchum's applications
  await rejectsHidden(svc.setStatus(repo, demoCentre, draftId, 'Waitlisted', 2));
  await rejectsHidden(svc.setStatus(repo, demoCentre, 'app-jesse-ketchum-anya', 'Offer'));
  // ... or Sunny Steps' requirements
  await rejects403(svc.updateRequirements(repo, demoCentre, sunnyId, ['X'], {}));
});

test('end to end: submit -> centre waitlists -> parent sees position; notifications go to the right people', async () => {
  const { repo, alex, sunny, sunnyId } = await setup();
  const id = await svc.createDraft(repo, alex, sunnyId);
  await svc.submitApplication(repo, alex, id);
  await svc.setStatus(repo, sunny, id, 'Waitlisted', 3);
  const alexSnap = await svc.getSnapshot(repo, (await repo.getAccount(alex.accountId))!);
  const app = alexSnap.applications.find((a) => a.id === id)!;
  assert.equal(app.waitlistPosition, 3);
  assert.equal(app.waitlistReportedBy, 'Sunny Steps');
  assert.ok(alexSnap.notifications.some((n) => /Sunny Steps updated your position to 3/.test(n.message)));
  const priyaSnap = await svc.getSnapshot(repo, (await repo.getAccount('parent-priya'))!);
  assert.ok(!priyaSnap.notifications.some((n) => /Sunny Steps/.test(n.message)));
});

test('messages: parents only about their own child; centres only with connected families', async () => {
  const { repo, alex, priya, demoCentre, jesseKetchum, sunny, sunnyId } = await setup();
  const alexChild = (await repo.listChildren(alex.accountId))[0].id;
  // Alex can't write as if about Priya's child
  await rejects403(svc.sendMessage(repo, alex, { centreId: DEMO_CENTRE_ID, childId: 'child-anya' }, 'hello', false));
  // Sunny Steps can't message a family that never applied or wrote
  await rejects403(svc.sendMessage(repo, sunny, { centreId: sunnyId, childId: alexChild }, 'hi', false));
  // The demo centre can't post into another centre's conversation
  await rejects403(svc.sendMessage(repo, demoCentre, { centreId: sunnyId, childId: alexChild }, 'hi', false));
  await rejects403(svc.sendMessage(repo, demoCentre, { centreId: JESSE_KETCHUM_ID, childId: 'child-anya' }, 'hi', false));
  // Allowed: Priya -> Jesse Ketchum about Anya (centre id contains "-"); its simulated account replies
  await svc.sendMessage(repo, priya, { centreId: JESSE_KETCHUM_ID, childId: 'child-anya' }, 'Hello', false);
  await svc.sendMessage(repo, jesseKetchum, { centreId: JESSE_KETCHUM_ID, childId: 'child-anya' }, 'Hello Priya', false);
  const thread = (await svc.getSnapshot(repo, (await repo.getAccount(priya.accountId))!)).conversations[`${JESSE_KETCHUM_ID}-child-anya`];
  assert.equal(thread.at(-1)!.text, 'Hello Priya');
  assert.equal(thread.at(-1)!.senderName, 'Jesse Ketchum Early Learning & Child Care Centre');
  const alexSnap = await svc.getSnapshot(repo, (await repo.getAccount(alex.accountId))!);
  assert.deepEqual(alexSnap.conversations, {});
});

test("parent-only AI drafts are never sent to centres", async () => {
  const { repo, alex, sunny, sunnyId } = await setup();
  const id = await svc.createDraft(repo, alex, sunnyId);
  await svc.updateDraft(repo, alex, id, {
    kind: 'preparedDraft',
    draft: { fields: [], checklist: [], missingItems: [], noteToCentre: 'secret draft', aiMode: 'fallback', modelUsed: null },
  });
  assert.ok((await svc.getSnapshot(repo, (await repo.getAccount(alex.accountId))!)).preparedDrafts[id]);
  await svc.withdrawApplication(repo, alex, id).catch(() => {}); // drafts can't be withdrawn
  const sunnySnap = await svc.getSnapshot(repo, (await repo.getAccount(sunny.accountId))!);
  assert.deepEqual(sunnySnap.preparedDrafts, {});
  assert.ok(!JSON.stringify(sunnySnap).includes('secret draft'));
});

test('accounts: duplicate email, wrong password, demo password, hashes never in the snapshot', async () => {
  const { repo } = await setup();
  await assert.rejects(svc.signUp(repo, hasher, { role: 'parent', name: 'X', email: 'ALEX@example.ca', password: 'whatever12' }), /already exists/);
  await assert.rejects(svc.logIn(repo, hasher, { role: 'parent', email: 'priya@example.ca', password: 'nope' }), /demo accounts use the password "password"/);
  await assert.rejects(svc.logIn(repo, hasher, { role: 'centre', email: 'priya@example.ca', password: 'password' }), /couldn't find a centre account/);
  const priya = await svc.logIn(repo, hasher, { role: 'parent', email: 'priya@example.ca', password: 'password' });
  const snap = await svc.getSnapshot(repo, priya);
  assert.ok(!JSON.stringify(snap).includes(priya.passwordHash));
  assert.equal(snap.account?.isDemoAccount, true);
});

test("a centre that doesn't serve the child's age group can't get an application (Harmony is preschool-only)", async () => {
  const { repo, priya } = await setup();
  await assert.rejects(svc.createDraft(repo, priya, HARMONY_ID), (e) => e instanceof InputError && /Doesn't serve toddlers/.test(e.message));
});

test('seeded conversations keep the right centre and child for ids with "-"', async () => {
  const world = await buildSeedWorld(hasher);
  const jk = world.conversations.find((c) => c.centreId === JESSE_KETCHUM_ID && c.childId === 'child-anya');
  assert.ok(jk);
  assert.equal(jk.key, `${JESSE_KETCHUM_ID}-child-anya`);
  assert.equal(jk.parentAccountId, 'parent-priya');
  assert.ok(world.conversations.every((c) => c.parentAccountId !== 'unknown'));
});

test('policy reader: confirmed requirements replace the old ones with their quotes, citations and links (no stale citations)', async () => {
  const { repo, jesseKetchum } = await setup();
  const before = (await repo.getCentre(JESSE_KETCHUM_ID))!;
  assert.ok(Object.keys(before.requirementCitations ?? {}).length > 0);

  await svc.updateRequirements(
    repo,
    jesseKetchum,
    JESSE_KETCHUM_ID,
    ['Child Admission Package', 'Immunization record'],
    { 'Child Admission Package': 'the Centre Supervisor will review the Child Admission Package', 'Immunization record': 'collect and retain up-to-date immunization' },
    {
      'Child Admission Package': { citation: 'Parent Handbook (March 2026), PDF p.13', sourceUrl: 'https://www.toronto.ca/handbook.pdf' },
      'Immunization record': { citation: 'Parent Handbook (March 2026), PDF p.14', sourceUrl: 'https://www.toronto.ca/handbook.pdf' },
    },
    { docTitle: 'Parent Handbook (March 2026)', sourceUrl: 'https://www.toronto.ca/handbook.pdf', sourceNote: 'Exact file' }
  );
  const after = (await repo.getCentre(JESSE_KETCHUM_ID))!;
  assert.deepEqual(after.requirements, ['Child Admission Package', 'Immunization record']);
  assert.deepEqual(Object.keys(after.requirementCitations!), ['Child Admission Package', 'Immunization record']);
  assert.equal(after.requirementCitations!['Immunization record'], 'Parent Handbook (March 2026), PDF p.14');
  assert.equal(after.requirementSourceUrls!['Child Admission Package'], 'https://www.toronto.ca/handbook.pdf');
  assert.equal(after.requirementsExtractedFrom!.docTitle, 'Parent Handbook (March 2026)');

  // Pasted policy (no citations): the old citations and source document are removed, not left stale
  await svc.updateRequirements(repo, jesseKetchum, JESSE_KETCHUM_ID, ['Birth certificate'], { 'Birth certificate': 'Bring a birth certificate.' });
  const pasted = (await repo.getCentre(JESSE_KETCHUM_ID))!;
  assert.equal(pasted.requirementCitations, undefined);
  assert.equal(pasted.requirementSourceUrls, undefined);
  assert.equal(pasted.requirementsExtractedFrom, undefined);
});

test('uploads are recorded for self-registered centres only, and only by their own staff', async () => {
  const { repo, sunny, sunnyId, jesseKetchum } = await setup();
  const doc = { docKey: `self-${sunnyId}/handbook.pdf`, docTitle: 'Handbook', fileName: 'handbook.pdf', chunks: 4, keywordOnly: 4 };
  await svc.recordCentreDocument(repo, sunny, sunnyId, doc);
  await svc.recordCentreDocument(repo, sunny, sunnyId, { ...doc, chunks: 5 }); // re-upload replaces
  const docs = (await repo.getCentre(sunnyId))!.registration!.documents!;
  assert.equal(docs.length, 1);
  assert.equal(docs[0].chunks, 5);
  await rejects403(svc.recordCentreDocument(repo, jesseKetchum, sunnyId, doc)); // another centre
  await rejects403(svc.recordCentreDocument(repo, jesseKetchum, JESSE_KETCHUM_ID, doc)); // real demo centre: no uploads
});

test('a licence check result from the server is stored on the registration', async () => {
  const repo = new MemoryRepo(await buildSeedWorld(hasher));
  const acc = await svc.signUp(repo, hasher, { role: 'centre', name: 'Sam', email: 'sam@x.example', password: 'sampass12' });
  const id = await svc.registerCentre(
    repo,
    actorOf(acc),
    {
      name: 'Licensed Place', street: '1 Main St', postalCode: 'M4K 3S3', neighbourhood: 'Danforth & Pape', licenceNumber: '00576',
      ageGroups: ['Toddler'], programOptions: ['Full day'], languages: ['English'], hours: '8 – 6', capacity: '', contactEmail: 'sam@x.example', policyText: '',
    },
    undefined,
    [{ name: 'Danforth & Pape', aliases: [], lat: 43.68, lng: -79.34 }],
    {},
    { source: 'Ontario open data', openDataId: 'on-00576', matchedName: 'Jesse Ketchum', matchedBy: 'licence number and postal code', dataDate: null }
  );
  assert.equal((await repo.getCentre(id))!.registration!.licenceVerified!.openDataId, 'on-00576');
});

test('a message sent from a simulated-data AI draft is tagged for both sides (demo centres only)', async () => {
  const { repo, priya, sunny, sunnyId, alex } = await setup();
  await svc.sendMessage(repo, priya, { centreId: JESSE_KETCHUM_ID, childId: 'child-anya' }, 'Thank you for the update.', true, new Date(), true);
  await svc.sendMessage(repo, priya, { centreId: JESSE_KETCHUM_ID, childId: 'child-anya' }, 'Typed myself.', false, new Date(), true);
  const msgs = (await repo.getConversation(conversationKey(JESSE_KETCHUM_ID, 'child-anya')))!.messages;
  assert.equal(msgs.at(-2)!.basedOnSimulatedData, true);
  assert.equal(msgs.at(-1)!.basedOnSimulatedData, undefined); // not AI-assisted: no tag
  void sunny; void sunnyId; void alex;
});
