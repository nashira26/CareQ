import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { MemoryRepo } from './repo';
import { buildSeedWorld, actorOf, PasswordHasher } from './world';
import * as svc from './service';
import { AccessError } from './access';
import { acceptedMessage, otherOpenApplications, withdrawalLabel } from './offers';
import { attentionItems, buildParentUpdates } from './parentUpdates';
import { JESSE_KETCHUM_ID } from '../data/demoCentres';

const hasher: PasswordHasher = {
  hash: async (p) => createHash('sha256').update(p).digest('hex'),
  verify: async (p, h) => createHash('sha256').update(p).digest('hex') === h,
};
const NOW = new Date('2026-11-10T15:00:00Z');
const DAY = NOW.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // "Nov 10"
const MACAULAY = 'app-macaulay-anya';

async function setup() {
  const repo = new MemoryRepo(await buildSeedWorld(hasher));
  const priya = actorOf((await repo.getAccount('parent-priya'))!);
  const jk = actorOf((await repo.getAccount(`centre-${JESSE_KETCHUM_ID}`))!);
  // A second child of Priya's with her own waitlisted application: accepting for Anya must not touch it
  await repo.insertApplication({
    id: 'app-leaside-ben', centreId: 'on-0002575', parentAccountId: priya.accountId, childId: 'child-ben',
    parentName: 'Priya', childName: 'Ben', childAgeMonths: 40, careType: 'Full day', preferredStartDate: 'May 2027',
    status: 'Waitlisted', waitlistPosition: 7, submittedAt: 'Oct 2, 2026', completedRequirements: [],
  });
  const snap = async (accountId: string) => svc.getSnapshot(repo, (await repo.getAccount(accountId))!);
  return { repo, priya, jk, snap };
}

test('accept with others: same child only; sent apps and offers withdrawn with the reason, drafts deleted', async () => {
  const { repo, priya, snap } = await setup();
  const before = (await repo.listApplications({ parentAccountId: priya.accountId })).filter((a) => a.childId === 'child-anya');
  const expected = otherOpenApplications(before, { id: MACAULAY, childId: 'child-anya' });
  assert.deepEqual(
    expected.map((a) => a.status).sort(),
    ['Draft', 'Submitted', 'Submitted', 'Waitlisted', 'Waitlisted'],
    "Anya's seed: two waitlisted, two sent, one draft"
  );

  const { closed } = await svc.acceptOffer(repo, priya, MACAULAY, NOW);
  assert.equal(closed, 5);
  assert.equal(acceptedMessage(closed), 'Offer accepted. You withdrew 5 applications, and those places can now go to other families.');

  const after = await repo.listApplications({ parentAccountId: priya.accountId });
  assert.equal(after.find((a) => a.id === MACAULAY)!.status, 'Accepted');
  for (const o of expected) {
    const now = after.find((a) => a.id === o.id);
    if (o.status === 'Draft') {
      assert.equal(now, undefined, `draft ${o.id} deleted`);
    } else {
      assert.equal(now!.status, 'Withdrawn');
      assert.deepEqual(now!.withdrawal, { reason: 'accepted-other', date: DAY, acceptedApplicationId: MACAULAY });
    }
  }
  // Ben (another child) is untouched
  assert.equal(after.find((a) => a.id === 'app-leaside-ben')!.status, 'Waitlisted');

  // Parent labels name the accepted centre; Updates has every change with the date
  const p = await snap(priya.accountId);
  const jkApp = p.applications.find((a) => a.id === 'app-jesse-ketchum-anya')!;
  assert.equal(withdrawalLabel(jkApp, 'parent', { applications: p.applications, centres: p.centres }), `Withdrawn when you accepted Macaulay · ${DAY}`);
  const updates = buildParentUpdates({ notifications: p.notifications, conversations: {}, applications: p.applications, centres: p.centres, childIds: ['child-anya'] });
  const today = updates.filter((u) => u.label.endsWith(`· ${DAY}`));
  assert.equal(today.length, 6, 'accepted + 4 withdrawn + 1 draft deleted');
  assert.ok(today.some((u) => /you accepted the offer for Anya/.test(u.text)));
  assert.ok(today.some((u) => /draft for Anya deleted when you accepted Macaulay/.test(u.text)));
  assert.ok(today.every((u) => !u.unread), "the parent's own actions don't add to the badge");
});

