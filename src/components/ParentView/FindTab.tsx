import React, { useEffect, useMemo, useState } from 'react';
import { Centre, Application, ApplicationStatus, ParentProfile } from '../../data/mockData';
import { OntarioCentre } from '../../data/ontarioTypes';
import {
  MapPin,
  Clock,
  Search,
  ArrowRight,
  Loader2,
  RotateCcw,
  LayoutList,
  Map as MapIcon,
} from 'lucide-react';
import { DaycareMap } from './DaycareMap';
import { useOntarioData, useShortlist, OntarioCentreCard, HeartButton, Chip, ResultInfo, MoreDetails, AvailabilityBox, LanguageStatus } from './OntarioCentres';
import { SearchChips } from './SearchChips';
import { reportedLineOnCard } from '../../lib/simulated';
import { licenceLabel, shownHours } from '../../lib/family';
import { doesntServeLabel } from '../../lib/searchCriteria';
import { statusLabel } from '../../lib/centreQueue';
import {
  PageHeader,
  Card,
  GhostButton,
  PrimaryButton,
  TertiaryButton,
  CentreAvatar,
  AiFallbackNote,
  AiMode,
  AiNotice,
} from '../ui/CareUI';
import { aiPost, isUserFacingAiError } from '../../lib/aiFetch';
import { EMPTY_CRITERIA, SearchCriteria, hasAnyCriteria, sanitizeCriteria, parseSearchFallback } from '../../lib/searchCriteria';
import {
  Area,
  FsaCentroids,
  RankableCentre,
  RankedCentre,
  distanceLabel,
  factsSentence,
  knownLanguagesOf,
  rankCentres,
  resolveArea,
} from '../../lib/rankCentres';
import torontoAreas from '../../data/torontoAreas.json';
import fsaCentroids from '../../data/fsaCentroids.json';
import { AskAboutCentre } from '../AskAboutCentre';

// Approximate centre points, used only to sort by distance (see metadata.approximate).
const AREAS = (torontoAreas as { areas: Area[] }).areas;
const FSA = fsaCentroids as FsaCentroids;
const PAGE_SIZE = 24;
const EXPLAIN_TOP_N = 10;

