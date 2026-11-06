import React, { useEffect, useState } from 'react';
import { MapPin, Heart, Database, Users, Navigation } from 'lucide-react';
import { OntarioCentre, OntarioCentresFile, formatSourceDate } from '../../data/ontarioTypes';

import { SHORTLIST_KEY } from '../../lib/demoStorage';

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
    className="p-1.5 rounded-lg hover:bg-[#FAF9F4] cursor-pointer shrink-0"
  >
    <Heart className={`w-4 h-4 ${active ? 'fill-[#C46E4E] text-[#C46E4E]' : 'text-[#7A8A84]'}`} />
  </button>
);

export const Chip: React.FC<{ children: React.ReactNode; tone?: 'sage' | 'sand' | 'grey' | 'peach' }> = ({
  children,
  tone = 'sage',
}) => {
  const tones = {
    sage: 'border-[#D9E4D3] bg-[#F4F6F1] text-[#4E7A5A]',
    sand: 'border-[#E7D6A8] bg-[#FBF6EA] text-[#8A6A3B]',
    grey: 'border-[#E7E4DA] bg-[#FAF9F4] text-[#7A8A84]',
    peach: 'border-[#F2D3C4] bg-[#FBE9E1] text-[#A4543A]',
  };
  return <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>{children}</span>;
};

/** Search result extras shown on both card types. */
export interface ResultInfo {
  distanceKm: number | null;
  reason: string | null;
}

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

  return (
    <div className="bg-white rounded-2xl border border-[#E7E4DA] p-5 flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block rounded px-1.5 py-0.5 bg-[#ECE8F5] text-[#5A4A85] text-[10px] font-semibold">
              Not on CareQ yet · Ontario open data
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-[#7A8A84] mt-2">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{centre.area}</span>
              {result?.distanceKm != null && (
                <span className="font-semibold text-[#173F42] flex items-center gap-1 ml-1">
                  <Navigation className="w-3 h-3" />
                  {result.distanceKm.toFixed(1)} km
                </span>
              )}
            </div>
            <h3 className="text-[15px] font-bold text-[#173F42] mt-1 leading-snug">{centre.name}</h3>
          </div>
          <HeartButton name={centre.name} active={isShortlisted} onToggle={onToggleShortlist} />
        </div>
        {isShortlisted && (
          <span className="inline-block mt-1.5">
            <Chip tone="peach">Shortlisted</Chip>
          </span>
        )}

        <p className="text-xs text-[#5B6B66] mt-2">{centre.address}</p>
        <p className="text-[11px] text-[#7A8A84] mt-1">
          Licence {centre.licenceStatus.toLowerCase()} · #{centre.licenceNumber}
        </p>

        {result?.reason && (
          <p className="mt-3 text-xs text-[#5B6B66] bg-[#F3EEE3]/60 border border-[#E7E4DA] rounded-lg p-2.5">
            {result.reason}
          </p>
        )}

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
            <span>{centre.capacity} licensed spaces in total (capacity, not availability)</span>
          </p>
        )}
      </div>

      <div className="border-t border-[#E7E4DA] pt-3 space-y-1">
        <p className="text-xs font-semibold text-[#5B6B66]">Availability not reported</p>
        <p className="text-[11px] text-[#7A8A84]">Not part of the CareQ demo; contact the centre directly.</p>
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
