import React, { useState } from 'react';
import { Building2, ImagePlus, Sparkles, CheckCircle2, X } from 'lucide-react';
import { Card, PrimaryButton, GhostButton } from '../ui/CareUI';
import { AgeGroup, Centre } from '../../data/mockData';
import {
  CENTRE_PROGRAM_OPTIONS,
  CentreFormInput,
  FieldErrors,
  approximateLocation,
  findArea,
  normalisePostal,
  validateCentre,
} from '../../lib/family';
import type { Area, FsaCentroids } from '../../lib/rankCentres';
import { CheckboxGroup, Field, OnboardingShell, focusFirstError, inputClass } from './FormBits';

const FIELD_ORDER: (keyof CentreFormInput)[] = [
  'name', 'street', 'postalCode', 'neighbourhood', 'licenceNumber', 'ageGroups', 'programOptions', 'languages',
  'hours', 'capacity', 'contactEmail', 'policyText',
];
const AGE_OPTIONS: { label: string; value: AgeGroup }[] = [
  { label: 'Infant', value: 'Infant' },
  { label: 'Toddler', value: 'Toddler' },
  { label: 'Preschool', value: 'Preschool' },
];
const LANGUAGE_OPTIONS = ['English', 'French'];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_MAX_SIDE = 800;

/** Image only, resized in the browser (kept small for localStorage); never uploaded anywhere. */
async function resizePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG or WebP).');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Please choose an image under 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That image couldn't be opened. Please try another."));
      i.src = url;
    });
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Props {
  staffEmail: string;
  areas: Area[];
  fsa: FsaCentroids;
  onRegistered: (centre: Centre) => void;
  onDone: (next: 'policy' | 'home') => void;
  onLogout: () => void;
}

