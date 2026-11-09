/**
 * Profile page: scoping (a user only edits their own account, children and centre) and validation.
 * Runs the service layer over the in-memory repo, as local mode does; the API adds body validation on top.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { MemoryRepo } from './repo';
import { buildSeedWorld, actorOf, PasswordHasher, Actor } from './world';
import * as svc from './service';
import { AccessError, InputError } from './access';
import { DEMO_CENTRE_ID, JESSE_KETCHUM_ID } from '../data/demoCentres';
import { childRecordError, childToForm, licenceLabel, shownHours, splitAddress, startMonthFromLabel } from './family';
import type { Area, FsaCentroids } from './rankCentres';
import torontoAreas from '../data/torontoAreas.json';
import fsaCentroids from '../data/fsaCentroids.json';

const AREAS = (torontoAreas as { areas: Area[] }).areas;
const FSA = fsaCentroids as FsaCentroids;
const hasher: PasswordHasher = {
  hash: async (p) => createHash('sha256').update(p).digest('hex'),
  verify: async (p, h) => createHash('sha256').update(p).digest('hex') === h,
};

/** A child born `monthsAgo` months before today (keeps the tests valid as time passes). */
const bornMonthsAgo = (monthsAgo: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
};
const childInput = (firstName: string, over: Partial<svc.ChildInput> = {}): svc.ChildInput => ({
  firstName,
  dateOfBirth: bornMonthsAgo(18),
  careType: 'Full day',
  preferredStartDate: 'January 2028',
  homeArea: 'Danforth & Pape',
  notes: '',
  ...over,
});
const sunnyForm = {
  name: 'Sunny Steps', street: '640 Pape Ave', postalCode: 'M4K 3S3', neighbourhood: 'Danforth & Pape', licenceNumber: '',
  ageGroups: ['Toddler' as const], programOptions: ['Full day'], languages: ['English'], hours: '8 AM – 6 PM', capacity: '', contactEmail: 'jordan@sunny.example', policyText: '',
};

async function setup() {
  const repo = new MemoryRepo(await buildSeedWorld(hasher));
  const priya = actorOf((await repo.getAccount('parent-priya'))!);
  const demoCentre = actorOf((await repo.getAccount('centre-careq-demo'))!);
  const jesseKetchum = actorOf((await repo.getAccount(`centre-${JESSE_KETCHUM_ID}`))!);
  const alexAcc = await svc.signUp(repo, hasher, { role: 'parent', name: 'Alex Morgan', email: 'alex@example.ca', password: 'alexpass1' });
  const alex: Actor = actorOf(alexAcc);
  await svc.completeOnboarding(repo, alex, [{ id: 'tmp', ...childInput('Mila') }]);
  const mk = async (email: string, name: string) => {
    const acc = await svc.signUp(repo, hasher, { role: 'centre', name, email, password: 'centrepass1' });
    const id = await svc.registerCentre(repo, actorOf(acc), { ...sunnyForm, name, contactEmail: email }, undefined, AREAS, FSA);
    return { id, actor: actorOf((await repo.getAccount(acc.id))!) };
  };
  const sunny = await mk('jordan@sunny.example', 'Sunny Steps');
  const maple = await mk('sam@maple.example', 'Maple Tree House');
  return { repo, priya, alex, demoCentre, jesseKetchum, sunny, maple };
}

const rejects = (status: number, p: Promise<unknown>, message?: RegExp) =>
  assert.rejects(p, (e) => (e as { status?: number }).status === status && (!message || message.test((e as Error).message)));

// ---------------- Scoping ----------------

test("a parent can't edit or remove another parent's child (403), and the child is unchanged", async () => {
  const { repo, alex } = await setup();
  await rejects(403, svc.updateChild(repo, alex, 'child-anya', childInput('Hijacked'), AREAS));
  await rejects(403, svc.removeChild(repo, alex, 'child-anya'));
  assert.equal((await repo.getChild('child-anya'))!.firstName, 'Anya');
  // Unknown ids are 404, centres can't touch children at all
  await rejects(404, svc.updateChild(repo, alex, 'child-nope', childInput('X'), AREAS));
  const { demoCentre } = await setup();
  await rejects(403, svc.addChild(repo, demoCentre, childInput('X'), AREAS));
});

