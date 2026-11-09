import React, { useState } from 'react';
import { X, HelpCircle, MapPin } from 'lucide-react';
import { AgeGroup } from '../../data/mockData';
import { AGE_GROUPS, CARE_TYPES, CareType, SearchCriteria } from '../../lib/searchCriteria';
import { Area, Place, checkableFact } from '../../lib/rankCentres';

type FilterKey = 'area' | 'distance' | 'age' | 'care' | 'language';
const FILTER_LABELS: Record<FilterKey, string> = {
  area: 'Area',
  distance: 'Distance',
  age: 'Age group',
  care: 'Care type',
  language: 'Language',
};
const DISTANCES = [1, 2, 3, 5, 10, 15];

interface SearchChipsProps {
  criteria: SearchCriteria;
  onChange: (next: SearchCriteria) => void;
  origin: Place | null;
  areas: Area[];
  languageOptions: string[];
  /** Languages found in any centre's data (lowercase); others can't be checked. */
  knownLanguages: Set<string>;
}

const chipBase =
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors';

const RemoveButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={`Remove ${label}`}
    className="rounded-full p-0.5 hover:bg-black/5 cursor-pointer"
  >
    <X className="w-3 h-3" />
  </button>
);

const InlineSelect: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onPick: (v: string) => void;
  onClose: () => void;
}> = ({ label, value, options, onPick, onClose }) => (
  <select
    autoFocus
    aria-label={label}
    value={value}
    onChange={(e) => {
      if (e.target.value) onPick(e.target.value);
      onClose();
    }}
    onBlur={onClose}
    className="rounded-full border border-cq-brand bg-white px-3 py-1 text-xs text-cq-ink focus:outline-hidden max-w-[240px]"
  >
    <option value="">{label}…</option>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

export const SearchChips: React.FC<SearchChipsProps> = ({
  criteria,
  onChange,
  origin,
  areas,
  languageOptions,
  knownLanguages,
}) => {
  const [editing, setEditing] = useState<FilterKey | null>(null);
  const set = (patch: Partial<SearchCriteria>) => onChange({ ...criteria, ...patch });

  const areaOptions = areas.map((a) => ({ value: a.name, label: a.name }));
  const editorFor = (key: FilterKey) => {
    const close = () => setEditing(null);
    switch (key) {
      case 'area':
        return <InlineSelect label="Pick an area" value="" options={areaOptions} onPick={(v) => set({ areaText: v })} onClose={close} />;
      case 'distance':
        return (
          <InlineSelect
            label="Distance"
            value=""
            options={DISTANCES.map((d) => ({ value: String(d), label: `Within ${d} km` }))}
            onPick={(v) => set({ maxDistanceKm: Number(v) })}
            onClose={close}
          />
        );
      case 'age':
        return (
          <InlineSelect
            label="Age group"
            value=""
            options={AGE_GROUPS.map((a) => ({ value: a, label: a }))}
            onPick={(v) => set({ ageGroup: v as AgeGroup, childAgeMonths: null })}
            onClose={close}
          />
        );
      case 'care':
        return (
          <InlineSelect
            label="Care type"
            value=""
            options={CARE_TYPES.map((c) => ({ value: c, label: c }))}
            onPick={(v) => set({ careType: v as CareType })}
            onClose={close}
          />
        );
      case 'language':
        return (
          <InlineSelect
            label="Language"
            value=""
            options={languageOptions.filter((l) => !criteria.languages.includes(l)).map((l) => ({ value: l, label: l }))}
            onPick={(v) => set({ languages: [...criteria.languages, v] })}
            onClose={close}
          />
        );
    }
  };

  const editableChip = (key: FilterKey, label: React.ReactNode, onRemove: () => void) =>
    editing === key ? (
      <span key={key}>{editorFor(key)}</span>
    ) : (
      <span
        key={key}
        role="button"
        tabIndex={0}
        onClick={() => setEditing(key)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditing(key)}
        title="Click to change"
        className={`${chipBase} border-cq-brand/30 bg-cq-brand/5 text-cq-brand cursor-pointer hover:bg-cq-brand/10`}
      >
        {label}
        <RemoveButton label={FILTER_LABELS[key]} onClick={onRemove} />
      </span>
    );

  const chips: React.ReactNode[] = [];

  // Area: placed, or "couldn't place" with an area picker
  if (criteria.areaText) {
    if (origin) {
      chips.push(
        editableChip(
          'area',
          <>
            <MapPin className="w-3 h-3" /> Near {origin.label}
          </>,
          () => set({ areaText: null })
        )
      );
    } else {
      chips.push(
        <span key="area-unplaced" className={`${chipBase} border-cq-sand-line bg-cq-sand-50 text-cq-sand-ink-2`}>
          Couldn&apos;t place &lsquo;{criteria.areaText}&rsquo; — pick an area
          <select
            aria-label="Pick an area"
            value=""
            onChange={(e) => e.target.value && set({ areaText: e.target.value })}
            className="rounded-md border border-cq-sand-line bg-white px-1.5 py-0.5 text-xs text-cq-ink max-w-[180px]"
          >
            <option value="">Choose…</option>
            {areaOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <RemoveButton label="area" onClick={() => set({ areaText: null })} />
        </span>
      );
    }
  }
  if (criteria.maxDistanceKm !== null) {
    chips.push(editableChip('distance', `Within ${criteria.maxDistanceKm} km`, () => set({ maxDistanceKm: null })));
  }
  if (criteria.ageGroup) {
    chips.push(
      editableChip(
        'age',
        `${criteria.ageGroup}${criteria.childAgeMonths !== null ? ` (${criteria.childAgeMonths} months)` : ''}`,
        () => set({ ageGroup: null, childAgeMonths: null })
      )
    );
  }
  if (criteria.careType) {
    chips.push(editableChip('care', criteria.careType, () => set({ careType: null })));
  }
  criteria.languages.forEach((lang) => {
    const removeLang = () => set({ languages: criteria.languages.filter((l) => l !== lang) });
    chips.push(
      knownLanguages.has(lang.toLowerCase()) ? (
        <span key={`lang-${lang}`} className={`${chipBase} border-cq-brand/30 bg-cq-brand/5 text-cq-brand`}>
          Language: {lang}
          <RemoveButton label={`language ${lang}`} onClick={removeLang} />
        </span>
      ) : (
        <span
          key={`lang-${lang}`}
          title="No centre's data lists this language, so it doesn't affect the order."
          className={`${chipBase} border-cq-line bg-cq-surface-stone text-cq-soft`}
        >
          <HelpCircle className="w-3 h-3" /> Can&apos;t check: {lang}-speaking staff
          <RemoveButton label={`language ${lang}`} onClick={removeLang} />
        </span>
      )
    );
  });

  // Must-haves / nice-to-haves: checkable ones are normal chips; others grey "Can't check"
  const removeWish = (w: string) =>
    set({ mustHaves: criteria.mustHaves.filter((m) => m !== w), niceToHaves: criteria.niceToHaves.filter((m) => m !== w) });
  [...criteria.mustHaves.map((w) => ({ w, nice: false })), ...criteria.niceToHaves.map((w) => ({ w, nice: true }))].forEach(
    ({ w, nice }) => {
      const fact = checkableFact(w, knownLanguages);
      chips.push(
        fact ? (
          <span key={`wish-${w}`} className={`${chipBase} border-cq-brand/30 bg-cq-brand/5 text-cq-brand`}>
            {fact.label}
            {nice ? ' (nice to have)' : ''}
            <RemoveButton label={fact.label} onClick={() => removeWish(w)} />
          </span>
        ) : (
          <span
            key={`wish-${w}`}
            title="CareQ has no data to check this, so it doesn't affect the order."
            className={`${chipBase} border-cq-line bg-cq-surface-stone text-cq-soft`}
          >
            <HelpCircle className="w-3 h-3" /> Can&apos;t check: {w}
            <RemoveButton label={w} onClick={() => removeWish(w)} />
          </span>
        )
      );
    }
  );
  if (criteria.startDate) {
    chips.push(
      <span
        key="start"
        title="CareQ never knows availability unless a centre reports it."
        className={`${chipBase} border-cq-line bg-cq-surface-stone text-cq-soft`}
      >
        <HelpCircle className="w-3 h-3" /> Can&apos;t check: start {criteria.startDate}
        <RemoveButton label="start date" onClick={() => set({ startDate: null })} />
      </span>
    );
  }

  // "+ Add filter": filters not yet set
  const addable = (Object.keys(FILTER_LABELS) as FilterKey[]).filter((k) =>
    k === 'area' ? !criteria.areaText : k === 'distance' ? criteria.maxDistanceKm === null : k === 'age' ? !criteria.ageGroup : k === 'care' ? !criteria.careType : true
  );
  const addingNew = editing && !chips.some((c) => React.isValidElement(c) && c.key === editing);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips}
      {addingNew && editing && <span>{editorFor(editing)}</span>}
      {!addingNew && addable.length > 0 && (
        <select
          aria-label="Add filter"
          value=""
          onChange={(e) => e.target.value && setEditing(e.target.value as FilterKey)}
          className={`${chipBase} border-dashed border-cq-faint-2 bg-white text-cq-muted cursor-pointer hover:border-cq-brand`}
        >
          <option value="">+ Add filter</option>
          {addable.map((k) => (
            <option key={k} value={k}>
              {FILTER_LABELS[k]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