export const CentreRegistration: React.FC<Props> = ({ staffEmail, areas, fsa, onRegistered, onDone, onLogout }) => {
  const [form, setForm] = useState<CentreFormInput>({
    name: '', street: '', postalCode: '', neighbourhood: '', licenceNumber: '', ageGroups: [], programOptions: [],
    languages: ['English'], hours: '', capacity: '', contactEmail: staffEmail, policyText: '',
  });
  const [otherLanguages, setOtherLanguages] = useState('');
  const [errors, setErrors] = useState<FieldErrors<keyof CentreFormInput>>({});
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Centre | null>(null);

  // Editing a field clears its error message
  const clearError = (k: keyof CentreFormInput) => setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  const set = (k: keyof CentreFormInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    clearError(k);
  };

  const allLanguages = () =>
    Array.from(
      new Set([
        ...form.languages,
        ...otherLanguages.split(',').map((l) => l.trim()).filter(Boolean).map((l) => l.charAt(0).toUpperCase() + l.slice(1).toLowerCase()),
      ])
    );

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhoto(await resizePhoto(file));
      setPhotoError(null);
    } catch (err) {
      setPhotoError((err as Error).message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = { ...form, languages: allLanguages() };
    const errs = validateCentre(input, areas);
    setErrors(errs);
    const bad = FIELD_ORDER.filter((k) => errs[k]);
    if (bad.length) {
      focusFirstError(bad.map((k) => `centre-${k}`));
      return;
    }
    const loc = approximateLocation(input.neighbourhood, input.postalCode, areas, fsa)!;
    const postal = normalisePostal(input.postalCode);
    const centre: Centre = {
      id: `c-self-${Date.now()}`,
      name: input.name.trim(),
      neighbourhood: findArea(input.neighbourhood, areas)!.name,
      address: `${input.street.trim()}, Toronto, ON ${postal}`,
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
        photoDataUrl: photo,
        policyText: input.policyText.trim() || undefined,
        registeredAt: new Date().toISOString(),
      },
    };
    onRegistered(centre);
    setRegistered(centre);
  };

  if (registered) {
    return (
      <OnboardingShell onLogout={onLogout}>
        <Card className="space-y-4 text-center py-10">
          <CheckCircle2 className="w-10 h-10 mx-auto text-[#4E7A5A]" />
          <h1 className="text-2xl font-bold text-[#173F42]">{registered.name} is registered</h1>
          <p className="text-sm text-[#5B6B66] max-w-md mx-auto">
            Families can now find your centre and apply. It is shown as “Self-registered · not verified”, with an approximate
            location from your {registered.registration!.locationSource}.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {registered.registration!.policyText && (
              <PrimaryButton noArrow onClick={() => onDone('policy')}>
                <Sparkles className="w-4 h-4" /> Read my policy with AI
              </PrimaryButton>
            )}
            <GhostButton onClick={() => onDone('home')} className="h-11">
              Go to my centre portal
            </GhostButton>
          </div>
          {registered.registration!.policyText && (
            <p className="text-[11px] text-[#7A8A84]">The AI suggests a checklist from your policy; you confirm it before families see it.</p>
          )}
        </Card>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell onLogout={onLogout}>
      <Card className="space-y-5">
        <div className="flex items-start gap-3">
          <Building2 className="w-6 h-6 text-[#4E7A5A] mt-1 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-[#173F42]">Register your centre</h1>
            <p className="text-sm text-[#5B6B66] mt-1">
              Your centre will appear in CareQ search as “Self-registered · not verified”. Demo only: saved in this browser.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Field id="centre-name" label="Centre name" error={errors.name}>
            {(a) => <input {...a} type="text" value={form.name} onChange={set('name')} className={inputClass(!!errors.name)} />}
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field id="centre-street" label="Street address" error={errors.street} hint="e.g. 12 Example Ave">
                {(a) => <input {...a} type="text" autoComplete="street-address" value={form.street} onChange={set('street')} className={inputClass(!!errors.street)} />}
              </Field>
            </div>
            <Field id="centre-postalCode" label="Postal code" error={errors.postalCode}>
              {(a) => <input {...a} type="text" autoComplete="postal-code" value={form.postalCode} onChange={set('postalCode')} className={inputClass(!!errors.postalCode)} />}
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="centre-neighbourhood" label="Neighbourhood" error={errors.neighbourhood} hint="Start typing, then choose from the list. Used for an approximate map location.">
              {(a) => (
                <>
                  <input {...a} type="text" list="centre-areas" autoComplete="off" value={form.neighbourhood} onChange={set('neighbourhood')} className={inputClass(!!errors.neighbourhood)} />
                  <datalist id="centre-areas">
                    {areas.map((ar) => (
                      <option key={ar.name} value={ar.name} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
            <Field id="centre-licenceNumber" label="Licence number" optional error={errors.licenceNumber} hint="Shown as “Self-reported, not verified”.">
              {(a) => <input {...a} type="text" value={form.licenceNumber} onChange={set('licenceNumber')} className={inputClass(!!errors.licenceNumber)} />}
            </Field>
          </div>

          <CheckboxGroup
            legend="Age groups served"
            name="centre-ageGroups"
            options={AGE_OPTIONS}
            value={form.ageGroups}
            onChange={(v) => {
              setForm((f) => ({ ...f, ageGroups: v as AgeGroup[] }));
              clearError('ageGroups');
            }}
            error={errors.ageGroups}
          />
          <CheckboxGroup
            legend="Program options"
            name="centre-programOptions"
            options={CENTRE_PROGRAM_OPTIONS}
            value={form.programOptions}
            onChange={(v) => {
              setForm((f) => ({ ...f, programOptions: v }));
              clearError('programOptions');
            }}
            error={errors.programOptions}
          />
          <div className="space-y-2">
            <CheckboxGroup
              legend="Languages of care"
              name="centre-languages"
              options={LANGUAGE_OPTIONS.map((l) => ({ label: l, value: l }))}
              value={form.languages}
              onChange={(v) => {
                setForm((f) => ({ ...f, languages: v }));
                clearError('languages');
              }}
              error={errors.languages}
            />
            <Field id="centre-otherLanguages" label="Other languages" optional hint="Separate with commas, e.g. Tamil, Mandarin">
              {(a) => <input {...a} type="text" value={otherLanguages} onChange={(e) => setOtherLanguages(e.target.value)} className={inputClass()} />}
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field id="centre-hours" label="Hours" error={errors.hours} hint="e.g. 7:30 AM – 6:00 PM">
              {(a) => <input {...a} type="text" value={form.hours} onChange={set('hours')} className={inputClass(!!errors.hours)} />}
            </Field>
            <Field id="centre-capacity" label="Capacity" optional error={errors.capacity} hint="Licensed spaces (not availability)">
              {(a) => <input {...a} type="number" min={1} max={500} inputMode="numeric" value={form.capacity} onChange={set('capacity')} className={inputClass(!!errors.capacity)} />}
            </Field>
            <Field id="centre-contactEmail" label="Contact email" error={errors.contactEmail}>
              {(a) => <input {...a} type="email" autoComplete="email" value={form.contactEmail} onChange={set('contactEmail')} className={inputClass(!!errors.contactEmail)} />}
            </Field>
          </div>

          <div>
            <p className="block text-sm font-medium text-[#3F5250] mb-1.5">
              Centre photo <span className="text-xs font-normal text-[#7A8A84]">(optional)</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="Centre photo preview" className="h-24 w-36 object-cover rounded-xl border border-[#E7E4DA]" />
                  <button
                    type="button"
                    onClick={() => setPhoto(undefined)}
                    aria-label="Remove photo"
                    className="absolute -top-2 -right-2 rounded-full bg-white border border-[#E7E4DA] p-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              <label className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#E7E4DA] bg-white text-sm font-semibold text-[#173F42] hover:bg-[#FAF9F4] cursor-pointer focus-within:ring-2 focus-within:ring-[#45B5A5]/40">
                <ImagePlus className="w-4 h-4" /> {photo ? 'Change photo' : 'Add a photo'}
                <input type="file" accept="image/*" onChange={handlePhoto} className="sr-only" />
              </label>
            </div>
            <p className="mt-1 text-[11px] text-[#7A8A84]">Image only. Resized and kept in this browser; shown as “Photo provided by the centre”.</p>
            {photoError && <p className="mt-1 text-xs font-medium text-[#A4543A]">{photoError}</p>}
          </div>

          <Field
            id="centre-policyText"
            label="Admission policy text"
            optional
            error={errors.policyText}
            hint="Paste your admission or intake policy. After registering, AI can read it and suggest a document checklist for you to confirm."
          >
            {(a) => <textarea {...a} rows={5} value={form.policyText} onChange={set('policyText')} className={`${inputClass(!!errors.policyText)} h-auto py-2.5`} />}
          </Field>

          <div className="flex justify-end">
            <PrimaryButton type="submit">Register centre</PrimaryButton>
          </div>
        </form>
      </Card>
    </OnboardingShell>
  );
};
