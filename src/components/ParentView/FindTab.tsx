import React, { useState, useMemo } from 'react';
import { Centre, AgeGroup, Application, ParentProfile } from '../../data/mockData';
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
} from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { DaycareMap } from './DaycareMap';
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

interface PrioritizedMatch {
  centreId: string;
  priorityRank: number;
  matchScore: number;
  matchReason: string;
  keyHighlight: string;
}

interface FindTabProps {
  centres: Centre[];
  applications: Application[];
  parentProfile: ParentProfile;
  onSelectCentre: (centreId: string) => void;
  onNavigateToApply: () => void;
  onOpenConversation: (centreId: string) => void;
}

const TONES: HouseIllustrationTone[] = ['sage', 'lilac', 'sky'];

export const FindTab: React.FC<FindTabProps> = ({
  centres,
  applications,
  parentProfile,
  onSelectCentre,
  onNavigateToApply,
  onOpenConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('Toddler');
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Agent Chatbot / Matching state
  const [isAgentMatching, setIsAgentMatching] = useState<boolean>(false);
  const [agentSummary, setAgentSummary] = useState<string | null>(null);
  const [rankedMatches, setRankedMatches] = useState<PrioritizedMatch[] | null>(null);
  const [matchAiMode, setMatchAiMode] = useState<AiMode | null>(null);

  // Extract unique neighbourhoods
  const neighbourhoods = useMemo(() => {
    const list = Array.from(new Set(centres.map((c) => c.neighbourhood))).sort();
    return ['All', ...list];
  }, [centres]);

  const ageGroupOptions: (string | AgeGroup)[] = ['All', 'Infant', 'Toddler', 'Preschool'];

  // Map centreId to existing application if any
  const applicationByCentreId = useMemo(() => {
    const map = new Map<string, Application>();
    applications.forEach((app) => map.set(app.centreId, app));
    return map;
  }, [applications]);

  // Handle agent prioritization call
  const handleAgentPrioritize = async (customPrompt?: string) => {
    const promptToSend =
      customPrompt && customPrompt.trim().length > 0
        ? customPrompt
        : `Looking for licensed child care in Toronto for ${parentProfile.childName} (${parentProfile.childAgeMonths} months). Near ${selectedNeighbourhood !== 'All' ? selectedNeighbourhood : 'Riverdale'}, starting ${parentProfile.preferredStartDate}.`;

    setIsAgentMatching(true);
    try {
      const res = await fetch('/api/match-centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPrompt: promptToSend,
          childName: parentProfile.childName,
          childAgeMonths: parentProfile.childAgeMonths,
          preferredStartDate: parentProfile.preferredStartDate,
          centres,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAgentSummary(json.data.agentSummary);
        setRankedMatches(json.data.rankedCentres);
        setMatchAiMode(json.aiMode ?? null);
      }
    } catch (err) {
      console.error('Failed to run agent matching:', err);
    } finally {
      setIsAgentMatching(false);
    }
  };

  // Filter & sort centres based on whether agent ranking is active
  const displayedCentres = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = centres.filter((centre) => {
      const matchesAge =
        selectedAgeGroup === 'All' ||
        centre.ageGroups.includes(selectedAgeGroup as AgeGroup);
      const matchesNeighbourhood =
        selectedNeighbourhood === 'All' ||
        centre.neighbourhood === selectedNeighbourhood;
      const matchesQuery =
        !query ||
        centre.name.toLowerCase().includes(query) ||
        centre.neighbourhood.toLowerCase().includes(query) ||
        (centre.address && centre.address.toLowerCase().includes(query)) ||
        centre.requirements.some((r) => r.toLowerCase().includes(query));

      return matchesAge && matchesNeighbourhood && matchesQuery;
    });

    // If agent has ranked them, sort by priorityRank
    if (rankedMatches && rankedMatches.length > 0) {
      const rankMap = new Map(rankedMatches.map((m) => [m.centreId, m]));
      list = [...list].sort((a, b) => {
        const rankA = rankMap.get(a.id)?.priorityRank ?? 999;
        const rankB = rankMap.get(b.id)?.priorityRank ?? 999;
        return rankA - rankB;
      });
    }

    return list;
  }, [centres, selectedAgeGroup, selectedNeighbourhood, searchQuery, rankedMatches]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Find centres"
        title="A good fit starts here."
        subtitle="Search licensed centres near you. Availability and waitlists only appear when a centre reports them."
      />

      {/* Map view: In a Card below the header row when active */}
      {viewMode === 'map' && (
        <Card className="p-4 sm:p-6 overflow-hidden">
          <DaycareMap
            centres={displayedCentres}
            applications={applications}
            parentProfile={parentProfile}
            rankedMatches={rankedMatches}
            onSelectCentre={onSelectCentre}
            onOpenConversation={onOpenConversation}
            onNavigateToApply={onNavigateToApply}
          />
        </Card>
      )}

      {/* Search + filters in ONE white bar */}
      <div className="rounded-2xl border border-[#E7E4DA] bg-white flex flex-col md:flex-row md:divide-x divide-[#E7E4DA] shadow-2xs">
        {/* First section: Search icon + borderless input */}
        <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
          <Search className="w-4 h-4 text-[#7A8A84] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAgentPrioritize(searchQuery);
              }
            }}
            placeholder="Search by name, neighbourhood or need"
            className="w-full bg-transparent border-none text-sm text-[#173F42] placeholder-[#7A8A84] focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#7A8A84] hover:text-[#173F42] text-xs p-1"
              aria-label="Clear search text"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => handleAgentPrioritize(searchQuery)}
            disabled={isAgentMatching}
            title="Prioritize matches with CareQ Agent"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#0B4A52] hover:bg-[#FAF9F4] transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isAgentMatching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#C9B98A]" />
            )}
            <span className="hidden sm:inline">Prioritize</span>
          </button>
        </div>

        {/* Section 2: Age Group Filter */}
        <div className="px-4 py-2.5 flex flex-col justify-center min-w-[150px] border-t md:border-t-0 border-[#E7E4DA]">
          <Eyebrow className="text-[10px]">Age group</Eyebrow>
          <select
            value={selectedAgeGroup}
            onChange={(e) => setSelectedAgeGroup(e.target.value)}
            aria-label="Filter by age group"
            className="bg-transparent border-none text-xs font-semibold text-[#173F42] focus:outline-hidden cursor-pointer mt-0.5 p-0"
          >
            {ageGroupOptions.map((age) => (
              <option key={age} value={age} className="text-stone-800">
                {age === 'All' ? 'All ages' : age}
              </option>
            ))}
          </select>
        </div>

        {/* Section 3: Neighbourhood Filter */}
        <div className="px-4 py-2.5 flex flex-col justify-center min-w-[170px] border-t md:border-t-0 border-[#E7E4DA]">
          <Eyebrow className="text-[10px]">Neighbourhood</Eyebrow>
          <select
            value={selectedNeighbourhood}
            onChange={(e) => setSelectedNeighbourhood(e.target.value)}
            aria-label="Filter by neighbourhood"
            className="bg-transparent border-none text-xs font-semibold text-[#173F42] focus:outline-hidden cursor-pointer mt-0.5 p-0"
          >
            {neighbourhoods.map((n) => (
              <option key={n} value={n} className="text-stone-800">
                {n === 'All' ? 'All neighbourhoods' : n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Agent Recommendation Banner if active */}
      {agentSummary && (
        <div className="rounded-2xl bg-[#EEF3EA] border border-[#D9E4D3] p-4 text-xs text-[#173F42] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-[#4E7A5A]">
              <Sparkles className="w-3.5 h-3.5" />
              Agent Recommendation Analysis:
            </span>
            <p className="text-[#5B6B66] leading-relaxed">{agentSummary}</p>
            <AiFallbackNote aiMode={matchAiMode} />
          </div>
          <button
            type="button"
            onClick={() => {
              setRankedMatches(null);
              setAgentSummary(null);
            }}
            className="text-[11px] font-semibold text-[#4E7A5A] hover:underline shrink-0 flex items-center gap-1 mt-0.5 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset ranking
          </button>
        </div>
      )}

      {/* Results Line */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-[#173F42]">
            {displayedCentres.length} centres
          </span>
          <span className="text-xs text-[#7A8A84]">· Toronto demo</span>
          {rankedMatches && (
            <span className="text-xs font-semibold text-[#4E7A5A] ml-1">
              · Ordered by match score
            </span>
          )}
        </div>

        {/* Existing List/Map Toggle styled as GhostButton */}
        <GhostButton
          onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          className="h-9 px-3 text-xs"
        >
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

      {/* Centre cards: grid sm:grid-cols-2 xl:grid-cols-3 gap-5 */}
      {viewMode === 'list' && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayedCentres.map((centre, index) => {
            const existingApp = applicationByCentreId.get(centre.id);
            const matchInfo = rankedMatches?.find((m) => m.centreId === centre.id);
            const tone = TONES[index % TONES.length];

            return (
              <div
                key={centre.id}
                className="bg-white rounded-2xl border border-[#E7E4DA] overflow-hidden hover:shadow-[0_12px_30px_-18px_rgba(23,63,66,0.35)] transition flex flex-col justify-between"
              >
                <div>
                  {/* Top: HouseIllustration h-[170px], tone rotates by index */}
                  <div className="relative h-[170px] overflow-hidden bg-[#FAF9F4] flex items-center justify-center">
                    <HouseIllustration
                      tone={tone}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2.5 left-3 text-[10px] bg-white/80 backdrop-blur-xs text-[#5B6B66] font-medium rounded px-1.5 py-0.5 border border-[#E7E4DA]">
                      Illustration · not a site photo
                    </span>

                    {existingApp && (
                      <div className="absolute top-2.5 right-3">
                        <StatusBadge
                          status={existingApp.status}
                          waitlistPosition={existingApp.waitlistPosition}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Body p-5 */}
                  <div className="p-5">
                    {/* Row with MapPin icon + neighbourhood */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#7A8A84]">
                      <MapPin className="w-3 h-3 text-[#7A8A84] shrink-0" />
                      <span>{centre.neighbourhood}</span>
                    </div>

                    {/* Centre Name */}
                    <h3 className="text-[17px] font-bold text-[#173F42] mt-1 leading-snug">
                      {centre.name}
                    </h3>

                    {/* Address */}
                    {centre.address && (
                      <p className="text-xs text-[#5B6B66] mt-3">
                        {centre.address}
                      </p>
                    )}

                    {/* Chips for age groups and hours */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {centre.ageGroups.map((age) => (
                        <span
                          key={age}
                          className="rounded-md border border-[#D9E4D3] bg-[#F4F6F1] px-2 py-0.5 text-[10px] text-[#4E7A5A] font-medium"
                        >
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

                    {/* Existing match reason if present */}
                    {matchInfo && (
                      <div className="mt-3 text-xs text-[#5B6B66] bg-[#F3EEE3]/60 border border-[#E7E4DA] rounded-lg p-2.5">
                        <span className="font-semibold text-[#173F42]">
                          Why this fits:{' '}
                        </span>
                        {matchInfo.matchReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer border-t border-[#E7E4DA] mt-4 pt-4 flex justify-between */}
                <div className="px-5 pb-5 pt-4 border-t border-[#E7E4DA] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#7A8A84]">
                    Availability reported by centre only
                  </span>

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
          })}
        </div>
      )}

      {displayedCentres.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-[#5B6B66] text-sm">
            No child care centres match your selected search or filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedAgeGroup('All');
              setSelectedNeighbourhood('All');
            }}
            className="mt-2 text-xs font-semibold text-[#0B4A52] hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </Card>
      )}
    </div>
  );
};
