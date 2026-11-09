import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parentMessageSuggestions } from './messageSuggestions';

const base = { childName: 'Mila', childAgeMonths: 40, preferredStartDate: 'January 2028', completedRequirements: [] as string[] };
const centre = { requirements: ['Proof of address', 'Immunization record'] };

test('parent suggestions come from the application facts, never hard-coded months or rooms', () => {
  const s = parentMessageSuggestions({ ...base, status: 'Submitted' }, centre);
  assert.ok(s.length <= 4);
  assert.ok(s.some((x) => x.includes('January 2028')));
  assert.ok(s.some((x) => x.includes('preschool room')));
  assert.ok(s.some((x) => x.includes('Proof of address')));
  const all = s.join(' ');
  assert.doesNotMatch(all, /March|residency|toddler/i);
});

test('an offer comes first: "Accept the offer and ask about next steps"', () => {
  const s = parentMessageSuggestions({ ...base, status: 'Offer' }, centre);
  assert.equal(s[0], 'Accept the offer and ask about next steps');
});

test('waitlist position, missing checklist item for drafts, and a centre without a checklist', () => {
  assert.ok(parentMessageSuggestions({ ...base, status: 'Waitlisted', waitlistPosition: 4 }, centre).some((x) => x.includes('#4')));
  const draft = parentMessageSuggestions({ ...base, status: 'Draft', completedRequirements: ['Proof of address'] }, centre);
  assert.ok(draft.some((x) => x.includes('Immunization record')));
  const none = parentMessageSuggestions({ ...base, childAgeMonths: 20, status: 'Submitted' }, { requirements: [] });
  assert.ok(none.some((x) => x.includes('toddler room')));
  assert.ok(!none.some((x) => x.includes('"')));
});
