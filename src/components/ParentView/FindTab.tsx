import React, { useEffect, useMemo, useState } from 'react';
import { Centre, Application, ApplicationStatus, ParentProfile } from '../../data/mockData';
import { OntarioCentre } from '../../data/ontarioTypes';
import {
  MapPin,
  Clock,
  Search,
  ArrowRight,
  Sparkles,
  Loader2,
  RotateCcw,
  LayoutList,
  Map as MapIcon,
  Navigation,
} from 'lucide-react';
import { DaycareMap } from './DaycareMap';
import { useOntarioData, useShortlist, OntarioCentreCard, HeartButton, Chip, ResultInfo } from './OntarioCentres';
import { SearchChips } from './SearchChips';
import {
  PageHeader,
  Eyebrow,
  Card,
  GhostButton,
  HouseIllustration,
  HouseIllustrationTone,
  AiFallbackNote,
  AiMode,
} from '../ui/CareUI';
import { EMPTY_CRITERIA, SearchCriteria, hasAnyCriteria, sanitizeCriteria, parseSearchFallback } from '../../lib/searchCriteria';
import {
  Area,
  FsaCentroids,
  RankableCentre,
  RankedCentre,
  factsSentence,
  knownLanguagesOf,
  rankCentres,
  resolveArea,
} from '../../lib/rankCentres';
import torontoAreas from '../../data/torontoAreas.json';
import fsaCentroids from '../../data/fsaCentroids.json';

// Approximate centre points, used only to sort by distance (see metadata.approximate).
const AREAS = (torontoAreas as { areas: Area[] }).areas;
const FSA = fsaCentroids as FsaCentroids;
const TONES: HouseIllustrationTone[] = ['sage', 'lilac', 'sky'];
const PAGE_SIZE = 24;
const EXPLAIN_TOP_N = 10;

interface FindTabProps {
  centres: Centre[];
  applications: Application[];
  parentProfile: ParentProfile;
  onSelectCentre: (centreId: string) => void;
  onNavigateToApply: () => void;
  onOpenConversation: (centreId: string) => void;
}

type Entry =
  | { kind: 'partner'; id: string; name: string; centre: Centre; rankable: RankableCentre }
  | { kind: 'open-data'; id: string; name: string; centre: OntarioCentre; rankable: RankableCentre };

const partnerToRankable = (c: Centre): RankableCentre => ({
  id: c.id,
  name: c.name,
  kind: 'partner',
  lat: c.lat ?? null,
  lng: c.lng ?? null,
  ageGroups: c.ageGroups,
  programOptions: c.programOptions ?? [],
  languages: c.languages ?? [],
  cwelcc: c.feeNote ? /cwelcc/i.test(c.feeNote) : null,
});

const openDataToRankable = (c: OntarioCentre): RankableCentre => ({
  id: c.id,
  name: c.name,
  kind: 'open-data',
  lat: c.lat,
  lng: c.lng,
  ageGroups: c.ageGroups,
  programOptions: c.programOptions,
  languages: c.languages,
  cwelcc: c.cwelcc,
});

/** Key for an AI explanation: reused only while the centre's facts are unchanged. */
const explainKey = (r: RankedCentre) => `${r.id}|${r.matchedFacts.join(';')}|${r.unknownFacts.join(';')}`;

const appliedLabel = (status: ApplicationStatus) => (status === 'Draft' ? 'Draft application' : `Applied · ${status}`);

/** Queue position exactly as the centre reported it, with the date when known. */
const positionLabel = (app: Application) =>
  app.waitlistPosition
    ? `#${app.waitlistPosition} · reported by centre${app.waitlistReportedDate ? ` on ${app.waitlistReportedDate}` : ''}`
    : null;

