/**
 * Children, centre registration and their validation (pure functions, unit-tested).
 * All accounts, children and centres created here are demo data saved only in this browser.
 */
import type { AgeGroup } from '../data/mockData';
import type { Area, FsaCentroids } from './rankCentres';

export type ChildCareType = 'Full day' | 'Part day' | 'Before school' | 'After school';
export const CHILD_CARE_TYPES: ChildCareType[] = ['Full day', 'Part day', 'Before school', 'After school'];

export interface Child {
  id: string;
  firstName: string;
  dateOfBirth: string; // YYYY-MM-DD
  careType: ChildCareType;
  preferredStartDate: string; // e.g. "March 2027"
  homeArea: string; // a torontoAreas name
  notes: string;
}

export const MAX_CHILD_AGE_MONTHS = 72; // CareQ is for children under 6

/** Whole months between date of birth and today (derived, never stored). */
export function ageInMonths(dateOfBirth: string, today: Date = new Date()): number {
  const m = dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - mo);
  if (today.getDate() < d) months -= 1;
  return months;
}

/** "22 months", "1 month", "newborn". */
export const formatAge = (months: number) =>
  months <= 0 ? 'newborn' : `${months} ${months === 1 ? 'month' : 'months'}`;

/** "2027-03" -> "March 2027" */
export function formatStartMonth(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) return value;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const findArea = (name: string, areas: Area[]): Area | undefined => {
  const n = name.trim().toLowerCase();
  return n ? areas.find((a) => a.name.toLowerCase() === n || a.aliases.some((x) => x.toLowerCase() === n)) : undefined;
};

