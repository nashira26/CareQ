import React, { useState } from 'react';
import {
  Baby,
  Building2,
  CheckCircle2,
  FileText,
  ImagePlus,
  KeyRound,
  Lock,
  MapPin,
  Pencil,
  Plus,
  ScrollText,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { AgeGroup, Application, Centre } from '../data/mockData';
import type { PublicAccount } from '../lib/world';
import {
  CENTRE_PROGRAM_OPTIONS,
  CHILD_CARE_TYPES,
  CentreFormInput,
  Child,
  ChildFormInput,
  FieldErrors,
  MIN_PASSWORD_LENGTH,
  ageInMonths,
  centreToForm,
  childFromForm,
  childToForm,
  formatAge,
  licenceLabel,
  simulatedContactErrors,
  validateCentre,
  validateChild,
} from '../lib/family';
import { childRemovalBlocker, type ChildInput } from '../lib/service';
import type { Area } from '../lib/rankCentres';
import { Card, DangerButton, GhostButton, PageHeader, PrimaryButton, TertiaryButton } from './ui/CareUI';
import { CheckboxGroup, Field, focusFirstError, inputClass } from './Onboarding/FormBits';
import { resizePhoto } from './Onboarding/CentreRegistration';

/** Every save resolves to an error message in plain language, or null when it worked. */
type Save<A extends unknown[]> = (...args: A) => Promise<string | null>;

export interface ProfileActions {
  saveName: Save<[string]>;
  changePassword: Save<[string, string]>;
  addChild: Save<[ChildInput]>;
  updateChild: Save<[string, ChildInput]>;
  removeChild: Save<[string]>;
  updateCentreDetails: Save<[Omit<CentreFormInput, 'policyText'>, string | null | undefined]>;
  updateSimulatedContact: Save<[{ hours: string; contactEmail: string }]>;
}

interface Props {
  account: PublicAccount;
  /** Centre staff: their centre. */
  centre?: Centre;
  /** Parent: their applications (decides whether a child can be removed). */
  applications: Application[];
  areas: Area[];
  actions: ProfileActions;
  onOpenFind?: () => void;
  onOpenPolicy?: () => void;
}

// ---------------- Small pieces ----------------

const Feedback: React.FC<{ error?: string | null; saved?: string | null }> = ({ error, saved }) =>
  error ? (
    <p role="alert" className="text-sm font-semibold text-error">
      {error}
    </p>
  ) : saved ? (
    <p role="status" className="text-sm font-semibold text-success inline-flex items-center gap-1.5">
      <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {saved}
    </p>
  ) : null;

const SectionTitle: React.FC<{ icon: React.ElementType; children: React.ReactNode; aside?: React.ReactNode; id?: string }> = ({ icon: Icon, children, aside, id }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
    <h2 id={id} className="text-[22px] leading-7 font-extrabold text-brand flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-xl bg-mint text-brand inline-flex items-center justify-center shrink-0" aria-hidden="true">
        <Icon className="w-[18px] h-[18px]" />
      </span>
      {children}
    </h2>
    {aside}
  </div>
);

/** Read-only label/value row. */
const Detail: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-sm text-ink-muted">{label}</dt>
    <dd className="text-base text-ink font-semibold break-words">{children}</dd>
  </div>
);

/** Resets the "Saved." note when the user starts editing again. */
function useSaveState() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const run = async (fn: () => Promise<string | null>, okMessage: string) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
    else setSaved(okMessage);
    return !err;
  };
  const clear = () => {
    setError(null);
    setSaved(null);
  };
  return { busy, error, saved, run, clear, setError };
}

// ---------------- Account (both roles) ----------------

