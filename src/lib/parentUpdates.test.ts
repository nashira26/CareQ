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

test('Updates: centre messages are unread until the parent reads them, and then count toward the badge no more', () => {
  const input = {
    notifications: [],
    conversations,
    applications: priyaApps,
    centres: INITIAL_CENTRES,
    childIds: ['child-anya'],
  };
  const fresh = buildParentUpdates({ ...input, readMessageIds: new Set() }).filter((u) => u.kind === 'message');
  assert.ok(fresh.length > 0);
  assert.ok(fresh.every((u) => u.messageId && !u.notificationId));
  const unread = fresh.filter((u) => u.unread);
  assert.ok(unread.length > 0);
  const read = new Set([unread[0].messageId!]);
  const after = buildParentUpdates({ ...input, readMessageIds: read }).filter((u) => u.kind === 'message');
  assert.equal(after.filter((u) => u.unread).length, unread.length - 1);
  // Without a read list (old callers), messages never count as unread
  assert.ok(updates.filter((u) => u.kind === 'message').every((u) => !u.unread));
});

test('Updates: a centre message the parent replied after is read; the seeded badge shows only new items', () => {
  const at = (id: string) => buildParentUpdates({
    notifications: [],
    conversations,
    applications: priyaApps,
    centres: INITIAL_CENTRES,
    childIds: ['child-anya'],
    readMessageIds: new Set(),
  }).find((u) => u.messageId === id)!;
  assert.equal(at('m-jk-2').unread, false, 'Priya answered the Nov 2 update');
  assert.equal(at('m-mac-1').unread, true, 'the Macaulay offer message has no reply yet');
  // Conversations where the centre wrote after the parent's last reply stay unread
  const later = { ...conversations };
  const key = Object.keys(later).find((k) => later[k].some((m) => m.id === 'm-jk-2'))!;
  later[key] = [...later[key], { id: 'm-jk-new', sender: 'centre', senderName: 'JK', text: 'A space opened.', timestamp: 'Nov 9, 2026 • 9:00 AM' }];
  const withNew = buildParentUpdates({ notifications: [], conversations: later, applications: priyaApps, centres: INITIAL_CENTRES, childIds: ['child-anya'], readMessageIds: new Set() });
  assert.equal(withNew.find((u) => u.messageId === 'm-jk-new')!.unread, true);

  const badge = buildParentUpdates({
    notifications: INITIAL_NOTIFICATIONS.filter((n) => n.recipientId === PRIYA_ACCOUNT_ID),
    conversations,
    applications: priyaApps,
    centres: INITIAL_CENTRES,
    childIds: ['child-anya'],
    readMessageIds: new Set(),
  }).filter((u) => u.unread).length;
  assert.ok(badge >= 2 && badge <= 3, `Priya's seeded badge is ${badge}`);
});

test("Seed: Priya's unread Jesse Ketchum notification matches Anya's position history (#6 -> #4, Nov 2)", () => {
  const app = priyaApps.find((a) => a.id === 'app-jesse-ketchum-anya')!;
  const history = app.positionHistory!;
  const [prev, last] = history.slice(-2);
  assert.equal(app.waitlistPosition, last.position);
  const jk = updates.find((u) => u.kind === 'waitlist' && u.applicationId === app.id && u.unread)!;
  assert.ok(jk, 'an unread waitlist update for Anya at Jesse Ketchum');
  assert.ok(jk.text.includes(`to #${last.position} (from #${prev.position}) on ${last.date}`), jk.text);
  assert.ok(jk.label.endsWith(`· ${last.date}`), jk.label);
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