test('a parent adds a child to their own account only; the first child stays the active child', async () => {
  const { repo, priya, alex } = await setup();
  await svc.addChild(repo, priya, childInput('Ravi', { homeArea: 'the annex' }), AREAS);
  const kids = await repo.listChildren(priya.accountId);
  assert.deepEqual(kids.map((c) => c.firstName), ['Anya', 'Ravi']);
  assert.equal(kids[1].homeArea, 'The Annex', 'area normalised to its list name');
  assert.equal((await repo.listChildren(alex.accountId)).length, 1, "nothing added to Alex's account");
  const snap = await svc.getSnapshot(repo, (await repo.getAccount(priya.accountId))!);
  assert.equal(snap.account!.children![0].id, 'child-anya');
});

test("a centre can't edit another centre (403): details, simulated contact, or a demo centre's open-data details", async () => {
  const { repo, sunny, maple, demoCentre, jesseKetchum } = await setup();
  await rejects(403, svc.updateCentreDetails(repo, sunny.actor, maple.id, { ...sunnyForm, name: 'Taken over' }, undefined, AREAS, FSA));
  await rejects(403, svc.updateSimulatedContact(repo, sunny.actor, DEMO_CENTRE_ID, { hours: '9 – 5', contactEmail: '' }));
  await rejects(403, svc.updateSimulatedContact(repo, demoCentre, JESSE_KETCHUM_ID, { hours: '9 – 5', contactEmail: '' }));
  await rejects(403, svc.updateSimulatedContact(repo, demoCentre, maple.id, { hours: '9 – 5', contactEmail: '' }));
  assert.equal((await repo.getCentre(maple.id))!.name, 'Maple Tree House');
  // Parents can't edit centres
  const { priya } = await setup();
  await rejects(403, svc.updateCentreDetails(repo, priya, maple.id, sunnyForm, undefined, AREAS, FSA));
  // A demo centre's own open-data details are read-only, even for its own account
  await rejects(
    403,
    svc.updateCentreDetails(repo, jesseKetchum, JESSE_KETCHUM_ID, { ...sunnyForm, name: 'Renamed' }, undefined, AREAS, FSA),
    /Ontario open data/
  );
  assert.equal((await repo.getCentre(JESSE_KETCHUM_ID))!.name, 'Jesse Ketchum Early Learning & Child Care Centre');
});

test('account changes only ever touch the signed-in account', async () => {
  const { repo, alex, priya } = await setup();
  await svc.updateAccountName(repo, alex, '  Alex M.  ');
  assert.equal((await repo.getAccount(alex.accountId))!.name, 'Alex M.');
  assert.equal((await repo.getAccount(priya.accountId))!.name, 'Priya Patel');
});

// ---------------- Children: validation and removal ----------------

test('child validation: date of birth in the past and under 6, known area, care type, notes length', async () => {
  const { repo, priya } = await setup();
  const bad: [Partial<svc.ChildInput>, RegExp][] = [
    [{ dateOfBirth: bornMonthsAgo(-2) }, /future/],
    [{ dateOfBirth: bornMonthsAgo(73) }, /under 6/],
    [{ dateOfBirth: '2025-02-31x' }, /valid date/],
    [{ firstName: '  ' }, /first name/],
    [{ homeArea: 'Narnia' }, /area/],
    [{ careType: 'Overnight' as never }, /type of care/],
    [{ notes: 'x'.repeat(501) }, /500/],
  ];
  for (const [over, msg] of bad) {
    await rejects(400, svc.addChild(repo, priya, childInput('Ravi', over), AREAS), msg);
    await rejects(400, svc.updateChild(repo, priya, 'child-anya', childInput('Anya', over), AREAS), msg);
  }
  assert.equal((await repo.listChildren(priya.accountId)).length, 1);
  assert.equal(childRecordError(childInput('Ok'), AREAS), null);
});