const AccountCard: React.FC<{ account: PublicAccount; actions: ProfileActions; title: string }> = ({ account, actions, title }) => {
  const [name, setName] = useState(account.name);
  const [nameError, setNameError] = useState<string | undefined>();
  const nameSave = useSaveState();

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Partial<Record<keyof typeof pw, string>>>({});
  const pwSave = useSaveState();

  const submitName = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return setNameError('Please enter your name.');
    if (clean.length > 80) return setNameError('Please use 80 characters or fewer.');
    await nameSave.run(() => actions.saveName(clean), 'Name saved.');
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof pwErrors = {};
    if (!pw.current) errs.current = 'Please enter your current password.';
    if (pw.next.length < MIN_PASSWORD_LENGTH) errs.next = `Please use at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (pw.confirm !== pw.next) errs.confirm = "The two new passwords don't match.";
    setPwErrors(errs);
    const bad = (['current', 'next', 'confirm'] as const).filter((k) => errs[k]);
    if (bad.length) return focusFirstError(bad.map((k) => `pw-${k}`));
    if (await pwSave.run(() => actions.changePassword(pw.current, pw.next), 'Password changed.')) {
      setPw({ current: '', next: '', confirm: '' });
      setPwOpen(false);
    }
  };
  const setPwField = (k: keyof typeof pw) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPw((p) => ({ ...p, [k]: e.target.value }));
    setPwErrors((p) => ({ ...p, [k]: undefined }));
  };

  return (
    <Card aria-labelledby="profile-account-title">
      <SectionTitle icon={KeyRound} id="profile-account-title">
        {title}
      </SectionTitle>
      <form onSubmit={submitName} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <Field id="profile-name" label="Your name" error={nameError}>
          {(a) => (
            <input
              {...a}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(undefined);
                nameSave.clear();
              }}
              className={inputClass(!!nameError)}
            />
          )}
        </Field>
        <Field id="profile-email" label="Email" hint="Your login email can't be changed.">
          {(a) => <input {...a} type="email" value={account.email} readOnly aria-readonly="true" className={`${inputClass()} bg-stone text-ink-muted`} />}
        </Field>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={nameSave.busy || name.trim() === account.name}>
            {nameSave.busy ? 'Saving…' : 'Save name'}
          </PrimaryButton>
          <Feedback error={nameSave.error} saved={nameSave.saved} />
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-cq-line">
        <h3 className="text-lg font-extrabold text-ink flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand" aria-hidden="true" /> Password
        </h3>
        {account.isDemoAccount ? (
          <p className="mt-2 rounded-xl border border-butter-line bg-butter px-4 py-2.5 text-sm text-cq-sand-ink">
            <span className="font-bold">Demo account:</span> password can't be changed.
          </p>
        ) : !pwOpen ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <GhostButton
              onClick={() => {
                setPwOpen(true);
                pwSave.clear();
                window.requestAnimationFrame(() => document.getElementById('pw-current')?.focus());
              }}
            >
              Change password
            </GhostButton>
            <Feedback saved={pwSave.saved} />
          </div>
        ) : (
          <form onSubmit={submitPassword} noValidate className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <Field id="pw-current" label="Current password" error={pwErrors.current}>
              {(a) => <input {...a} type="password" autoComplete="current-password" value={pw.current} onChange={setPwField('current')} className={inputClass(!!pwErrors.current)} />}
            </Field>
            <Field id="pw-next" label="New password" error={pwErrors.next} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
              {(a) => <input {...a} type="password" autoComplete="new-password" value={pw.next} onChange={setPwField('next')} className={inputClass(!!pwErrors.next)} />}
            </Field>
            <Field id="pw-confirm" label="Confirm new password" error={pwErrors.confirm}>
              {(a) => <input {...a} type="password" autoComplete="new-password" value={pw.confirm} onChange={setPwField('confirm')} className={inputClass(!!pwErrors.confirm)} />}
            </Field>
            <div className="md:col-span-3 flex flex-wrap items-center gap-3">
              <PrimaryButton type="submit" disabled={pwSave.busy}>
                {pwSave.busy ? 'Saving…' : 'Change password'}
              </PrimaryButton>
              <GhostButton
                onClick={() => {
                  setPwOpen(false);
                  setPw({ current: '', next: '', confirm: '' });
                  setPwErrors({});
                  pwSave.clear();
                }}
              >
                Cancel
              </GhostButton>
              <Feedback error={pwSave.error} />
            </div>
          </form>
        )}
      </div>
    </Card>
  );
};

// ---------------- Children (parent) ----------------

const EMPTY_CHILD: ChildFormInput = { firstName: '', dateOfBirth: '', careType: '', startMonth: '', homeArea: '', notes: '' };
const CHILD_FIELDS: (keyof ChildFormInput)[] = ['firstName', 'dateOfBirth', 'careType', 'startMonth', 'homeArea', 'notes'];
const todayIso = () => new Date().toISOString().slice(0, 10);

const ChildForm: React.FC<{
  idPrefix: string;
  initial: ChildFormInput;
  areas: Area[];
  submitLabel: string;
  isActive?: boolean;
  onSubmit: (input: ChildInput) => Promise<boolean>;
  onCancel: () => void;
  busy: boolean;
  error?: string | null;
}> = ({ idPrefix, initial, areas, submitLabel, isActive, onSubmit, onCancel, busy, error }) => {
  const [form, setForm] = useState<ChildFormInput>(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof ChildFormInput>>({});
  const id = (k: keyof ChildFormInput) => `${idPrefix}-${k}`;
  const set = (k: keyof ChildFormInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateChild(form, areas);
    // A start month already on the profile may now be in the past: only a changed one must be this month or later
    if (errs.startMonth && form.startMonth && form.startMonth === initial.startMonth && /^\d{4}-\d{2}$/.test(form.startMonth)) delete errs.startMonth;
    setErrors(errs);
    const bad = CHILD_FIELDS.filter((k) => errs[k]);
    if (bad.length) return focusFirstError(bad.map(id));
    const { id: _id, ...child } = childFromForm(form, areas, 'new');
    await onSubmit(child);
  };

  const age = form.dateOfBirth && !errors.dateOfBirth ? ageInMonths(form.dateOfBirth) : NaN;
  const listId = `${idPrefix}-areas`;
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id={id('firstName')} label="Child's first name" error={errors.firstName}>
          {(a) => <input {...a} type="text" autoComplete="off" value={form.firstName} onChange={set('firstName')} className={inputClass(!!errors.firstName)} />}
        </Field>
        <Field
          id={id('dateOfBirth')}
          label="Date of birth"
          error={errors.dateOfBirth}
          hint={!Number.isNaN(age) && age >= 0 ? `Age today: ${formatAge(age)}` : 'CareQ is for children under 6.'}
        >
          {(a) => <input {...a} type="date" max={todayIso()} value={form.dateOfBirth} onChange={set('dateOfBirth')} className={inputClass(!!errors.dateOfBirth)} />}
        </Field>
        <Field id={id('careType')} label="Type of care" error={errors.careType}>
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
        <Field id={id('startMonth')} label="Preferred start" error={errors.startMonth} hint="Month and year">
          {(a) => <input {...a} type="month" value={form.startMonth} onChange={set('startMonth')} className={inputClass(!!errors.startMonth)} />}
        </Field>
      </div>
      <Field
        id={id('homeArea')}
        label="Home area"
        error={errors.homeArea}
        hint={isActive ? 'Start typing, then choose from the list. Find starts from this area.' : 'Start typing, then choose from the list.'}
      >
        {(a) => (
          <>
            <input {...a} type="text" list={listId} autoComplete="off" value={form.homeArea} onChange={set('homeArea')} className={inputClass(!!errors.homeArea)} />
            <datalist id={listId}>
              {areas.map((ar) => (
                <option key={ar.name} value={ar.name} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field id={id('notes')} label="Notes for centres" optional error={errors.notes} hint="Shared with a centre only when you send an application, e.g. allergies or routines.">
        {(a) => <textarea {...a} rows={3} value={form.notes} onChange={set('notes')} className={`${inputClass(!!errors.notes)} h-auto py-2.5`} />}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </PrimaryButton>
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
        <Feedback error={error} />
      </div>
    </form>
  );
};

const ChildCard: React.FC<{
  child: Child;
  index: number;
  childCount: number;
  applications: Application[];
  areas: Area[];
  actions: ProfileActions;
  onOpenFind?: () => void;
}> = ({ child, index, childCount, applications, areas, actions, onOpenFind }) => {
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeNote, setRemoveNote] = useState<string | null>(null);
  const save = useSaveState();
  const isActive = index === 0;
  const months = ageInMonths(child.dateOfBirth);
  const headingId = `child-${child.id}-name`;

  const askRemove = () => {
    save.clear();
    const blocker = childRemovalBlocker(child.id, childCount, applications);
    if (blocker) {
      setRemoveNote(blocker);
      setConfirmRemove(false);
    } else {
      setRemoveNote(null);
      setConfirmRemove(true);
    }
  };

  return (
    <li className="rounded-2xl border border-cq-line bg-white p-4 sm:p-5" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-peach text-coral-ink inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <Baby className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="text-lg font-extrabold text-ink leading-tight flex flex-wrap items-center gap-2">
            {child.firstName}
            {isActive && <span className="rounded-full bg-mint text-brand text-xs font-bold px-2.5 py-0.5">Active child</span>}
          </h3>
          <p className="text-sm text-ink-muted">{Number.isNaN(months) ? 'Age unknown' : formatAge(months)}</p>
        </div>
        {!editing && (
          <div className="flex flex-wrap gap-1 w-full sm:w-auto -ml-2 sm:ml-0">
            <TertiaryButton
              onClick={() => {
                setEditing(true);
                setConfirmRemove(false);
                setRemoveNote(null);
                save.clear();
              }}
              aria-label={`Edit ${child.firstName}`}
            >
              <Pencil className="w-4 h-4" aria-hidden="true" /> Edit
            </TertiaryButton>
            <TertiaryButton onClick={askRemove} aria-label={`Remove ${child.firstName}`} className="text-error decoration-error/35 hover:decoration-error">
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Remove
            </TertiaryButton>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-4">
          <ChildForm
            idPrefix={`edit-${child.id}`}
            initial={childToForm(child)}
            areas={areas}
            isActive={isActive}
            submitLabel="Save changes"
            busy={save.busy}
            error={save.error}
            onCancel={() => {
              setEditing(false);
              save.clear();
            }}
            onSubmit={async (input) => {
              const homeChanged = isActive && input.homeArea !== child.homeArea;
              const ok = await save.run(
                () => actions.updateChild(child.id, input),
                homeChanged ? `Saved. Find now starts from ${input.homeArea}.` : 'Saved.'
              );
              if (ok) setEditing(false);
              return ok;
            }}
          />
        </div>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            <Detail label="Date of birth">
              {new Date(`${child.dateOfBirth}T00:00:00`).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Detail>
            <Detail label="Type of care">{child.careType}</Detail>
            <Detail label="Preferred start">{child.preferredStartDate}</Detail>
            <Detail label="Home area">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> {child.homeArea}
              </span>
            </Detail>
            <div className="sm:col-span-2">
              <Detail label="Notes for centres">{child.notes ? child.notes : <span className="font-normal text-ink-soft">None</span>}</Detail>
            </div>
          </dl>
          {(save.saved || save.error) && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Feedback error={save.error} saved={save.saved} />
              {save.saved?.startsWith('Saved. Find') && onOpenFind && (
                <TertiaryButton onClick={onOpenFind}>Go to Find</TertiaryButton>
              )}
            </div>
          )}
        </>
      )}

      {removeNote && (
        <div role="status" className="mt-4 rounded-xl border border-butter-line bg-butter-50 px-4 py-3 text-sm text-ink flex items-start gap-2">
          <span className="flex-1">{removeNote}</span>
          <button type="button" onClick={() => setRemoveNote(null)} aria-label="Dismiss" className="w-8 h-8 -m-1 rounded-lg inline-flex items-center justify-center hover:bg-butter cursor-pointer">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {confirmRemove && (
        <div role="group" aria-label={`Remove ${child.firstName}?`} className="mt-4 rounded-xl border border-error/30 bg-error-bg px-4 py-3 space-y-3">
          <p className="text-sm text-ink">
            Remove <span className="font-bold">{child.firstName}</span> from your account?
            {isActive && ' The next child becomes the active child.'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <DangerButton
              disabled={save.busy}
              onClick={async () => {
                const err = await actions.removeChild(child.id);
                if (err) {
                  setConfirmRemove(false);
                  setRemoveNote(err);
                }
              }}
            >
              Yes, remove
            </DangerButton>
            <GhostButton onClick={() => setConfirmRemove(false)}>Keep {child.firstName}</GhostButton>
          </div>
        </div>
      )}
    </li>
  );
};

const ChildrenCard: React.FC<{ children: Child[]; applications: Application[]; areas: Area[]; actions: ProfileActions; onOpenFind?: () => void }> = ({
  children,
  applications,
  areas,
  actions,
  onOpenFind,
}) => {
  const [adding, setAdding] = useState(false);
  const add = useSaveState();
  return (
    <Card aria-labelledby="profile-children-title">
      <SectionTitle
        icon={Baby}
        id="profile-children-title"
        aside={
          !adding && children.length < 8 ? (
            <GhostButton
              onClick={() => {
                setAdding(true);
                add.clear();
                window.requestAnimationFrame(() => document.getElementById('add-child-firstName')?.focus());
              }}
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Add a child
            </GhostButton>
          ) : undefined
        }
      >
        Your children
      </SectionTitle>
      <p className="text-sm text-ink-muted -mt-2 mb-4">
        The first child is the active child: CareQ prepares applications and starts Find for them. Changes apply to drafts and new applications;
        applications you've already sent keep what the centre received.
      </p>
      <ul className="space-y-3">
        {children.map((c, i) => (
          <ChildCard
            key={c.id}
            child={c}
            index={i}
            childCount={children.length}
            applications={applications}
            areas={areas}
            actions={actions}
            onOpenFind={onOpenFind}
          />
        ))}
      </ul>
      {adding && (
        <div className="mt-4 rounded-2xl border border-mint-line bg-mint-50 p-4 sm:p-5">
          <h3 className="text-lg font-extrabold text-ink mb-3">Add a child</h3>
          <ChildForm
            idPrefix="add-child"
            initial={{ ...EMPTY_CHILD, homeArea: children[0]?.homeArea ?? '' }}
            areas={areas}
            submitLabel="Add child"
            busy={add.busy}
            error={add.error}
            onCancel={() => {
              setAdding(false);
              add.clear();
            }}
            onSubmit={async (input) => {
              const ok = await add.run(() => actions.addChild(input), `${input.firstName} was added.`);
              if (ok) setAdding(false);
              return ok;
            }}
          />
        </div>
      )}
      {!adding && <div className="mt-3"><Feedback saved={add.saved} /></div>}
    </Card>
  );
};

// ---------------- Centre ----------------

const AGE_OPTIONS: { label: string; value: AgeGroup }[] = [
  { label: 'Infant', value: 'Infant' },
  { label: 'Toddler', value: 'Toddler' },
  { label: 'Preschool', value: 'Preschool' },
];
const BASE_LANGUAGES = ['English', 'French'];
const CENTRE_FIELDS: (keyof CentreFormInput)[] = [
  'name', 'street', 'postalCode', 'neighbourhood', 'licenceNumber', 'ageGroups', 'programOptions', 'languages', 'hours', 'capacity', 'contactEmail',
];

const LicenceBadge: React.FC<{ centre: Centre }> = ({ centre }) => {
  const verified = Boolean(centre.registration?.licenceVerified);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold border ${
        verified ? 'bg-mint border-mint-line text-leaf-ink' : 'bg-stone border-cq-line text-ink-muted'
      }`}
    >
      {verified ? <ShieldCheck className="w-4 h-4" aria-hidden="true" /> : <Building2 className="w-4 h-4" aria-hidden="true" />}
      {licenceLabel(centre)}
    </span>
  );
};