interface FindTabProps {
  centres: Centre[];
  applications: Application[];
  parentProfile: ParentProfile;
  onSelectCentre: (centreId: string) => void;
  /** Manage: a draft opens Drafts; a sent application opens in My applications. */
  onManageApplication: (app: Application) => void;
  onOpenConversation: (centreId: string) => void;
  /** Active child's home area: the first search is "near {area}". */
  homeArea?: string;
  /** Demo accounts also see a demo centre's own (simulated) hours and contact email; others see the listed details only. */
  isDemoAccount?: boolean;
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
  approximateLocation: c.registration?.locationApproximate ? { neighbourhood: c.neighbourhood } : undefined,
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

/** Real centre (open data) or the fictional demo centre. */
const demoCentreLabel = (c: Centre) => (c.demoKind === 'open-data' ? 'Ontario open data' : 'Fictional demo centre');

/** Just the application's current status, in the parent's wording ("Submitted", "Offer Available", "Draft"). */
const appliedLabel = (status: ApplicationStatus) => statusLabel(status, 'parent');

/** Queue position exactly as the centre reported it, with the date when known. */
const positionLabel = (app: Application, centreName?: string) =>
  app.waitlistPosition
    ? `#${app.waitlistPosition} · ${reportedLineOnCard(app.waitlistReportedBy, centreName, app.waitlistReportedDate || 'recently')}`
    : null;

export const FindTab: React.FC<FindTabProps> = ({
  centres,
  applications,
  parentProfile,
  homeArea,
  isDemoAccount = false,
  onSelectCentre,
  onManageApplication,
  onOpenConversation,
}) => {
  const [searchText, setSearchText] = useState('');
  // Pre-filled with the active child's home area, so the first list is sorted by distance from home
  const [criteria, setCriteria] = useState<SearchCriteria>(() =>
    homeArea ? { ...EMPTY_CRITERIA, areaText: homeArea } : EMPTY_CRITERIA
  );
  const [isParsing, setIsParsing] = useState(false);
  const [parseAiMode, setParseAiMode] = useState<AiMode | null>(null);
  const [explainAiMode, setExplainAiMode] = useState<AiMode | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
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
    // The real demo centres are already in `centres` (same id): don't list their open-data copy twice
    const onCareQ = new Set(centres.map((c) => c.id));
    const open: Entry[] = (ontarioFile?.centres ?? []).filter((c) => !onCareQ.has(c.id)).map((c) => ({
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
    aiPost<{ explanations?: Record<string, string>; aiMode?: AiMode }>('/api/explain-results', {
      results: top.map((r) => ({
        id: r.id,
        name: entryById.get(r.id)?.name ?? '',
        matchedFacts: r.matchedFacts,
        unknownFacts: r.unknownFacts,
      })),
    })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          // Keep the plain facts sentences; say why if the user can act on it
          setExplainAiMode('fallback');
          if (isUserFacingAiError(result.status)) setAiNotice(result.message);
          return;
        }
        const data = result.data;
        if (!data?.explanations) return;
        const explanations = data.explanations;
        setExplainAiMode(data.aiMode ?? null);
        setExplanations((prev) => {
          const next = { ...prev };
          top.forEach((r) => {
            if (typeof explanations[r.id] === 'string') next[explainKey(r)] = explanations[r.id];
          });
          return next;
        });
      });
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
    setAiNotice(null);
    const result = await aiPost<{ criteria?: unknown; aiMode?: AiMode }>('/api/parse-search', { text });
    if (result.ok) {
      setCriteria(sanitizeCriteria(result.data.criteria));
      setParseAiMode(result.data.aiMode ?? null);
    } else {
      // Rate-limited, signed out or unreachable: the same keyword parser, in the browser
      setCriteria(parseSearchFallback(text));
      setParseAiMode('fallback');
      if (isUserFacingAiError(result.status)) setAiNotice(result.message);
    }
    setIsParsing(false);
    setExplainRequest((n) => n + 1);
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

  // One status label per centre: the application's current status (+ reported position), or "Shortlisted"
  const statusPill = (id: string) => {
    const app = appByCentre.get(id);
    if (app) {
      const pos = positionLabel(app, entryById.get(id)?.name);
      return (
        <span className="flex flex-col items-start gap-1">
          <Chip tone="sage">{appliedLabel(app.status)}</Chip>
          {pos && <span className="text-xs text-ink-muted">{pos}</span>}
        </span>
      );
    }
    if (shortlist.includes(id)) return <Chip tone="peach">Shortlisted</Chip>;
    return null;
  };

  const renderPartnerCard = (centre: Centre, _index: number, result?: ResultInfo) => {
    const existingApp = appByCentre.get(centre.id);
    const reg = centre.registration; // self-registered by its own staff (demo, not verified)
    const notServed = doesntServeLabel(centre.ageGroups, parentProfile.childAgeMonths);
    const distance =
      result?.reason ??
      (result?.distanceKm != null ? distanceLabel(result.distanceKm, reg ? { neighbourhood: centre.neighbourhood } : undefined) : null);
    const pill = statusPill(centre.id);
    return (
      <article key={centre.id} className="bg-white rounded-2xl border border-cq-line overflow-hidden flex flex-col">
        {reg?.photoDataUrl && (
          <div className="relative h-[150px] overflow-hidden bg-page">
            <img src={reg.photoDataUrl} alt={`${centre.name}`} className="w-full h-full object-cover" />
            <span className="absolute bottom-2.5 left-3 text-xs bg-white text-ink-muted font-semibold rounded-md px-1.5 py-0.5 border border-cq-line">
              Photo provided by the centre
            </span>
          </div>
        )}

        <div className="p-4 sm:p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            {reg ? (
              <span
                className={`inline-flex items-center rounded-md px-2 h-6 text-xs font-bold ${
                  reg.licenceVerified ? 'bg-success-bg text-success' : 'bg-stone text-status-draft'
                }`}
              >
                {licenceLabel(centre)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md px-2 h-6 bg-mint text-brand text-xs font-bold">{demoCentreLabel(centre)}</span>
            )}
            <HeartButton name={centre.name} active={shortlist.includes(centre.id)} onToggle={() => toggleShortlist(centre.id)} />
          </div>

          <div className="flex items-start gap-3 mt-1">
            <CentreAvatar centreId={centre.id} />
            <div className="min-w-0">
              <h3 className="text-[17px] font-extrabold text-ink leading-snug">{centre.name}</h3>
              {centre.address && <p className="text-sm text-ink-muted mt-0.5">{centre.address}</p>}
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
              {centre.neighbourhood}
            </p>
          )}
          <LanguageStatus items={result?.languageStatus} />