test("editing a child updates unsent drafts, not applications already sent", async () => {
  const { repo, priya } = await setup();
  const draftId = await svc.createDraft(repo, priya, 'on-07205');
  const sentBefore = (await repo.listApplications({ parentAccountId: priya.accountId })).find((a) => a.status === 'Submitted')!;
  const anya = (await repo.getChild('child-anya'))!;
  await svc.updateChild(repo, priya, 'child-anya', { ...anya, notes: 'Peanut allergy', homeArea: 'Leslieville' }, AREAS);
  assert.equal((await repo.getChild('child-anya'))!.notes, 'Peanut allergy');
  assert.equal((await repo.getChild('child-anya'))!.homeArea, 'Leslieville');
  assert.equal((await repo.getApplication(draftId))!.parentNotes, 'Peanut allergy');
  assert.deepEqual(await repo.getApplication(sentBefore.id), sentBefore);
});

test("a child can't be removed while they have applications other than Withdrawn, or if they're the only child", async () => {
  const { repo, priya, alex } = await setup();
  await rejects(400, svc.removeChild(repo, priya, 'child-anya'), /can't be removed/);
  const mila = (await repo.listChildren(alex.accountId))[0];
  await rejects(400, svc.removeChild(repo, alex, mila.id), /at least one child/);

  await svc.addChild(repo, alex, childInput('Theo'), AREAS);
  const theo = (await repo.listChildren(alex.accountId))[1];
  // A sent application (not withdrawn) blocks removal; withdrawn ones don't
  const appId = 'app-test-theo';
  await repo.insertApplication({
    id: appId, centreId: DEMO_CENTRE_ID, parentAccountId: alex.accountId, childId: theo.id, parentName: 'Alex', childName: 'Theo',
    childAgeMonths: 18, careType: 'Full day', preferredStartDate: 'January 2028', status: 'Submitted', completedRequirements: [],
  });
  await rejects(400, svc.removeChild(repo, alex, theo.id), /Submitted/);
  await svc.withdrawApplication(repo, alex, appId);
  await svc.removeChild(repo, alex, theo.id);
  assert.deepEqual((await repo.listChildren(alex.accountId)).map((c) => c.firstName), ['Mila']);
});

// ---------------- Passwords ----------------

test("password: demo accounts can't change it; others need the current password and 8+ characters", async () => {
  const { repo, priya, alex, jesseKetchum } = await setup();
  await rejects(403, svc.changePassword(repo, hasher, priya, 'password', 'newpassword1'), /Demo account/);
  await rejects(403, svc.changePassword(repo, hasher, jesseKetchum, 'password', 'newpassword1'), /Demo account/);
  await rejects(400, svc.changePassword(repo, hasher, alex, 'wrong-one', 'newpassword1'), /current password/);
  await rejects(400, svc.changePassword(repo, hasher, alex, 'alexpass1', 'short'), /8 characters/);
  await svc.changePassword(repo, hasher, alex, 'alexpass1', 'newpassword1');
  await assert.rejects(svc.logIn(repo, hasher, { role: 'parent', email: 'alex@example.ca', password: 'alexpass1' }), InputError);
  assert.ok(await svc.logIn(repo, hasher, { role: 'parent', email: 'alex@example.ca', password: 'newpassword1' }));
});

// ---------------- Centres ----------------

test('self-registered centre: edits re-run location and the licence label; photo kept, replaced or removed', async () => {
  const { repo, sunny } = await setup();
  const photo = 'data:image/jpeg;base64,AAAA';
  const verified = { source: 'Ontario open data' as const, openDataId: 'x', matchedName: 'Sunny Steps', matchedBy: 'licence number and name', dataDate: null };
  await svc.updateCentreDetails(repo, sunny.actor, sunny.id, { ...sunnyForm, neighbourhood: 'The Annex', licenceNumber: '12345' }, photo, AREAS, FSA, verified);
  let c = (await repo.getCentre(sunny.id))!;
  const annex = AREAS.find((a) => a.name === 'The Annex')!;
  assert.deepEqual([c.lat, c.lng, c.neighbourhood], [annex.lat, annex.lng, 'The Annex']);
  assert.equal(licenceLabel(c), 'Licensed · verified against Ontario open data');
  assert.equal(c.registration!.photoDataUrl, photo);
  assert.ok(c.registration!.registeredAt, 'registration date kept');

  // Saved again without a match: back to "not verified"; photo kept when undefined
  await svc.updateCentreDetails(repo, sunny.actor, sunny.id, { ...sunnyForm, name: 'Sunny Steps Annex' }, undefined, AREAS, FSA, undefined);
  c = (await repo.getCentre(sunny.id))!;
  assert.equal(licenceLabel(c), 'Self-registered · not verified');
  assert.equal(c.registration!.photoDataUrl, photo);
  assert.equal((await repo.getAccount(sunny.actor.accountId))!.centreName, 'Sunny Steps Annex');

  await svc.updateCentreDetails(repo, sunny.actor, sunny.id, sunnyForm, null, AREAS, FSA);
  assert.equal((await repo.getCentre(sunny.id))!.registration!.photoDataUrl, undefined);
});

test('self-registered centre: same validation as registration', async () => {
  const { repo, sunny } = await setup();
  const bad: [Partial<typeof sunnyForm>, RegExp][] = [
    [{ name: '' }, /centre name/],
    [{ postalCode: 'K1A 0B1' }, /Toronto postal code/],
    [{ neighbourhood: 'Narnia' }, /neighbourhood/],
    [{ ageGroups: [] as never }, /age group/],
    [{ capacity: '9000' }, /Capacity/],
    [{ contactEmail: 'nope' }, /contact email/],
    [{ licenceNumber: '!!' }, /letters, numbers/],
  ];
  for (const [over, msg] of bad) await rejects(400, svc.updateCentreDetails(repo, sunny.actor, sunny.id, { ...sunnyForm, ...over }, undefined, AREAS, FSA), msg);
  await rejects(400, svc.updateCentreDetails(repo, sunny.actor, sunny.id, sunnyForm, 'data:text/html;base64,AA', AREAS, FSA), /image/);
  assert.equal((await repo.getCentre(sunny.id))!.name, 'Sunny Steps');
});

test('demo centres: only simulated hours and contact email; open-data details untouched', async () => {
  const { repo, jesseKetchum, sunny } = await setup();
  const before = (await repo.getCentre(JESSE_KETCHUM_ID))!;
  await rejects(400, svc.updateSimulatedContact(repo, jesseKetchum, JESSE_KETCHUM_ID, { hours: '', contactEmail: 'not-an-email' }), /contact email/);
  await svc.updateSimulatedContact(repo, jesseKetchum, JESSE_KETCHUM_ID, { hours: '7:30 AM – 6 PM', contactEmail: 'jk.demo@careq.example' });
  const after = (await repo.getCentre(JESSE_KETCHUM_ID))!;
  assert.equal(after.simulatedContact!.hours, '7:30 AM – 6 PM');
  assert.deepEqual(shownHours(after), { text: '7:30 AM – 6 PM', simulated: true });
  const { simulatedContact: _s, ...rest } = after;
  assert.deepEqual(rest, before, 'open-data fields unchanged');
  // Clearing both removes the simulated details
  await svc.updateSimulatedContact(repo, jesseKetchum, JESSE_KETCHUM_ID, { hours: ' ', contactEmail: '' });
  assert.equal((await repo.getCentre(JESSE_KETCHUM_ID))!.simulatedContact, undefined);
  // A self-registered centre uses the details form instead
  await rejects(403, svc.updateSimulatedContact(repo, sunny.actor, sunny.id, { hours: '9', contactEmail: '' }));
});

// ---------------- Helpers ----------------

test('profile form helpers', () => {
  assert.equal(startMonthFromLabel('March 2027'), '2027-03');
  assert.equal(startMonthFromLabel('2027-11'), '2027-11');
  assert.equal(startMonthFromLabel('soon'), '');
  assert.deepEqual(splitAddress('640 Pape Ave, Toronto, ON M4K 3S3'), { street: '640 Pape Ave', postalCode: 'M4K 3S3' });
  assert.equal(childToForm({ id: 'a', ...childInput('A', { preferredStartDate: 'March 2027' }) }).startMonth, '2027-03');
  const removable = svc.childRemovalBlocker('c1', 2, [{ childId: 'c1', status: 'Withdrawn' }, { childId: 'c2', status: 'Offer' }]);
  assert.equal(removable, null);
  assert.match(svc.childRemovalBlocker('c1', 2, [{ childId: 'c1', status: 'Waitlisted' }])!, /Waitlisted/);
});

test('AccessError is a 403 (sanity)', () => {
  assert.equal(new AccessError().status, 403);
});
