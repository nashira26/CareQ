import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_APPLICATIONS, INITIAL_NOTIFICATIONS, INITIAL_CONVERSATIONS, INITIAL_CENTRES, PRIYA_ACCOUNT_ID, conversationKey } from '../data/mockData';
import { applicationCounts, attentionItems, buildParentUpdates, messageDate, shortCentreName } from './parentUpdates';

const priyaApps = INITIAL_APPLICATIONS.filter((a) => a.parentAccountId === PRIYA_ACCOUNT_ID);
const conversations = Object.fromEntries(INITIAL_CONVERSATIONS.map((c) => [conversationKey(c.centreId, c.childId), c.messages]));
const updates = buildParentUpdates({
  notifications: INITIAL_NOTIFICATIONS.filter((n) => n.recipientId === PRIYA_ACCOUNT_ID),
  conversations,
  applications: priyaApps,
  centres: INITIAL_CENTRES,
  childIds: ['child-anya'],
});

test('Updates: Priya has several dated updates, newest first, each with a readable label and her application', () => {
  assert.ok(updates.length >= 5, `${updates.length} updates`);
  for (let i = 1; i < updates.length; i++) assert.ok(updates[i - 1].sortKey >= updates[i].sortKey, 'newest first');
  const offer = updates.find((u) => u.kind === 'offer')!;
  assert.equal(offer.headline, 'Offer received');
  assert.equal(offer.label, 'Offer · Macaulay · Nov 4');
  assert.equal(offer.applicationId, 'app-macaulay-anya');
  const waitlist = updates.find((u) => u.kind === 'waitlist')!;
  assert.equal(waitlist.headline, 'Waitlist position updated');
  assert.match(waitlist.label, /^Waitlist · Jesse Ketchum Early Learning & Child Care Centre · Nov 2$/);
  const message = updates.find((u) => u.kind === 'message')!;
  assert.equal(message.headline, 'Message from the centre');
  assert.ok(message.applicationId, 'centre messages link to the application');
  // Only Priya's own conversations (Anya), never other families'
  assert.ok(updates.every((u) => !/Lucas|Maya|Chloe/.test(u.text)));
});

test('Home: at most 3 action items: the offer first, then the new position, then the draft', () => {
  const items = attentionItems({ applications: priyaApps, centres: INITIAL_CENTRES, updates });
  assert.ok(items.length <= 3);
  assert.equal(items[0].title, 'Respond to your offer');
  assert.equal(items[0].tab, 'track');
  assert.ok(items.some((i) => i.title === 'New waitlist position'));
  assert.ok(items.some((i) => i.tab === 'apply'), 'the seeded draft needs finishing');
});

test("Home counts: Priya's seed has a draft, sent applications and one offer", () => {
  const c = applicationCounts(priyaApps);
  assert.ok(c.preparing >= 1);
  assert.equal(c.sent, 5);
  assert.equal(c.offers, 1);
});

test('helpers: short centre names and message dates', () => {
  assert.equal(shortCentreName('Macaulay - Dovercourt Child Care Centre'), 'Macaulay');
  assert.equal(shortCentreName('Leaside Day Care Centre (Rolph Road Day Care)'), 'Leaside Day Care Centre');
  assert.equal(shortCentreName('CareQ Demo Centre (fictional)'), 'CareQ Demo Centre');
  assert.equal(messageDate('Nov 4, 2026 • 11:20 AM').day, 'Nov 4');
  assert.ok(messageDate('Nov 4, 2026 • 11:20 AM').key > messageDate('Oct 29, 2026 • 3:45 PM').key);
});
