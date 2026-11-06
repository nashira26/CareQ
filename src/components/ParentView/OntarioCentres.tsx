import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Heart, Loader2, Database, Users } from 'lucide-react';
import { AgeGroup } from '../../data/mockData';
import {
  OntarioCentre,
  OntarioCentresFile,
  formatSourceDate,
} from '../../data/ontarioTypes';
import { Eyebrow, Card, GhostButton, SimNote } from '../ui/CareUI';

const PAGE_SIZE = 24;
const SHORTLIST_KEY = 'careq.shortlist.v1';

const readShortlist = (): string[] => {
  try {
    const raw = window.localStorage.getItem(SHORTLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/**
 * Loads the real Ontario/Toronto open-data centres (lazily, as a separate chunk), and holds the
 * filters and the browser-saved shortlist. Used by FindTab for both the list and the map.
 */
export function useOntarioCentres(searchQuery: string, selectedAgeGroup: string) {
  const [file, setFile] = useState<OntarioCentresFile | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [area, setArea] = useState('All');
  const [program, setProgram] = useState('All');
  const [language, setLanguage] = useState('All');
  const [shortlistOnly, setShortlistOnly] = useState(false);
  // CareQ is for ages 0-5, so kindergarten/school-age-only programs are hidden by default.
  const [includeSchoolAgeOnly, setIncludeSchoolAgeOnly] = useState(false);
  const [shortlist, setShortlist] = useState<string[]>(readShortlist);

  useEffect(() => {
    let cancelled = false;
    import('../../data/ontarioCentres.json')
      .then((m) => {
        if (!cancelled) setFile(m.default as unknown as OntarioCentresFile);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(shortlist));
    } catch {
      /* storage blocked: shortlist lasts for this session only */
    }
  }, [shortlist]);

  const toggleShortlist = (id: string) =>
    setShortlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const centres = file?.centres ?? [];

  const options = useMemo(() => {
    const uniq = (xs: string[]) => Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b));
    return {
      areas: uniq(centres.map((c) => c.area)),
      programs: uniq(centres.flatMap((c) => c.programOptions)),
      languages: uniq(centres.flatMap((c) => c.languages)),
    };
  }, [centres]);

  const { filtered, hiddenSchoolAgeOnly } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let hidden = 0;
    const list = centres.filter((c) => {
      if (area !== 'All' && c.area !== area) return false;
      if (program !== 'All' && !c.programOptions.includes(program)) return false;
      if (language !== 'All' && !c.languages.includes(language)) return false;
      if (shortlistOnly && !shortlist.includes(c.id)) return false;
      // Age filter applies only where the City of Toronto data reported ages; others stay listed.
      if (selectedAgeGroup !== 'All' && c.ageGroups && !c.ageGroups.includes(selectedAgeGroup as AgeGroup)) {
        return false;
      }
      if (
        q &&
        !(
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q) ||
          c.postalCode.toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, ''))
        )
      ) {
        return false;
      }
      // Checked last, so the hidden count only covers centres the other filters would show.
      const schoolAgeOnly = c.ageGroups !== null && c.ageGroups.length === 0;
      if (schoolAgeOnly && !includeSchoolAgeOnly) {
        hidden++;
        return false;
      }
      return true;
    });
    // With an age filter on, centres whose ages are reported come before "Ages not reported".
    const sorted =
      selectedAgeGroup !== 'All'
        ? [...list].sort((a, b) => Number(!a.ageGroups) - Number(!b.ageGroups))
        : list;
    return { filtered: sorted, hiddenSchoolAgeOnly: hidden };
  }, [centres, searchQuery, selectedAgeGroup, area, program, language, shortlistOnly, shortlist, includeSchoolAgeOnly]);

  return {
    file,
    loadError,
    filtered,
    hiddenSchoolAgeOnly,
    options,
    filters: { area, program, language, shortlistOnly, includeSchoolAgeOnly },
    setIncludeSchoolAgeOnly,
    setArea,
    setProgram,
    setLanguage,
    setShortlistOnly,
    shortlist,
    toggleShortlist,
  };
}