          {pill && <div className="mt-2">{pill}</div>}
          {notServed && (
            <p className="mt-2 inline-flex self-start rounded-md bg-warning-bg px-2 py-0.5 text-xs font-bold text-warning">{notServed}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-3">
            {centre.ageGroups.map((age) => (
              <Chip key={age}>{age}</Chip>
            ))}
            {centre.feeNote && <Chip tone="sand">CWELCC ($10/day)</Chip>}
          </div>

          <AvailabilityBox title="Availability reported by centre only" />

          <MoreDetails>
            {(isDemoAccount ? shownHours(centre).text : centre.hours) && (
              <p className="flex flex-wrap items-center gap-1.5">
                <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                {isDemoAccount ? shownHours(centre).text : centre.hours}
              </p>
            )}
            {isDemoAccount && centre.simulatedContact?.contactEmail && (
              <p className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-ink">Contact:</span> {centre.simulatedContact.contactEmail}
              </p>
            )}
            {centre.programOptions && centre.programOptions.length > 0 && (
              <p>
                <span className="font-bold text-ink">Programs:</span> {centre.programOptions.join(', ')}
              </p>
            )}
            {centre.languages && centre.languages.length > 0 && (
              <p>
                <span className="font-bold text-ink">Language:</span> {centre.languages.join(', ')}
              </p>
            )}
            {centre.demoKind === 'open-data' && (
              <p>
                {centre.licenceNumber ? `Licence #${centre.licenceNumber} · ` : ''}Ontario open data
                {centre.capacity ? ` · ${centre.capacity} licensed spaces (capacity, not availability)` : ''}
              </p>
            )}
            {reg && (
              <p>
                {reg.licenceNumber ? `Licence #${reg.licenceNumber} · ${reg.licenceVerified ? 'matches Ontario open data' : 'Self-reported, not verified'} · ` : ''}
                Approximate location ({reg.locationSource})
                {reg.capacity ? ` · ${reg.capacity} licensed spaces (capacity, not availability)` : ''}
              </p>
            )}
          </MoreDetails>

          <div className="mt-3">
            <AskAboutCentre centreId={centre.id} centreName={centre.name} />
          </div>

          <div className="mt-auto pt-4 flex items-center justify-end gap-2 flex-wrap">
            <GhostButton onClick={() => onOpenConversation(centre.id)} className="h-10">
              Message
            </GhostButton>
            {existingApp ? (
              <GhostButton onClick={() => onManageApplication(existingApp)} className="h-10">
                Manage ({existingApp.status})
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </GhostButton>
            ) : notServed ? (
              <span className="text-sm text-ink-muted px-2" title={`${notServed}, so you can't apply for ${parentProfile.childName}.`}>
                Can&apos;t apply
              </span>
            ) : (
              <PrimaryButton arrow onClick={() => onSelectCentre(centre.id)} className="h-10">
                Apply
              </PrimaryButton>
            )}
          </div>
        </div>
      </article>
    );
  };

  const shown = results.slice(0, visible);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find centres"
        subtitle="Search licensed centres near you. Availability and waitlists only appear when a centre reports them."
      />

