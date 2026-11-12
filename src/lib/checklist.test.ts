import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_CENTRES, JESSE_KETCHUM_ID } from '../data/demoCentres';
import { INITIAL_APPLICATIONS } from '../data/mockData';
import { canBeNotApplicable, checklistSummary, requirementState } from './checklist';

const centre = (id: string) => DEMO_CENTRES.find((c) => c.id === id)!;
const app = (id: string) => INITIAL_APPLICATIONS.find((a) => a.id === id)!;

test('only "if applicable" items can be N/A', () => {
  assert.ok(canBeNotApplicable('Custody documents (if applicable)'));
  assert.ok(!canBeNotApplicable('Signed Consent Forms (those that are applicable)'));
  assert.ok(!canBeNotApplicable('Child Admission Package'));
});

test("Anya's Jesse Ketchum file: 3 ready, custody N/A, nothing missing", () => {
  const jk = centre(JESSE_KETCHUM_ID);
  const a = app('app-jesse-ketchum-anya');
  assert.equal(requirementState(a, jk, 'Custody documents (if applicable)'), 'not-applicable');
  assert.equal(a.notApplicable?.['Custody documents (if applicable)']?.note, 'Both parents on file');
  assert.deepEqual(checklistSummary(a, jk), { ready: 3, notApplicable: 1, dueLater: 0, missing: 0, needed: 3 });
  // Mila still misses her immunization record
  const mila = INITIAL_APPLICATIONS.find((x) => x.centreId === JESSE_KETCHUM_ID && x.childName === 'Mila')!;
  assert.equal(requirementState(mila, jk, 'Up-to-date immunization information'), 'missing');
  assert.equal(checklistSummary(mila, jk).missing, 1);
});

test("Leaside's deposit is due when a space is confirmed: not missing while waitlisted, due once offered", () => {
  const a = app('app-leaside-anya');
  const leaside = centre(a.centreId);
  const deposit = 'Deposit to guarantee your spot';
  assert.deepEqual(leaside.requirementsDueWhenConfirmed, [deposit]);
  assert.equal(requirementState(a, leaside, deposit), 'due-later');
  assert.deepEqual(checklistSummary(a, leaside), { ready: 2, notApplicable: 0, dueLater: 1, missing: 0, needed: 2 });
  assert.equal(requirementState({ ...a, status: 'Offer' }, leaside, deposit), 'missing');
  // N/A marks are ignored on items that are not "if applicable"
  assert.equal(requirementState({ ...a, status: 'Offer', notApplicable: { [deposit]: {} } }, leaside, deposit), 'missing');
});