export interface ChildFormInput {
  firstName: string;
  dateOfBirth: string;
  careType: string;
  startMonth: string; // YYYY-MM from <input type="month">
  homeArea: string;
  notes: string;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Plain-language validation of the child form. Empty object = valid. */
export function validateChild(f: ChildFormInput, areas: Area[], today: Date = new Date()): FieldErrors<keyof ChildFormInput> {
  const e: FieldErrors<keyof ChildFormInput> = {};
  if (!f.firstName.trim()) e.firstName = "Please enter your child's first name.";
  else if (f.firstName.trim().length > 40) e.firstName = 'Please use 40 characters or fewer.';

  if (!f.dateOfBirth) e.dateOfBirth = 'Please enter a date of birth.';
  else {
    const months = ageInMonths(f.dateOfBirth, today);
    const dob = new Date(`${f.dateOfBirth}T00:00:00`);
    if (Number.isNaN(months)) e.dateOfBirth = 'Please enter a valid date.';
    else if (dob.getTime() > today.getTime()) e.dateOfBirth = "The date of birth can't be in the future.";
    else if (months >= MAX_CHILD_AGE_MONTHS) e.dateOfBirth = 'CareQ is for children under 6 years old.';
  }

  if (!CHILD_CARE_TYPES.includes(f.careType as ChildCareType)) e.careType = 'Please choose a type of care.';

  if (!/^\d{4}-\d{2}$/.test(f.startMonth)) e.startMonth = 'Please choose a preferred start month.';
  else {
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (f.startMonth < thisMonth) e.startMonth = 'Please choose this month or a later one.';
  }

  if (!findArea(f.homeArea, areas)) e.homeArea = 'Please choose your area from the list.';
  if (f.notes.length > 500) e.notes = 'Please keep notes under 500 characters.';
  return e;
}

export function childFromForm(f: ChildFormInput, areas: Area[], id: string): Child {
  return {
    id,
    firstName: f.firstName.trim(),
    dateOfBirth: f.dateOfBirth,
    careType: f.careType as ChildCareType,
    preferredStartDate: formatStartMonth(f.startMonth),
    homeArea: findArea(f.homeArea, areas)!.name,
    notes: f.notes.trim(),
  };
}

// ---------- Accounts ----------

export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
export const MIN_PASSWORD_LENGTH = 8;

// ---------- Centre registration ----------

/** Program options as stored in centre data (Ontario open data uses "Half day" for part-day care). */
export const CENTRE_PROGRAM_OPTIONS: { label: string; value: string }[] = [
  { label: 'Full day', value: 'Full day' },
  { label: 'Part day', value: 'Half day' },
  { label: 'Before school', value: 'Before school' },
  { label: 'After school', value: 'After school' },
];

export interface CentreFormInput {
  name: string;
  street: string;
  postalCode: string;
  neighbourhood: string;
  licenceNumber: string;
  ageGroups: AgeGroup[];
  programOptions: string[];
  languages: string[];
  hours: string;
  capacity: string;
  contactEmail: string;
  policyText: string;
}

const TORONTO_POSTAL = /^M\d[A-Z] ?\d[A-Z]\d$/i;
export const normalisePostal = (p: string) => {
  const s = p.toUpperCase().replace(/\s+/g, '');
  return s.length === 6 ? `${s.slice(0, 3)} ${s.slice(3)}` : p.trim().toUpperCase();
};

export function validateCentre(f: CentreFormInput, areas: Area[]): FieldErrors<keyof CentreFormInput> {
  const e: FieldErrors<keyof CentreFormInput> = {};
  if (!f.name.trim()) e.name = 'Please enter the centre name.';
  if (!f.street.trim()) e.street = 'Please enter the street address.';
  if (!TORONTO_POSTAL.test(f.postalCode.trim())) e.postalCode = 'Please enter a Toronto postal code, like M4K 1R3.';
  if (!findArea(f.neighbourhood, areas)) e.neighbourhood = 'Please choose the neighbourhood from the list.';
  if (f.licenceNumber.trim() && !/^[A-Za-z0-9-]{3,20}$/.test(f.licenceNumber.trim())) {
    e.licenceNumber = 'Use letters, numbers or dashes (3 to 20 characters).';
  }
  if (!f.ageGroups.length) e.ageGroups = 'Choose at least one age group.';
  if (!f.programOptions.length) e.programOptions = 'Choose at least one program option.';
  if (!f.languages.length) e.languages = 'Add at least one language of care.';
  if (!f.hours.trim()) e.hours = 'Please enter your opening hours, like 7:30 AM – 6:00 PM.';
  if (f.capacity.trim() && !(Number.isInteger(Number(f.capacity)) && Number(f.capacity) > 0 && Number(f.capacity) <= 500)) {
    e.capacity = 'Capacity should be a whole number between 1 and 500.';
  }
  if (!isValidEmail(f.contactEmail)) e.contactEmail = 'Please enter a valid contact email.';
  if (f.policyText.length > 8000) e.policyText = 'Please keep the policy under 8,000 characters.';
  return e;
}

/**
 * Approximate location: the neighbourhood's centre point, otherwise the postal-code area's
 * centroid. Never an external geocoder.
 */
export function approximateLocation(
  neighbourhood: string,
  postalCode: string,
  areas: Area[],
  fsa: FsaCentroids
): { lat: number; lng: number; source: 'neighbourhood' | 'postal code' } | null {
  const area = findArea(neighbourhood, areas);
  if (area) return { lat: area.lat, lng: area.lng, source: 'neighbourhood' };
  const c = fsa[postalCode.toUpperCase().replace(/\s+/g, '').slice(0, 3)];
  return c ? { lat: c.lat, lng: c.lng, source: 'postal code' } : null;
}

/**
 * Builds a self-registered centre from the registration form. Location is recomputed here
 * (neighbourhood or postal-code area, never a geocoder), so the server never trusts client coordinates.
 */
export function buildRegisteredCentre(
  input: CentreFormInput,
  photoDataUrl: string | undefined,
  areas: Area[],
  fsa: FsaCentroids,
  id: string,
  now: Date = new Date()
): import('../data/mockData').Centre {
  const loc = approximateLocation(input.neighbourhood, input.postalCode, areas, fsa)!;
  return {
    id,
    name: input.name.trim(),
    neighbourhood: findArea(input.neighbourhood, areas)!.name,
    address: `${input.street.trim()}, Toronto, ON ${normalisePostal(input.postalCode)}`,
    ageGroups: input.ageGroups,
    programOptions: input.programOptions,
    languages: input.languages,
    hours: input.hours.trim(),
    requirements: [], // published later via the policy reader (the centre confirms)
    requirementSources: {},
    lat: loc.lat,
    lng: loc.lng,
    registration: {
      selfRegistered: true,
      licenceNumber: input.licenceNumber.trim() || undefined,
      contactEmail: input.contactEmail.trim(),
      capacity: input.capacity.trim() ? Number(input.capacity) : undefined,
      locationApproximate: true,
      locationSource: loc.source,
      photoDataUrl,
      policyText: input.policyText.trim() || undefined,
      registeredAt: now.toISOString(),
    },
  };
}