export type OntarioCentresState = ReturnType<typeof useOntarioCentres>;

const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}> = ({ label, value, onChange, options, allLabel }) => (
  <div className="px-4 py-2.5 flex flex-col justify-center min-w-[150px] border-t md:border-t-0 border-[#E7E4DA]">
    <Eyebrow className="text-[10px]">{label}</Eyebrow>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Filter by ${label.toLowerCase()}`}
      className="bg-transparent border-none text-xs font-semibold text-[#173F42] focus:outline-hidden cursor-pointer mt-0.5 p-0"
    >
      <option value="All">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o} className="text-stone-800">
          {o}
        </option>
      ))}
    </select>
  </div>
);

const Chip: React.FC<{ children: React.ReactNode; tone?: 'sage' | 'sand' | 'grey' }> = ({
  children,
  tone = 'sage',
}) => {
  const tones = {
    sage: 'border-[#D9E4D3] bg-[#F4F6F1] text-[#4E7A5A]',
    sand: 'border-[#E7D6A8] bg-[#FBF6EA] text-[#8A6A3B]',
    grey: 'border-[#E7E4DA] bg-[#FAF9F4] text-[#7A8A84]',
  };
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
};

const OntarioCentreCard: React.FC<{
  centre: OntarioCentre;
  file: OntarioCentresFile;
  isShortlisted: boolean;
  onToggleShortlist: () => void;
}> = ({ centre, file, isShortlisted, onToggleShortlist }) => {
  const { sources } = file.metadata;
  const fromToronto = centre.dataSources.includes('toronto');
  const geocoded = centre.dataSources.includes('osm');

  return (
    <div className="bg-white rounded-2xl border border-[#E7E4DA] p-5 flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-[#7A8A84]">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{centre.area}</span>
            </div>
            <h3 className="text-[15px] font-bold text-[#173F42] mt-1 leading-snug">{centre.name}</h3>
          </div>
          <button
            type="button"
            onClick={onToggleShortlist}
            aria-pressed={isShortlisted}
            aria-label={isShortlisted ? `Remove ${centre.name} from shortlist` : `Add ${centre.name} to shortlist`}
            title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist (saved in this browser)'}
            className="p-1.5 rounded-lg hover:bg-[#FAF9F4] cursor-pointer shrink-0"
          >
            <Heart
              className={`w-4 h-4 ${isShortlisted ? 'fill-[#C46E4E] text-[#C46E4E]' : 'text-[#7A8A84]'}`}
            />
          </button>
        </div>

        <p className="text-xs text-[#5B6B66] mt-2">{centre.address}</p>
        <p className="text-[11px] text-[#7A8A84] mt-1">
          Licence {centre.licenceStatus.toLowerCase()} · #{centre.licenceNumber}
        </p>

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
        </div>

        {centre.programOptions.length > 0 && (
          <p className="text-[11px] text-[#5B6B66] mt-2">
            <span className="font-semibold">Programs:</span> {centre.programOptions.join(', ')}
          </p>
        )}
        {centre.languages.length > 0 && (
          <p className="text-[11px] text-[#5B6B66] mt-0.5">
            <span className="font-semibold">Language:</span> {centre.languages.join(', ')}
          </p>
        )}
        {centre.capacity !== null && (
          <p className="text-[11px] text-[#5B6B66] mt-0.5 flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>
              {centre.capacity} licensed spaces in total (capacity, not availability)
            </span>
          </p>
        )}
      </div>

      <div className="border-t border-[#E7E4DA] pt-3 space-y-1">
        <p className="text-xs font-semibold text-[#5B6B66]">Availability not reported</p>
        <p className="text-[11px] text-[#7A8A84]">
          Not part of the CareQ demo; contact the centre directly.
        </p>
        <div className="pt-1 space-y-0.5 text-[10px] text-[#7A8A84]">
          <p className="flex items-center gap-1">
            <Database className="w-3 h-3 shrink-0" />
            Ontario open data · {formatSourceDate(sources.ontario.dataDate)}
          </p>
          {fromToronto && (
            <p className="flex items-center gap-1">
              <Database className="w-3 h-3 shrink-0" />
              City of Toronto open data · {formatSourceDate(sources.toronto.dataDate)}
            </p>
          )}
          {geocoded && <p className="pl-4">Location: Geocoding © OpenStreetMap contributors</p>}
          {centre.lat === null && <p className="pl-4">Location not found · not shown on map</p>}
        </div>
      </div>
    </div>
  );
};

/** Section of real licensed centres on the Find page. No apply, message, waitlist or fees. */
export const OntarioCentresSection: React.FC<{ state: OntarioCentresState }> = ({ state }) => {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { file, loadError, filtered, options, filters } = state;

  useEffect(() => setVisible(PAGE_SIZE), [filtered]);

  return (
    <section className="space-y-4 pt-4">
      <div>
        <Eyebrow>Real licensed centres</Eyebrow>
        <h2 className="mt-1 text-xl font-bold text-[#173F42]">
          Licensed child care centres in Toronto
        </h2>
        <p className="mt-1 text-xs text-[#5B6B66] max-w-2xl">
          From public open data. CareQ has no availability, waitlist or fee information for these
          centres. Contact a centre directly to apply. Save the ones you like with the heart.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E7E4DA] bg-white flex flex-col md:flex-row md:divide-x divide-[#E7E4DA] shadow-2xs">
        <FilterSelect label="Area" value={filters.area} onChange={state.setArea} options={options.areas} allLabel="All areas" />
        <FilterSelect label="Program" value={filters.program} onChange={state.setProgram} options={options.programs} allLabel="All programs" />
        <FilterSelect label="Language" value={filters.language} onChange={state.setLanguage} options={options.languages} allLabel="All languages" />
        <label className="px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-[#173F42] cursor-pointer border-t md:border-t-0 border-[#E7E4DA]">
          <input
            type="checkbox"
            checked={filters.shortlistOnly}
            onChange={(e) => state.setShortlistOnly(e.target.checked)}
          />
          <Heart className="w-3.5 h-3.5 text-[#C46E4E]" />
          Shortlist only ({state.shortlist.length})
        </label>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <SimNote>The age group filter above applies where the City of Toronto data reports ages; other centres show "Ages not reported".</SimNote>
        <label className="flex items-center gap-2 text-xs text-[#173F42] cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={filters.includeSchoolAgeOnly}
            onChange={(e) => state.setIncludeSchoolAgeOnly(e.target.checked)}
          />
          <span>
            Include school-age-only programs
            {!filters.includeSchoolAgeOnly && file && (
              <span className="text-[#7A8A84]"> ({state.hiddenSchoolAgeOnly} hidden)</span>
            )}
          </span>
        </label>
      </div>

      {loadError ? (
        <Card className="text-center py-8 text-sm text-[#5B6B66]">Could not load the open data centres.</Card>
      ) : !file ? (
        <div className="flex items-center gap-2 text-xs text-[#5B6B66] py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading licensed centres…
        </div>
      ) : (
        <>
          <p className="text-sm font-bold text-[#173F42]">
            {filtered.length} centres
            <span className="ml-2 text-xs font-normal text-[#7A8A84]">
              of {file.metadata.centreCount} active licensed centres in Toronto
            </span>
          </p>
          {filtered.length === 0 ? (
            <Card className="text-center py-10 text-sm text-[#5B6B66]">
              No licensed centres match these filters.
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.slice(0, visible).map((c) => (
                <OntarioCentreCard
                  key={c.id}
                  centre={c}
                  file={file}
                  isShortlisted={state.shortlist.includes(c.id)}
                  onToggleShortlist={() => state.toggleShortlist(c.id)}
                />
              ))}
            </div>
          )}
          {visible < filtered.length && (
            <div className="text-center">
              <GhostButton onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Show more ({filtered.length - visible} left)
              </GhostButton>
            </div>
          )}
        </>
      )}
    </section>
  );
};
