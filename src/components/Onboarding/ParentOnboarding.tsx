import React, { useState } from 'react';
import { Baby, Plus, MapPin } from 'lucide-react';
import { Card, PrimaryButton, GhostButton } from '../ui/CareUI';
import {
  CHILD_CARE_TYPES,
  Child,
  ChildFormInput,
  ageInMonths,
  childFromForm,
  formatAge,
  validateChild,
  FieldErrors,
} from '../../lib/family';
import type { Area } from '../../lib/rankCentres';
import { Field, OnboardingShell, ProgressDots, focusFirstError, inputClass } from './FormBits';

const EMPTY_CHILD: ChildFormInput = { firstName: '', dateOfBirth: '', careType: '', startMonth: '', homeArea: '', notes: '' };
const FIELD_ORDER: (keyof ChildFormInput)[] = ['firstName', 'dateOfBirth', 'careType', 'startMonth', 'homeArea', 'notes'];
const todayIso = () => new Date().toISOString().slice(0, 10);

interface Props {
  parentName: string;
  areas: Area[];
  onComplete: (children: Child[]) => void;
  onLogout: () => void;
}

/** Two steps: 1) tell us about your child, 2) your family (add another child or continue). */
export const ParentOnboarding: React.FC<Props> = ({ parentName, areas, onComplete, onLogout }) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<ChildFormInput>(EMPTY_CHILD);
  const [errors, setErrors] = useState<FieldErrors<keyof ChildFormInput>>({});

  // Editing a field clears its error message
  const set = (k: keyof ChildFormInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  };

  const handleSaveChild = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateChild(form, areas);
    setErrors(errs);
    const bad = FIELD_ORDER.filter((k) => errs[k]);
    if (bad.length) {
      focusFirstError(bad.map((k) => `child-${k}`));
      return;
    }
    setChildren((prev) => [...prev, childFromForm(form, areas, `child-${Date.now()}`)]);
    setForm({ ...EMPTY_CHILD, homeArea: form.homeArea }); // siblings usually share the home area
    setErrors({});
    setStep(2);
  };

  return (
    <OnboardingShell onLogout={onLogout}>
      <div className="space-y-6">
        <ProgressDots step={step} total={2} />

        {step === 1 ? (
          <Card className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-cq-ink">
                {children.length ? 'Tell us about another child' : 'Tell us about your child'}
              </h1>
              <p className="text-sm text-cq-muted mt-1">
                Welcome{parentName ? `, ${parentName.split(' ')[0]}` : ''}. This is used to prepare applications and find centres near you.
              </p>
            </div>
            <form onSubmit={handleSaveChild} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="child-firstName" label="Child's first name" error={errors.firstName}>
                  {(a) => <input {...a} type="text" autoComplete="off" value={form.firstName} onChange={set('firstName')} className={inputClass(!!errors.firstName)} />}
                </Field>
                <Field
                  id="child-dateOfBirth"
                  label="Date of birth"
                  error={errors.dateOfBirth}
                  hint={
                    form.dateOfBirth && !errors.dateOfBirth && !Number.isNaN(ageInMonths(form.dateOfBirth))
                      ? `Age today: ${formatAge(ageInMonths(form.dateOfBirth))}`
                      : 'CareQ is for children under 6.'
                  }
                >
                  {(a) => (
                    <input {...a} type="date" max={todayIso()} value={form.dateOfBirth} onChange={set('dateOfBirth')} className={inputClass(!!errors.dateOfBirth)} />
                  )}
                </Field>
                <Field id="child-careType" label="Type of care" error={errors.careType}>
                  {(a) => (
                    <select {...a} value={form.careType} onChange={set('careType')} className={inputClass(!!errors.careType)}>
                      <option value="">Choose…</option>
                      {CHILD_CARE_TYPES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field id="child-startMonth" label="Preferred start" error={errors.startMonth} hint="Month and year">
                  {(a) => <input {...a} type="month" value={form.startMonth} onChange={set('startMonth')} className={inputClass(!!errors.startMonth)} />}
                </Field>
              </div>
              <Field id="child-homeArea" label="Home area" error={errors.homeArea} hint="Start typing, then choose from the list (e.g. Danforth & Pape).">
                {(a) => (
                  <>
                    <input
                      {...a}
                      type="text"
                      list="toronto-areas"
                      autoComplete="off"
                      value={form.homeArea}
                      onChange={set('homeArea')}
                      className={inputClass(!!errors.homeArea)}
                    />
                    <datalist id="toronto-areas">
                      {areas.map((ar) => (
                        <option key={ar.name} value={ar.name} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
              <Field id="child-notes" label="Notes for centres" optional error={errors.notes} hint="Shared with a centre only when you send an application, e.g. allergies or routines.">
                {(a) => (
                  <textarea
                    {...a}
                    rows={3}
                    value={form.notes}
                    onChange={set('notes')}
                    className={`${inputClass(!!errors.notes)} h-auto py-2.5`}
                  />
                )}
              </Field>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                {children.length > 0 && (
                  <GhostButton
                    onClick={() => {
                      setErrors({});
                      setStep(2);
                    }}
                  >
                    Cancel
                  </GhostButton>
                )}
                <PrimaryButton type="submit">Save child</PrimaryButton>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-cq-ink">Your family</h1>
              <p className="text-sm text-cq-muted mt-1">You can add more children now. For now, the first child is the one CareQ applies for.</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {children.map((c, i) => (
                <li key={c.id} className="rounded-xl border border-cq-line bg-cq-input p-4 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-cq-ink">
                    <Baby className="w-4 h-4 text-cq-sage-ink" /> {c.firstName}, {formatAge(ageInMonths(c.dateOfBirth))}
                    {i === 0 && <span className="ml-auto text-xs font-semibold text-cq-sage-ink">Active child</span>}
                  </p>
                  <p className="text-xs text-cq-muted">
                    {c.careType} · from {c.preferredStartDate}
                  </p>
                  <p className="text-xs text-cq-muted flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {c.homeArea}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-between gap-2">
              <GhostButton onClick={() => setStep(1)}>
                <Plus className="w-4 h-4" /> Add another child
              </GhostButton>
              <PrimaryButton onClick={() => onComplete(children)}>Continue to CareQ</PrimaryButton>
            </div>
          </Card>
        )}
      </div>
    </OnboardingShell>
  );
};
