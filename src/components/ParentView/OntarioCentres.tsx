import React, { useEffect, useId, useState } from 'react';
import { MapPin, Heart, Database, Users, ChevronDown } from 'lucide-react';
import { OntarioCentre, OntarioCentresFile, formatSourceDate } from '../../data/ontarioTypes';

import { SHORTLIST_KEY } from '../../lib/demoStorage';
import { AskAboutCentre } from '../AskAboutCentre';
import { CentreAvatar } from '../ui/CareUI';

const readShortlist = (): string[] => {
  try {
    const raw = window.localStorage.getItem(SHORTLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/** Shortlist of centre ids (partner and open-data), saved in this browser only. */
export function useShortlist() {
  const [shortlist, setShortlist] = useState<string[]>(readShortlist);
  useEffect(() => {
    try {
      window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(shortlist));
    } catch {
      /* storage blocked: shortlist lasts for this session only */
    }
  }, [shortlist]);
  const toggle = (id: string) =>
    setShortlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  return { shortlist, toggle };
}

/** Loads the real open-data centres as a separate chunk. */
export function useOntarioData() {
  const [file, setFile] = useState<OntarioCentresFile | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import('../../data/ontarioCentres.json')
      .then((m) => !cancelled && setFile(m.default as unknown as OntarioCentresFile))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);
  return { file, loadError };
}

export const HeartButton: React.FC<{ name: string; active: boolean; onToggle: () => void }> = ({
  name,
  active,
  onToggle,
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={active}
    aria-label={active ? `Remove ${name} from shortlist` : `Add ${name} to shortlist`}
    title={active ? 'Remove from shortlist' : 'Add to shortlist (saved in this browser)'}
    className="w-11 h-11 -mt-2 -mr-2 inline-flex items-center justify-center rounded-xl hover:bg-peach cursor-pointer shrink-0 transition-colors"
  >
    <Heart className={`w-5 h-5 transition-transform duration-200 ${active ? 'fill-coral text-coral-ink scale-110' : 'text-ink-muted'}`} />
  </button>
);

export const Chip: React.FC<{ children: React.ReactNode; tone?: 'sage' | 'sand' | 'grey' | 'peach' }> = ({
  children,
  tone = 'sage',
}) => {
  const tones = {
    sage: 'bg-mint text-leaf-ink',
    sand: 'bg-butter text-cq-sand-ink',
    grey: 'bg-stone text-status-draft',
    peach: 'bg-peach text-coral-ink',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 h-[26px] text-xs font-bold ${tones[tone]}`}>{children}</span>;
};

/**
 * Secondary facts on a centre card. Collapsed on phones behind "More details" (everything stays
 * available); always shown from the small-tablet width up.
 */
export const MoreDetails: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="sm:hidden inline-flex items-center gap-1.5 h-10 -ml-1 px-1 text-sm font-bold text-brand cursor-pointer"
      >
        {open ? 'Fewer details' : 'More details'}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id={id} className={`${open ? 'block' : 'hidden'} sm:block space-y-1 text-sm text-ink-muted`}>
        {children}
      </div>
    </div>
  );
};

/** Search result extras shown on both card types. */
export interface ResultInfo {
  distanceKm: number | null;
  reason: string | null;
  /** Requested languages too rare to filter on: shown on each card. */
  languageStatus?: { language: string; offered: boolean | null }[];
}

/** "French: offered" / "French: not offered" / "French: not reported" on a result card. */
export const LanguageStatus: React.FC<{ items?: ResultInfo['languageStatus'] }> = ({ items }) =>
  items?.length ? (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map(({ language, offered }) => (
        <Chip key={language} tone={offered ? 'sage' : 'grey'}>
          {language}: {offered === true ? 'offered' : offered === false ? 'not offered' : 'not reported'}
        </Chip>
      ))}
    </div>
  ) : null;

/** "Availability not reported" box, shared by both card types. */
export const AvailabilityBox: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="mt-3 rounded-xl border border-dashed border-line-strong bg-page px-3.5 py-2.5 text-sm">
    <p className="font-bold text-ink">{title}</p>
    {children && <p className="text-ink-muted">{children}</p>}
  </div>
);

export const OntarioCentreCard: React.FC<{
  centre: OntarioCentre;
  file: OntarioCentresFile;
  isShortlisted: boolean;
  onToggleShortlist: () => void;
  result?: ResultInfo;
}> = ({ centre, file, isShortlisted, onToggleShortlist, result }) => {
  const { sources } = file.metadata;
  const fromToronto = centre.dataSources.includes('toronto');
  const geocoded = centre.dataSources.includes('osm');
  const distance = result?.reason ?? (result?.distanceKm != null ? `${result.distanceKm.toFixed(1)} km away` : null);

  return (
    <article className="bg-white rounded-2xl border border-cq-line p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center rounded-md px-2 h-6 bg-stone text-status-draft text-xs font-bold">
          Not on CareQ yet · Ontario open data
        </span>
        <HeartButton name={centre.name} active={isShortlisted} onToggle={onToggleShortlist} />
      </div>

      <div className="flex items-start gap-3 mt-1">
        <CentreAvatar centreId={centre.id} />
        <div className="min-w-0">
          <h3 className="text-[17px] font-extrabold text-ink leading-snug">{centre.name}</h3>
          <p className="text-sm text-ink-muted mt-0.5">{centre.address}</p>
        </div>
      </div>

      {distance ? (
        <p className="mt-3 flex items-start gap-1.5 text-sm font-bold text-brand">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{distance}</span>
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
          {centre.area}
        </p>
      )}
      <LanguageStatus items={result?.languageStatus} />

      {/* Ages: only from City of Toronto data */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {centre.ageGroups === null ? (
          <Chip tone="grey">Ages not reported</Chip>
        ) : centre.ageGroups.length === 0 ? (
          <Chip tone="grey">No infant, toddler or preschool spaces listed</Chip>
        ) : (
          centre.ageGroups.map((age) => <Chip key={age}>{age}</Chip>)
        )}
        {centre.cwelcc === true && <Chip tone="sand">CWELCC participant</Chip>}
        {centre.cwelcc === false && <Chip tone="grey">Not in CWELCC</Chip>}
        {isShortlisted && <Chip tone="peach">Shortlisted</Chip>}
      </div>

      <AvailabilityBox title="Availability not reported">Not part of the CareQ demo; contact the centre directly.</AvailabilityBox>

      <MoreDetails>
        {centre.programOptions.length > 0 && (
          <p>
            <span className="font-bold text-ink">Programs:</span> {centre.programOptions.join(', ')}
          </p>
        )}
        {centre.languages.length > 0 && (
          <p>
            <span className="font-bold text-ink">Language:</span> {centre.languages.join(', ')}
          </p>
        )}
        {centre.capacity !== null && (
          <p className="flex items-start gap-1.5">
            <Users className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{centre.capacity} licensed spaces in total (capacity, not availability)</span>
          </p>
        )}
        <p>
          Licence {centre.licenceStatus.toLowerCase()} · #{centre.licenceNumber}
        </p>
        <div className="pt-1 space-y-0.5 text-xs text-ink-soft">
          <p className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Ontario open data · {formatSourceDate(sources.ontario.dataDate)}
          </p>
          {fromToronto && (
            <p className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              City of Toronto open data · {formatSourceDate(sources.toronto.dataDate)}
            </p>
          )}
          {geocoded && <p className="pl-5">Location: Geocoding © OpenStreetMap contributors</p>}
          {centre.lat === null && <p className="pl-5">Location not found · not shown on map</p>}
        </div>
      </MoreDetails>

      <div className="mt-auto pt-3">
        <AskAboutCentre centreId={centre.id} centreName={centre.name} />
      </div>
    </article>
  );
};