      {/* A) Your centres */}
      {yourCentreIds.length > 0 && (
        <section aria-labelledby="your-centres">
          <h2 id="your-centres" className="text-lg font-extrabold text-brand">
            Your centres <span className="text-sm font-bold text-ink-muted">({yourCentreIds.length})</span>
          </h2>
          <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex overflow-x-auto no-scrollbar pb-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:overflow-visible">
            {yourCentreIds.map((id) => {
              const e = entryById.get(id)!;
              const app = appByCentre.get(id);
              return (
                <div key={id} className="shrink-0 w-[260px] sm:w-auto rounded-2xl border border-cq-line bg-white p-3.5 flex flex-col gap-2">
                  <p className="text-xs text-ink-soft">
                    {e.kind === 'open-data'
                      ? 'Not on CareQ yet · Ontario open data'
                      : (e.centre as Centre).registration
                      ? licenceLabel(e.centre as Centre)
                      : demoCentreLabel(e.centre as Centre)}
                  </p>
                  <div className="flex items-start gap-2.5">
                    <CentreAvatar centreId={id} size="sm" />
                    <p className="text-[15px] font-bold text-ink leading-snug line-clamp-2">{e.name}</p>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-2">
                    {statusPill(id)}
                    {app && (
                      <TertiaryButton onClick={() => onManageApplication(app)} className="h-9 px-1 shrink-0">
                        Manage
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </TertiaryButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* B) Describe what you need */}
      <div className="rounded-2xl border border-cq-line bg-white p-4 sm:p-5 space-y-3">
        <label htmlFor="describe-need" className="block text-[15px] font-bold text-ink">
          Describe what you need
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-3 px-3.5 h-12 rounded-xl border border-line-strong bg-white focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/20 min-w-0 transition-[border-color,box-shadow]">
            <Search className="w-5 h-5 text-ink-muted shrink-0" aria-hidden="true" />
            <input
              id="describe-need"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Full-time care for my 2-year-old near Danforth and Pape, from March"
              className="w-full h-full bg-transparent border-none text-base text-ink placeholder:text-ink-faint focus:outline-hidden focus-visible:outline-none"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isParsing}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-cq-brand hover:bg-cq-brand-hover text-white text-sm font-bold disabled:bg-stone disabled:text-ink-faint active:scale-[0.98] transition-[background-color,transform] cursor-pointer"
            >
              {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" aria-hidden="true" />}
              Search
            </button>
            {(searching || searchText) && (
              <GhostButton onClick={handleClear} className="h-12">
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
        <AiNotice message={aiNotice} />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1 text-sm text-ink">
          <label className="flex items-center gap-2 min-h-10 cursor-pointer">
            <input type="checkbox" className="w-[18px] h-[18px] accent-brand" checked={includeSchoolAgeOnly} onChange={(e) => setIncludeSchoolAgeOnly(e.target.checked)} />
            <span>
              Include school-age-only programs
              {!includeSchoolAgeOnly && ontarioFile && <span className="text-cq-soft"> ({hiddenSchoolAgeOnly} hidden)</span>}
            </span>
          </label>
          <label className="flex items-center gap-2 min-h-10 cursor-pointer">
            <input type="checkbox" className="w-[18px] h-[18px] accent-brand" checked={shortlistOnly} onChange={(e) => setShortlistOnly(e.target.checked)} />
            <span>Shortlist only ({shortlist.length})</span>
          </label>
        </div>
      </div>

      {/* Area given but not placed: ask for an area before anything looks "ranked" by distance */}
      {areaUnplaced && (
        <div className="rounded-2xl border-2 border-cq-sand-line bg-cq-sand-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <MapPin className="w-5 h-5 text-cq-sand-ink-2 shrink-0" />
          <div className="flex-1 text-sm text-cq-sand-ink">
            <span className="font-bold">We couldn&apos;t place &lsquo;{criteria.areaText}&rsquo;.</span> Pick an area to
            sort centres by distance.
          </div>
          <select
            aria-label="Pick an area to sort by distance"
            value=""
            onChange={(e) => e.target.value && setCriteria({ ...criteria, areaText: e.target.value })}
            className="rounded-xl border border-cq-sand-line bg-white px-3 py-2 text-sm text-cq-ink sm:w-64"
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
        <div className="text-sm font-bold text-cq-ink">
          {searching && areaUnplaced ? (
            <>
              Pick an area to sort by distance — showing centres that fit your other criteria
              <span className="ml-2 text-xs font-normal text-cq-soft">({results.length} centres)</span>
            </>
          ) : searching ? (
            <>
              {results.length} centres match your description{origin ? ', closest first' : ''}
            </>
          ) : (
            <>
              {results.length} centres
              <span className="ml-2 text-xs font-normal text-cq-soft">CareQ demo centres first, then licensed centres A–Z</span>
            </>
          )}
          {!ontarioFile && !loadError && (
            <span className="ml-2 text-xs font-normal text-cq-soft inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> loading licensed centres…
            </span>
          )}
          {loadError && <span className="ml-2 text-xs font-normal text-cq-rust">Could not load licensed centres.</span>}
        </div>
        <GhostButton onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="h-10 px-3 shrink-0">
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
            parentProfile={parentProfile}
            realCentres={mapOpenData}
            onSelectCentre={onSelectCentre}
            onOpenConversation={onOpenConversation}
            onManageApplication={onManageApplication}
          />
        </Card>
      )}

      {viewMode === 'list' && (
        <>
          {results.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-cq-muted text-sm">No centres match. Try removing a filter or widening the distance.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {shown.map(({ entry, rank }, i) => {
                const result: ResultInfo | undefined = rank ? { distanceKm: rank.distanceKm, reason: reasonFor(rank), languageStatus: rank.languageStatus } : undefined;
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
          <p className="text-xs text-cq-soft">
            {areaUnplaced
              ? 'Ordered by fit with what you asked for, then by name. CareQ never knows availability unless a centre reports it.'
              : 'Ranked by distance and fit with what you asked for. CareQ never knows availability unless a centre reports it.'}
          </p>
          <AiFallbackNote aiMode={explainAiMode} />
        </div>
      )}
    </div>
  );
};