const SelfRegisteredCentreForm: React.FC<{ centre: Centre; areas: Area[]; actions: ProfileActions }> = ({ centre, areas, actions }) => {
  const initial = centreToForm(centre);
  const [form, setForm] = useState<CentreFormInput>({ ...initial, languages: initial.languages.filter((l) => BASE_LANGUAGES.includes(l)) });
  const [otherLanguages, setOtherLanguages] = useState(initial.languages.filter((l) => !BASE_LANGUAGES.includes(l)).join(', '));
  const [errors, setErrors] = useState<FieldErrors<keyof CentreFormInput>>({});
  // undefined: keep the saved photo; null: remove it; string: a new photo
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const save = useSaveState();
  const shownPhoto = photo === undefined ? centre.registration?.photoDataUrl : photo;

  const clearError = (k: keyof CentreFormInput) => {
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
    save.clear();
  };
  const set = (k: keyof CentreFormInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = { ...form, languages: allLanguages(), policyText: '' };
    const errs = validateCentre(input, areas);
    setErrors(errs);
    const bad = CENTRE_FIELDS.filter((k) => errs[k]);
    if (bad.length) return focusFirstError(bad.map((k) => `centre-${k}`));
    const { policyText: _p, ...details } = input;
    const ok = await save.run(() => actions.updateCentreDetails(details, photo), 'Centre details saved. Licence check and map location updated.');
    if (ok) setPhoto(undefined);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhoto(await resizePhoto(file));
      setPhotoError(null);
      save.clear();
    } catch (err) {
      setPhotoError((err as Error).message);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
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
        <Field id="centre-neighbourhood" label="Neighbourhood" error={errors.neighbourhood} hint="Choose from the list. Used for an approximate map location.">
          {(a) => (
            <>
              <input {...a} type="text" list="profile-centre-areas" autoComplete="off" value={form.neighbourhood} onChange={set('neighbourhood')} className={inputClass(!!errors.neighbourhood)} />
              <datalist id="profile-centre-areas">
                {areas.map((ar) => (
                  <option key={ar.name} value={ar.name} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field id="centre-licenceNumber" label="Licence number" optional error={errors.licenceNumber} hint="Checked again against Ontario open data with your postal code or centre name when you save.">
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
          options={BASE_LANGUAGES.map((l) => ({ label: l, value: l }))}
          value={form.languages}
          onChange={(v) => {
            setForm((f) => ({ ...f, languages: v }));
            clearError('languages');
          }}
          error={errors.languages}
        />
        <Field id="centre-otherLanguages" label="Other languages" optional hint="Separate with commas, e.g. Tamil, Mandarin">
          {(a) => (
            <input
              {...a}
              type="text"
              value={otherLanguages}
              onChange={(e) => {
                setOtherLanguages(e.target.value);
                clearError('languages');
              }}
              className={inputClass()}
            />
          )}
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
        <p className="block text-[15px] font-bold text-ink mb-1.5">
          Centre photo <span className="text-sm font-normal text-ink-soft">(optional)</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {shownPhoto && (
            <div className="relative">
              <img src={shownPhoto} alt="Centre photo" className="h-24 w-36 object-cover rounded-xl border border-cq-line" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  save.clear();
                }}
                aria-label="Remove photo"
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border border-cq-line inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
          <label className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-line-strong bg-white text-sm font-bold text-brand hover:bg-mint cursor-pointer focus-within:ring-[3px] focus-within:ring-brand/20">
            <ImagePlus className="w-4 h-4" aria-hidden="true" /> {shownPhoto ? 'Change photo' : 'Add a photo'}
            <input type="file" accept="image/*" onChange={handlePhoto} className="sr-only" />
          </label>
        </div>
        <p className="mt-1.5 text-xs text-ink-soft">Image only, resized before saving; shown as “Photo provided by the centre”.</p>
        {photoError && <p className="mt-1 text-xs font-semibold text-error">{photoError}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" disabled={save.busy}>
          {save.busy ? 'Saving…' : 'Save centre details'}
        </PrimaryButton>
        <Feedback error={save.error} saved={save.saved} />
      </div>
    </form>
  );
};

const DemoCentreDetails: React.FC<{ centre: Centre; actions: ProfileActions }> = ({ centre, actions }) => {
  const [input, setInput] = useState({ hours: centre.simulatedContact?.hours ?? '', contactEmail: centre.simulatedContact?.contactEmail ?? '' });
  const [errors, setErrors] = useState<FieldErrors<'hours' | 'contactEmail'>>({});
  const save = useSaveState();
  const realCentre = centre.demoKind === 'open-data';
  const set = (k: 'hours' | 'contactEmail') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
    save.clear();
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = simulatedContactErrors(input);
    setErrors(errs);
    const bad = (['hours', 'contactEmail'] as const).filter((k) => errs[k]);
    if (bad.length) return focusFirstError(bad.map((k) => `sim-${k}`));
    await save.run(() => actions.updateSimulatedContact(input), 'Saved. Families using demo accounts see these on your centre.');
  };

  return (
    <div className="space-y-6">
      <div>
        <p role="note" className="rounded-xl border border-cq-line bg-stone px-4 py-2.5 text-sm text-ink flex items-start gap-2">
          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-ink-muted" aria-hidden="true" />
          {realCentre
            ? "These details come from Ontario open data and can't be edited here."
            : "These are the fictional demo centre's sample details and can't be edited here."}
        </p>
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          <Detail label="Centre name">{centre.name}</Detail>
          <Detail label="Address">{centre.address ?? <span className="font-normal text-ink-soft">Approximate location only (fictional)</span>}</Detail>
          <Detail label="Neighbourhood">{centre.neighbourhood}</Detail>
          {centre.licenceNumber && <Detail label="Licence number">{centre.licenceNumber}</Detail>}
          {centre.operator && <Detail label="Operator">{centre.operator}</Detail>}
          {centre.capacity != null && <Detail label="Licensed spaces">{centre.capacity} (capacity, not availability)</Detail>}
          <Detail label="Age groups">{centre.ageGroups.join(', ')}</Detail>
          {centre.programOptions?.length ? <Detail label="Programs">{centre.programOptions.join(', ')}</Detail> : null}
          {centre.languages?.length ? <Detail label="Languages">{centre.languages.join(', ')}</Detail> : null}
          <Detail label={realCentre ? 'Hours (open data)' : 'Hours (sample)'}>
            {centre.hours || <span className="font-normal text-ink-soft">Not in open data</span>}
          </Detail>
        </dl>
      </div>

      <form onSubmit={submit} noValidate className="rounded-2xl border border-butter-line bg-butter-50 p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-lg font-extrabold text-ink flex flex-wrap items-center gap-2">
            Hours and contact email
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            Entered by this demo account and shown to demo families only. They never replace
            {realCentre ? ' the open-data details above.' : ' the sample details above.'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="sim-hours" label="Hours" optional error={errors.hours} hint="e.g. 7:30 AM – 6:00 PM">
            {(a) => <input {...a} type="text" value={input.hours} onChange={set('hours')} className={inputClass(!!errors.hours)} />}
          </Field>
          <Field id="sim-contactEmail" label="Contact email" optional error={errors.contactEmail}>
            {(a) => <input {...a} type="email" value={input.contactEmail} onChange={set('contactEmail')} className={inputClass(!!errors.contactEmail)} />}
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={save.busy}>
            {save.busy ? 'Saving…' : 'Save'}
          </PrimaryButton>
          <Feedback error={save.error} saved={save.saved} />
        </div>
      </form>
    </div>
  );
};

const PolicyAndDocumentsCard: React.FC<{ centre: Centre; onOpenPolicy?: () => void }> = ({ centre, onOpenPolicy }) => {
  const uploaded = centre.registration?.documents ?? [];
  const handbook = centre.requirementsExtractedFrom;
  return (
    <Card aria-labelledby="profile-policy-title">
      <SectionTitle icon={ScrollText} id="profile-policy-title">
        Policy and documents
      </SectionTitle>
      <p className="text-sm text-ink-muted -mt-2 mb-4">
        Admission requirements and documents are managed on the Policy & requirements page.
        {centre.requirements.length > 0 && ` ${centre.requirements.length} requirement${centre.requirements.length === 1 ? '' : 's'} published.`}
      </p>
      {uploaded.length > 0 && (
        <ul className="space-y-2 mb-4" aria-label="Uploaded documents">
          {uploaded.map((d) => (
            <li key={d.docKey} className="flex items-start gap-2 text-sm text-ink">
              <FileText className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <span className="font-bold">{d.docTitle}</span> · {d.fileName} · uploaded{' '}
                {new Date(d.uploadedAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!uploaded.length && handbook && (
        <p className="flex items-start gap-2 text-sm text-ink mb-4">
          <FileText className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Requirements quoted from{' '}
            {handbook.sourceUrl ? (
              <a href={handbook.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-brand underline underline-offset-4">
                {handbook.docTitle}
              </a>
            ) : (
              <span className="font-bold">{handbook.docTitle}</span>
            )}{' '}
            (retrieved {handbook.retrieved}).
          </span>
        </p>
      )}
      {!uploaded.length && !handbook && centre.registration && <p className="text-sm text-ink-soft mb-4">No documents uploaded yet.</p>}
      {onOpenPolicy && (
        <GhostButton onClick={onOpenPolicy}>
          <ScrollText className="w-4 h-4" aria-hidden="true" /> Open Policy & requirements
        </GhostButton>
      )}
    </Card>
  );
};

// ---------------- Page ----------------

export const ProfilePage: React.FC<Props> = ({ account, centre, applications, areas, actions, onOpenFind, onOpenPolicy }) => {
  const isParent = account.role === 'parent';
  const children = account.children ?? [];
  const selfRegistered = Boolean(centre?.registration) && !centre?.demoKind;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your profile"
        title={isParent ? 'Account and family' : 'Account and centre'}
        subtitle={
          isParent
            ? 'Your details and your children. CareQ uses them to prepare applications and find centres near you.'
            : 'Your staff account and what families see about your centre.'
        }
      />

      <AccountCard account={account} actions={actions} title={isParent ? 'Account' : 'Staff account'} />

      {isParent && <ChildrenCard children={children} applications={applications} areas={areas} actions={actions} onOpenFind={onOpenFind} />}

      {!isParent && centre && (
        <>
          <Card aria-labelledby="profile-centre-title">
            <SectionTitle icon={Building2} id="profile-centre-title" aside={selfRegistered ? <LicenceBadge centre={centre} /> : undefined}>
              Centre details
            </SectionTitle>
            {selfRegistered ? (
              <SelfRegisteredCentreForm key={centre.id} centre={centre} areas={areas} actions={actions} />
            ) : (
              <DemoCentreDetails key={centre.id} centre={centre} actions={actions} />
            )}
          </Card>
          <PolicyAndDocumentsCard centre={centre} onOpenPolicy={onOpenPolicy} />
        </>
      )}
    </div>
  );
};