test('accept with none: only that application changes', async () => {
  const { repo, priya } = await setup();
  for (const a of await repo.listApplications({ parentAccountId: priya.accountId, childId: 'child-anya' })) {
    if (a.id !== MACAULAY) await repo.updateApplication(a.id, { status: 'Withdrawn' });
  }
  const before = await repo.listApplications({ parentAccountId: priya.accountId });
  const { closed } = await svc.acceptOffer(repo, priya, MACAULAY, NOW);
  assert.equal(closed, 0);
  assert.equal(acceptedMessage(0), 'Offer accepted.');
  const after = await repo.listApplications({ parentAccountId: priya.accountId });
  assert.equal(after.length, before.length);
  for (const a of after) {
    const was = before.find((b) => b.id === a.id)!;
    assert.equal(a.status, a.id === MACAULAY ? 'Accepted' : was.status);
    assert.equal(a.withdrawal, undefined);
  }
});

test('cancel changes nothing: the offer stays open and stays on Home as an action item', async () => {
  const { repo, priya, snap } = await setup();
  const before = JSON.stringify(await repo.listApplications({ parentAccountId: priya.accountId }));
  // Cancel = the dialog closes without calling acceptOffer / declineOffer
  const p = await snap(priya.accountId);
  assert.equal(JSON.stringify(await repo.listApplications({ parentAccountId: priya.accountId })), before);
  assert.equal(p.applications.find((a) => a.id === MACAULAY)!.status, 'Offer');
  const items = attentionItems({ applications: p.applications, centres: p.centres, updates: [] });
  assert.equal(items[0].id, `offer-${MACAULAY}`);
});

test('decline: only that application is withdrawn ("Offer declined by you"); the centre is told', async () => {
  const { repo, priya, snap } = await setup();
  const before = await repo.listApplications({ parentAccountId: priya.accountId });
  await svc.declineOffer(repo, priya, MACAULAY, NOW);
  const after = await repo.listApplications({ parentAccountId: priya.accountId });
  for (const a of after) {
    if (a.id === MACAULAY) {
      assert.equal(a.status, 'Withdrawn');
      assert.deepEqual(a.withdrawal, { reason: 'declined', date: DAY });
    } else assert.equal(a.status, before.find((b) => b.id === a.id)!.status);
  }
  const p = await snap(priya.accountId);
  assert.equal(withdrawalLabel(p.applications.find((a) => a.id === MACAULAY)!, 'parent'), `Offer declined by you · ${DAY}`);
  const macaulayStaff = (await repo.getAccount('centre-on-0004062'))!;
  const c = await svc.getSnapshot(repo, macaulayStaff);
  assert.equal(withdrawalLabel(c.applications.find((a) => a.id === MACAULAY)!, 'centre'), `Offer declined by the family · ${DAY}`);
  assert.ok(c.notifications.some((n) => n.message === `Priya declined the offer for Anya on ${DAY}`));
  // Only an open offer can be declined, and only by its family
  await assert.rejects(svc.declineOffer(repo, priya, 'app-wellesley-anya', NOW), AccessError);
  await assert.rejects(svc.acceptOffer(repo, actorOf(macaulayStaff), MACAULAY, NOW), AccessError);
});

test("centre labels: 'Withdrawn by the family', never the other centre's name", async () => {
  const { repo, priya, jk } = await setup();
  await svc.acceptOffer(repo, priya, MACAULAY, NOW);
  const c = await svc.getSnapshot(repo, (await repo.getAccount(jk.accountId))!);
  const anya = c.applications.find((a) => a.id === 'app-jesse-ketchum-anya')!;
  assert.equal(anya.status, 'Withdrawn');
  assert.equal(withdrawalLabel(anya, 'centre'), `Withdrawn by the family · ${DAY}`);
  // The snapshot sent to the centre carries no trace of the accepted application
  assert.deepEqual(anya.withdrawal, { reason: 'accepted-other', date: DAY });
  // (The public centre list names every centre; the centre's applications and notifications must not)
  const sent = JSON.stringify([c.applications, c.notifications]);
  assert.ok(!/macaulay|on-0004062/i.test(sent), "no trace of the family's choice in the centre's applications or notifications");
  assert.ok(c.notifications.some((n) => n.message === `Priya withdrew the application for Anya on ${DAY}`));
  // A plain withdrawal reads the same for the centre
  assert.equal(withdrawalLabel({ status: 'Withdrawn', withdrawal: { reason: 'withdrawn', date: 'Oct 3' } }, 'centre'), 'Withdrawn by the family · Oct 3');
  assert.equal(withdrawalLabel({ status: 'Waitlisted' }, 'centre'), null);
});
