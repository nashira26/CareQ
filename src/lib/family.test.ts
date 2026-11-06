import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ageInMonths,
  formatAge,
  formatStartMonth,
  validateChild,
  childFromForm,
  validateCentre,
  approximateLocation,
  normalisePostal,
  ChildFormInput,
  CentreFormInput,
} from './family';
import type { Area, FsaCentroids } from './rankCentres';

const today = new Date(2026, 10, 5); // Nov 5, 2026
const areas: Area[] = [{ name: 'Danforth & Pape', aliases: ['pape'], lat: 43.6797, lng: -79.3449 }];
const fsa: FsaCentroids = { M4K: { lat: 43.678, lng: -79.35, centres: 18 } };

test('age in months from date of birth', () => {
  assert.equal(ageInMonths('2025-01-05', today), 22); // Priya's Anya
  assert.equal(ageInMonths('2025-01-06', today), 21); // birthday not reached this month
  assert.equal(ageInMonths('2026-03-01', today), 8);
  assert.ok(Number.isNaN(ageInMonths('05/01/2025', today)));
  assert.equal(formatAge(22), '22 months');
  assert.equal(formatAge(1), '1 month');
  assert.equal(formatStartMonth('2027-03'), 'March 2027');
});

const child: ChildFormInput = {
  firstName: 'Mila',
  dateOfBirth: '2025-06-10',
  careType: 'Full day',
  startMonth: '2027-01',
  homeArea: 'pape',
  notes: '',
};

test('valid child form; area alias resolves to the area name', () => {
  assert.deepEqual(validateChild(child, areas, today), {});
  const c = childFromForm(child, areas, 'child-1');
  assert.equal(c.homeArea, 'Danforth & Pape');
  assert.equal(c.preferredStartDate, 'January 2027');
});

test('child form errors are plain language', () => {
  const e = validateChild(
    { firstName: ' ', dateOfBirth: '2020-01-01', careType: 'Weekends', startMonth: '2026-01', homeArea: 'Narnia', notes: '' },
    areas,
    today
  );
  assert.equal(e.firstName, "Please enter your child's first name.");
  assert.equal(e.dateOfBirth, 'CareQ is for children under 6 years old.');
  assert.equal(e.careType, 'Please choose a type of care.');
  assert.equal(e.startMonth, 'Please choose this month or a later one.');
  assert.equal(e.homeArea, 'Please choose your area from the list.');
  assert.equal(validateChild({ ...child, dateOfBirth: '2027-01-01' }, areas, today).dateOfBirth, "The date of birth can't be in the future.");
});

const centre: CentreFormInput = {
  name: 'Sunny Steps Child Care',
  street: '12 Example Ave',
  postalCode: 'm4k1r3',
  neighbourhood: 'Danforth & Pape',
  licenceNumber: '',
  ageGroups: ['Toddler'],
  programOptions: ['Full day'],
  languages: ['English'],
  hours: '7:30 AM – 6:00 PM',
  capacity: '',
  contactEmail: 'hello@sunnysteps.example',
  policyText: '',
};

test('centre form validation and approximate location (no geocoder)', () => {
  assert.deepEqual(validateCentre(centre, areas), {});
  assert.equal(normalisePostal('m4k1r3'), 'M4K 1R3');
  const e = validateCentre({ ...centre, postalCode: 'L4K 1R3', ageGroups: [], capacity: '-3', contactEmail: 'x' }, areas);
  assert.match(e.postalCode!, /Toronto postal code/);
  assert.match(e.ageGroups!, /at least one age group/);
  assert.match(e.capacity!, /whole number/);
  assert.match(e.contactEmail!, /valid contact email/);
  assert.deepEqual(approximateLocation('Danforth & Pape', 'M4K 1R3', areas, fsa), { lat: 43.6797, lng: -79.3449, source: 'neighbourhood' });
  assert.deepEqual(approximateLocation('', 'M4K 1R3', areas, fsa), { lat: 43.678, lng: -79.35, source: 'postal code' });
  assert.equal(approximateLocation('', 'M9Z 9Z9', areas, fsa), null);
});