export const FindTab: React.FC<FindTabProps> = ({
  centres,
  applications,
  parentProfile: _parentProfile,
  onSelectCentre,
  onNavigateToApply,
  onOpenConversation,
}) => {
  const [searchText, setSearchText] = useState('');
  const [criteria, setCriteria] = useState<SearchCriteria>(EMPTY_CRITERIA);
  const [isParsing, setIsParsing] = useState(false);
  const [parseAiMode, setParseAiMode] = useState<AiMode | null>(null);
  const [explainAiMode, setExplainAiMode] = useState<AiMode | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explainRequest, setExplainRequest] = useState(0);
  const [includeSchoolAgeOnly, setIncludeSchoolAgeOnly] = useState(false);
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { file: ontarioFile, loadError } = useOntarioData();
  const { shortlist, toggle: toggleShortlist } = useShortlist();

  // Applications by centre (the parent's own applications only are passed in)
  const appByCentre = useMemo(() => {
    const m = new Map<string, Application>();
    applications.filter((a) => a.status !== 'Withdrawn').forEach((a) => m.set(a.centreId, a));
    return m;
  }, [applications]);

  // One list of all centres: partner centres first, then open-data centres A–Z
  const allEntries: Entry[] = useMemo(() => {
    const partner: Entry[] = centres.map((c) => ({ kind: 'partner', id: c.id, name: c.name, centre: c, rankable: partnerToRankable(c) }));
    const open: Entry[] = (ontarioFile?.centres ?? []).map((c) => ({
      kind: 'open-data',
      id: c.id,
      name: c.name,
      centre: c,
      rankable: openDataToRankable(c),
    }));
    return [...partner, ...open];
  }, [centres, ontarioFile]);
  const entryById = useMemo(() => new Map(allEntries.map((e) => [e.id, e])), [allEntries]);

  const languageOptions = useMemo(
    () => Array.from(new Set(allEntries.flatMap((e) => e.rankable.languages))).sort((a, b) => a.localeCompare(b)),
    [allEntries]
  );
  // Languages found in ANY centre's data; others can't be checked (taken from all centres, not the filtered pool)
  const knownLanguages = useMemo(() => knownLanguagesOf(allEntries.map((e) => e.rankable)), [allEntries]);

  // Checkbox filters, applied before ranking
  const { pool, hiddenSchoolAgeOnly } = useMemo(() => {
    let hidden = 0;
    const list = allEntries.filter((e) => {
      if (shortlistOnly && !shortlist.includes(e.id)) return false;
      const schoolAgeOnly = e.rankable.ageGroups !== null && e.rankable.ageGroups.length === 0;
      if (schoolAgeOnly && !includeSchoolAgeOnly) {
        hidden++;
        return false;
      }
      return true;
    });
    return { pool: list, hiddenSchoolAgeOnly: hidden };
  }, [allEntries, shortlistOnly, shortlist, includeSchoolAgeOnly]);

  const searching = hasAnyCriteria(criteria);
  const origin = useMemo(() => resolveArea(criteria.areaText, AREAS, FSA), [criteria.areaText]);
  const areaUnplaced = Boolean(criteria.areaText) && !origin;

  // Ranking is plain code (src/lib/rankCentres.ts) and re-runs instantly when chips change.
  const ranked: RankedCentre[] | null = useMemo(
    () => (searching ? rankCentres(criteria, pool.map((e) => e.rankable), origin, knownLanguages) : null),
    [searching, criteria, pool, origin, knownLanguages]
  );
  const results: { entry: Entry; rank: RankedCentre | null }[] = useMemo(
    () =>
      ranked
        ? ranked.map((r) => ({ entry: entryById.get(r.id)!, rank: r }))
        : pool.map((entry) => ({ entry, rank: null })),
    [ranked, pool, entryById]
  );

  useEffect(() => setVisible(PAGE_SIZE), [results]);

  // AI explanations for the top 10, only after a typed search (chip edits never call Gemini).
  useEffect(() => {
    if (!explainRequest || !ranked || ranked.length === 0) return;
    const top = ranked.slice(0, EXPLAIN_TOP_N);
    let cancelled = false;
    fetch('/api/explain-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        results: top.map((r) => ({
          id: r.id,
          name: entryById.get(r.id)?.name ?? '',
          matchedFacts: r.matchedFacts,
          unknownFacts: r.unknownFacts,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.explanations) return;
        setExplainAiMode(data.aiMode ?? null);
        setExplanations((prev) => {
          const next = { ...prev };
          top.forEach((r) => {
            if (typeof data.explanations[r.id] === 'string') next[explainKey(r)] = data.explanations[r.id];
          });
          return next;
        });
      })
      .catch(() => !cancelled && setExplainAiMode('fallback'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explainRequest]);

  const reasonFor = (r: RankedCentre) => explanations[explainKey(r)] ?? factsSentence(r.matchedFacts, r.unknownFacts);

  const handleSearch = async () => {
    const text = searchText.trim();
    if (!text) {
      handleClear();
      return;
    }
    setIsParsing(true);
    setExplainAiMode(null);
    try {
      const res = await fetch('/api/parse-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setCriteria(sanitizeCriteria(data.criteria));
      setParseAiMode(data.aiMode ?? null);
    } catch {
      // Server unreachable: same keyword parser, in the browser
      setCriteria(parseSearchFallback(text));
      setParseAiMode('fallback');
    } finally {
      setIsParsing(false);
      setExplainRequest((n) => n + 1);
    }
  };

  const handleClear = () => {
    setSearchText('');
    setCriteria(EMPTY_CRITERIA);
    setParseAiMode(null);
    setExplainAiMode(null);
  };

  // "Your centres": applications in progress + shortlisted centres (both groups), no duplicates
  const yourCentreIds = useMemo(
    () => Array.from(new Set([...appByCentre.keys(), ...shortlist])).filter((id) => entryById.has(id)),
    [appByCentre, shortlist, entryById]
  );

  // Map shows the same filtered results
  const mapPartner = useMemo(
    () => results.filter((r) => r.entry.kind === 'partner').map((r) => r.entry.centre as Centre),
    [results]
  );
  const mapOpenData = useMemo(
    () => results.filter((r) => r.entry.kind === 'open-data').map((r) => r.entry.centre as OntarioCentre),
    [results]
  );

  // One status label per centre: "Applied · {status}" (+ reported position), or "Shortlisted"
  const statusPill = (id: string) => {
    const app = appByCentre.get(id);
    if (app) {
      const pos = positionLabel(app);
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <Chip tone="sage">{appliedLabel(app.status)}</Chip>
          {pos && <span className="text-[10px] text-[#5B6B66]">{pos}</span>}
        </span>
      );
    }
    if (shortlist.includes(id)) return <Chip tone="peach">Shortlisted</Chip>;
    return null;
  };

  const renderPartnerCard = (centre: Centre, index: number, result?: ResultInfo) => {
    const existingApp = appByCentre.get(centre.id);
    const tone = TONES[index % TONES.length];
    return (
      <div
        key={centre.id}
        className="bg-white rounded-2xl border border-[#E7E4DA] overflow-hidden hover:shadow-[0_12px_30px_-18px_rgba(23,63,66,0.35)] transition flex flex-col justify-between"
      >
        <div>
          <div className="relative h-[150px] overflow-hidden bg-[#FAF9F4] flex items-center justify-center">
            <HouseIllustration tone={tone} className="w-full h-full object-cover" />
            <span className="absolute bottom-2.5 left-3 text-[10px] bg-white/80 backdrop-blur-xs text-[#5B6B66] font-medium rounded px-1.5 py-0.5 border border-[#E7E4DA]">
              Illustration · not a site photo
            </span>
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-block rounded px-1.5 py-0.5 bg-[#0B4A52]/10 text-[#0B4A52] text-[10px] font-semibold">
                CareQ partner centre · Simulated
              </span>
              <HeartButton name={centre.name} active={shortlist.includes(centre.id)} onToggle={() => toggleShortlist(centre.id)} />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#7A8A84] mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{centre.neighbourhood}</span>
              {result?.distanceKm != null && (
                <span className="font-semibold text-[#173F42] flex items-center gap-1 ml-1">
                  <Navigation className="w-3 h-3" />
                  {result.distanceKm.toFixed(1)} km
                </span>
              )}
            </div>
            <h3 className="text-[17px] font-bold text-[#173F42] mt-1 leading-snug">{centre.name}</h3>
            <div className="mt-1.5">{statusPill(centre.id)}</div>
            {centre.address && <p className="text-xs text-[#5B6B66] mt-2">{centre.address}</p>}

            {result?.reason && (
              <p className="mt-3 text-xs text-[#5B6B66] bg-[#F3EEE3]/60 border border-[#E7E4DA] rounded-lg p-2.5">
                {result.reason}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
              {centre.ageGroups.map((age) => (
                <span key={age} className="rounded-md border border-[#D9E4D3] bg-[#F4F6F1] px-2 py-0.5 text-[10px] text-[#4E7A5A] font-medium">
                  {age}
                </span>
              ))}
              {centre.hours && (
                <span className="rounded-md border border-[#D9E4D3] bg-[#F4F6F1] px-2 py-0.5 text-[10px] text-[#4E7A5A] font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#4E7A5A]" />
                  {centre.hours}
                </span>
              )}
              {centre.feeNote && (
                <span className="rounded-md border border-[#E7D6A8] bg-[#FBF6EA] px-2 py-0.5 text-[10px] text-[#8A6A3B] font-medium">
                  CWELCC ($10/day)
                </span>
              )}
            </div>
            {centre.programOptions && centre.programOptions.length > 0 && (
              <p className="text-[11px] text-[#5B6B66] mt-2">
                <span className="font-semibold">Programs:</span> {centre.programOptions.join(', ')}
              </p>
            )}
            {centre.languages && centre.languages.length > 0 && (
              <p className="text-[11px] text-[#5B6B66] mt-0.5">
                <span className="font-semibold">Language:</span> {centre.languages.join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 pt-4 border-t border-[#E7E4DA] flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#7A8A84]">Availability reported by centre only</span>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenConversation(centre.id)}
              className="text-xs font-semibold text-[#5B6B66] hover:text-[#173F42] hover:underline cursor-pointer"
            >
              Message
            </button>
            {existingApp ? (
              <button
                type="button"
                onClick={onNavigateToApply}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#173F42] hover:text-[#0B4A52] hover:underline cursor-pointer"
              >
                <span>Manage ({existingApp.status})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectCentre(centre.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#173F42] hover:text-[#0B4A52] hover:underline cursor-pointer"
              >
                <span>Apply</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const shown = results.slice(0, visible);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Find centres"
        title="A good fit starts here."
        subtitle="Search licensed centres near you. Availability and waitlists only appear when a centre reports them."
      />

      {/* A) Your centres */}
      {yourCentreIds.length > 0 && (
        <section aria-label="Your centres">
          <Eyebrow>Your centres</Eyebrow>
          <div className="mt-2 flex overflow-x-auto pb-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:overflow-visible">
            {yourCentreIds.map((id) => {
              const e = entryById.get(id)!;
              const app = appByCentre.get(id);
              return (
                <div key={id} className="shrink-0 w-[230px] sm:w-auto rounded-xl border border-[#E7E4DA] bg-white p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-[#7A8A84]">
                    {e.kind === 'partner' ? 'CareQ partner centre · Simulated' : 'Not on CareQ yet · Ontario open data'}
                  </p>
                  <p className="text-sm font-bold text-[#173F42] leading-snug line-clamp-2">{e.name}</p>
                  <div className="flex items-center justify-between gap-2">
                    {statusPill(id)}
                    {app && (
                      <button type="button" onClick={onNavigateToApply} className="text-[11px] font-semibold text-[#0B4A52] hover:underline cursor-pointer">
                        Manage
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* B) Describe what you need */}
      <div className="rounded-2xl border border-[#E7E4DA] bg-white shadow-2xs p-4 space-y-3">
        <label htmlFor="describe-need" className="block">
          <Eyebrow>Describe what you need</Eyebrow>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-3 px-3 rounded-xl border border-[#E7E4DA] focus-within:border-[#0B4A52] min-w-0">
            <Search className="w-4 h-4 text-[#7A8A84] shrink-0" />
            <input
              id="describe-need"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Full-time care for my 2-year-old near Danforth and Pape, from March"
              className="w-full py-2.5 bg-transparent border-none text-sm text-[#173F42] placeholder-[#7A8A84] focus:outline-hidden"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isParsing}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#0B4A52] hover:bg-[#08383E] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Search
            </button>
            {(searching || searchText) && (
              <GhostButton onClick={handleClear} className="h-11">
                <RotateCcw className="w-3.5 h-3.5" /> Clear
              </GhostButton>
            )}
          </div>
        </div>

        {/* E) Editable criteria chips + "+ Add filter" */}
        <SearchChips
          criteria={criteria}
          onChange={setCriteria}
          origin={origin}
          areas={AREAS}
          languageOptions={languageOptions}
          knownLanguages={knownLanguages}
        />
        <AiFallbackNote aiMode={parseAiMode} />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-[#173F42]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeSchoolAgeOnly} onChange={(e) => setIncludeSchoolAgeOnly(e.target.checked)} />
            <span>
              Include school-age-only programs
              {!includeSchoolAgeOnly && ontarioFile && <span className="text-[#7A8A84]"> ({hiddenSchoolAgeOnly} hidden)</span>}
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={shortlistOnly} onChange={(e) => setShortlistOnly(e.target.checked)} />
            <span>Shortlist only ({shortlist.length})</span>
          </label>
        </div>
      </div>

      {/* Area given but not placed: ask for an area before anything looks "ranked" by distance */}
      {areaUnplaced && (
        <div className="rounded-2xl border-2 border-[#E7D6A8] bg-[#FBF6EA] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <MapPin className="w-5 h-5 text-[#8A6A3B] shrink-0" />
          <div className="flex-1 text-sm text-[#5B4A2E]">
            <span className="font-bold">We couldn&apos;t place &lsquo;{criteria.areaText}&rsquo;.</span> Pick an area to
            sort centres by distance.
          </div>
          <select
            aria-label="Pick an area to sort by distance"
            value=""
            onChange={(e) => e.target.value && setCriteria({ ...criteria, areaText: e.target.value })}
            className="rounded-xl border border-[#E7D6A8] bg-white px-3 py-2 text-sm text-[#173F42] sm:w-64"
          >
            <option value="">Pick an area…</option>
            {AREAS.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Results line */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="text-sm font-bold text-[#173F42]">
          {searching && areaUnplaced ? (
            <>
              Pick an area to sort by distance — showing centres that fit your other criteria
              <span className="ml-2 text-xs font-normal text-[#7A8A84]">({results.length} centres)</span>
            </>
          ) : searching ? (
            <>
              {results.length} centres match your description{origin ? ', closest first' : ''}
            </>
          ) : (
            <>
              {results.length} centres
              <span className="ml-2 text-xs font-normal text-[#7A8A84]">CareQ partner centres first, then licensed centres A–Z</span>
            </>
          )}
          {!ontarioFile && !loadError && (
            <span className="ml-2 text-xs font-normal text-[#7A8A84] inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> loading licensed centres…
            </span>
          )}
          {loadError && <span className="ml-2 text-xs font-normal text-[#A4543A]">Could not load licensed centres.</span>}
        </div>
        <GhostButton onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="h-9 px-3 text-xs shrink-0">
          {viewMode === 'list' ? (
            <>
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map view</span>
            </>
          ) : (
            <>
              <LayoutList className="w-3.5 h-3.5" />
              <span>List view</span>
            </>
          )}
        </GhostButton>
      </div>

      {viewMode === 'map' && (
        <Card className="p-4 sm:p-6 overflow-hidden">
          <DaycareMap
            centres={mapPartner}
            applications={applications}
            parentProfile={_parentProfile}
            realCentres={mapOpenData}
            onSelectCentre={onSelectCentre}
            onOpenConversation={onOpenConversation}
            onNavigateToApply={onNavigateToApply}
          />
        </Card>
      )}

      {viewMode === 'list' && (
        <>
          {results.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-[#5B6B66] text-sm">No centres match. Try removing a filter or widening the distance.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {shown.map(({ entry, rank }, i) => {
                const result: ResultInfo | undefined = rank ? { distanceKm: rank.distanceKm, reason: reasonFor(rank) } : undefined;
                return entry.kind === 'partner' ? (
                  renderPartnerCard(entry.centre, i, result)
                ) : (
                  <OntarioCentreCard
                    key={entry.id}
                    centre={entry.centre}
                    file={ontarioFile!}
                    isShortlisted={shortlist.includes(entry.id)}
                    onToggleShortlist={() => toggleShortlist(entry.id)}
                    result={result}
                  />
                );
              })}
            </div>
          )}
          {visible < results.length && (
            <div className="text-center">
              <GhostButton onClick={() => setVisible((v) => v + PAGE_SIZE)}>Show more ({results.length - visible} left)</GhostButton>
            </div>
          )}
        </>
      )}

      {searching && (
        <div className="space-y-1">
          <p className="text-[11px] text-[#7A8A84]">
            {areaUnplaced
              ? 'Ordered by fit with what you asked for, then by name. CareQ never knows availability unless a partner centre reports it.'
              : 'Ranked by distance and fit with what you asked for. CareQ never knows availability unless a partner centre reports it.'}
          </p>
          <AiFallbackNote aiMode={explainAiMode} />
        </div>
      )}
    </div>
  );
};
