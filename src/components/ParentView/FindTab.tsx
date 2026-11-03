import React, { useState, useMemo } from 'react';
import { Centre, AgeGroup, Application, ParentProfile } from '../../data/mockData';
import {
  MapPin,
  Clock,
  Check,
  FileCheck,
  Sparkles,
  Bot,
  Send,
  Loader2,
  Award,
  ChevronDown,
  RotateCcw,
  MessageSquare,
  LayoutList,
  Map as MapIcon,
} from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { DaycareMap } from './DaycareMap';

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

export const FindTab: React.FC<FindTabProps> = ({
  centres,
  applications,
  parentProfile,
  onSelectCentre,
  onNavigateToApply,
  onOpenConversation,
}) => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('Toddler');
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Agent Chatbot / Description input
  const [parentPrompt, setParentPrompt] = useState<string>(
    'Looking for full-time toddler care for Anya starting March. We live near Riverdale, work downtown, and prioritize CWELCC subsidized fees and outdoor play.'
  );
  const [isAgentMatching, setIsAgentMatching] = useState<boolean>(false);
  const [agentSummary, setAgentSummary] = useState<string | null>(null);
  const [rankedMatches, setRankedMatches] = useState<PrioritizedMatch[] | null>(null);

  // Preset suggested prompts for parent to click
  const suggestedPrompts = [
    'Downtown commuter friendly with 7:30 AM drop-off & CWELCC $10/day subsidy',
    'High Park & outdoor forest focus with organic meals and allergy protocols',
    'Near Danforth subway with strong toddler cognitive and arts programming',
  ];

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
    const promptToSend = customPrompt !== undefined ? customPrompt : parentPrompt;
    if (!promptToSend.trim()) return;

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
      }
    } catch (err) {
      console.error('Failed to run agent matching:', err);
    } finally {
      setIsAgentMatching(false);
    }
  };

  // Filter & sort centres based on whether agent ranking is active
  const displayedCentres = useMemo(() => {
    // Basic filtering
    let list = centres.filter((centre) => {
      const matchesAge =
        selectedAgeGroup === 'All' ||
        centre.ageGroups.includes(selectedAgeGroup as AgeGroup);
      const matchesNeighbourhood =
        selectedNeighbourhood === 'All' ||
        centre.neighbourhood === selectedNeighbourhood;
      return matchesAge && matchesNeighbourhood;
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
  }, [centres, selectedAgeGroup, selectedNeighbourhood, rankedMatches]);

  return (
    <div className="space-y-6">
      {/* Agent Chatbot / Description & Intake Assistant Box */}
      <div className="bg-gradient-to-br from-stone-900 to-teal-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-teal-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  CareQ Child-Care Matching Agent
                </h2>
                <span className="text-[10px] font-semibold bg-teal-800/80 text-teal-200 border border-teal-600/40 px-2 py-0.5 rounded-full">
                  AI Prioritized
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Describe your family’s routine, commute, or preferences. Our agent ranks licensed centres for Anya.
              </p>
            </div>
          </div>

          <div className="text-xs bg-stone-800/80 border border-stone-700 px-3 py-1.5 rounded-lg text-stone-300 self-start sm:self-auto shrink-0">
            Anya ({parentProfile.childAgeMonths} mos) • Starting {parentProfile.preferredStartDate}
          </div>
        </div>

        {/* Chat / Comment input box */}
        <div className="space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              value={parentPrompt}
              onChange={(e) => setParentPrompt(e.target.value)}
              placeholder="e.g. We need toddler care near Riverdale or Danforth, flexible pickup after 5:30 PM, CWELCC fees, and strong outdoor play..."
              className="w-full bg-stone-900/90 border border-stone-700/80 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-teal-400/50 pr-28 resize-none"
            />
            <button
              type="button"
              disabled={isAgentMatching || !parentPrompt.trim()}
              onClick={() => handleAgentPrioritize()}
              className="absolute right-2 bottom-3 px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-stone-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {isAgentMatching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Matching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                  <span>Prioritize</span>
                </>
              )}
            </button>
          </div>

          {/* Quick suggested prompt pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wider mr-1">
              <MessageSquare className="w-3 h-3 text-teal-400" />
              Suggested requests:
            </span>
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setParentPrompt(prompt);
                  handleAgentPrioritize(prompt);
                }}
                className="text-stone-300 bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 px-2.5 py-1 rounded-md text-[11px] transition-colors truncate max-w-xs sm:max-w-md"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>

        {/* Agent Summary Result Banner */}
        {agentSummary && (
          <div className="bg-teal-950/60 border border-teal-700/50 rounded-xl p-3.5 text-xs text-teal-100 flex items-start justify-between gap-3 animate-fade-in">
            <div className="space-y-1">
              <p className="font-semibold text-teal-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                Agent Recommendation Analysis:
              </p>
              <p className="text-stone-300 leading-relaxed">{agentSummary}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRankedMatches(null);
                setAgentSummary(null);
              }}
              className="text-[11px] text-teal-300 hover:underline shrink-0 flex items-center gap-1 mt-0.5"
            >
              <RotateCcw className="w-3 h-3" />
              Reset ranking
            </button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Age group filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Age Group:
            </span>
            <div className="flex flex-wrap gap-1">
              {ageGroupOptions.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => setSelectedAgeGroup(age)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    selectedAgeGroup === age
                      ? 'bg-stone-800 text-white'
                      : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          {/* Neighbourhood filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Neighbourhood:
            </span>
            <select
              value={selectedNeighbourhood}
              onChange={(e) => setSelectedNeighbourhood(e.target.value)}
              aria-label="Filter by neighbourhood"
              className="text-xs font-medium bg-stone-50 border border-stone-200 rounded-md px-2.5 py-1 text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
            >
              {neighbourhoods.map((n) => (
                <option key={n} value={n}>
                  {n === 'All' ? 'All Neighbourhoods' : n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-stone-500 hidden sm:block">
            Showing <strong>{displayedCentres.length}</strong> centres
            {rankedMatches && (
              <span className="text-teal-700 font-semibold ml-1">
                (ordered by Agent Priority)
              </span>
            )}
          </div>

          {/* List vs Map View Switcher */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'map'
                  ? 'bg-[#0B4A52] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Content: Map View or List Grid */}
      {viewMode === 'map' ? (
        <DaycareMap
          centres={displayedCentres}
          applications={applications}
          parentProfile={parentProfile}
          rankedMatches={rankedMatches}
          onSelectCentre={onSelectCentre}
          onOpenConversation={onOpenConversation}
          onNavigateToApply={onNavigateToApply}
        />
      ) : (
        <>
          {/* Grid of Centres */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {displayedCentres.map((centre) => {
          const existingApp = applicationByCentreId.get(centre.id);
          const isSelected = !!existingApp;
          const matchInfo = rankedMatches?.find((m) => m.centreId === centre.id);

          return (
            <div
              key={centre.id}
              className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md flex flex-col justify-between relative overflow-hidden ${
                matchInfo?.priorityRank === 1
                  ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                  : isSelected
                  ? 'border-teal-200 ring-1 ring-teal-600/20 bg-teal-50/15'
                  : 'border-stone-200'
              }`}
            >
              <div>
                {/* Daycare Centre Photo */}
                {centre.imageUrl && (
                  <div className="relative h-40 sm:h-44 -mx-5 -mt-5 mb-4 overflow-hidden bg-stone-100">
                    <img
                      src={centre.imageUrl}
                      alt={`Campus and classrooms at ${centre.name}`}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent"></div>
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs drop-shadow-xs">
                      <span className="font-semibold flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-teal-300" />
                        {centre.neighbourhood}
                      </span>
                      {centre.feeNote && (
                        <span className="bg-amber-400 text-stone-950 font-bold text-[10px] px-2 py-0.5 rounded-sm shadow-xs">
                          CWELCC ($10/day)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Agent Rank Badge if ranked */}
                {matchInfo && (
                  <div className="mb-3 flex items-center justify-between pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          matchInfo.priorityRank === 1
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : matchInfo.priorityRank === 2
                            ? 'bg-teal-100 text-teal-900 border border-teal-300'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        <Award className="w-3 h-3" />
                        #{matchInfo.priorityRank} Ranked Match ({matchInfo.matchScore}%)
                      </span>
                      <span className="text-[11px] font-medium text-stone-500">
                        • {matchInfo.keyHighlight}
                      </span>
                    </div>
                  </div>
                )}

                {/* Header with name and neighbourhood */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-stone-900 text-base leading-snug">
                      {centre.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{centre.neighbourhood}</span>
                      {centre.address && <span>• {centre.address}</span>}
                    </div>
                  </div>

                  {existingApp ? (
                    <StatusBadge
                      status={existingApp.status}
                      waitlistPosition={existingApp.waitlistPosition}
                      size="sm"
                    />
                  ) : null}
                </div>

                {/* Agent Match Reason note */}
                {matchInfo && (
                  <div className="mt-2.5 p-2.5 bg-teal-50/60 border border-teal-100 rounded-lg text-xs text-teal-950">
                    <strong>Why this fits your request:</strong> {matchInfo.matchReason}
                  </div>
                )}

                {/* Badges / Attributes */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {centre.ageGroups.map((age) => (
                    <span
                      key={age}
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        age === 'Toddler'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {age} {age === 'Toddler' && '✓'}
                    </span>
                  ))}
                  {centre.feeNote && (
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      CWELCC ($10/day)
                    </span>
                  )}
                </div>

                {/* Hours */}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-600">
                  <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>Hours: {centre.hours}</span>
                </div>

                {/* Requirements snippet */}
                <div className="mt-3.5 pt-3 border-t border-stone-100">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-stone-400" />
                    Required Documents ({centre.requirements.length}):
                  </div>
                  <ul className="text-xs text-stone-600 space-y-1 pl-4 list-disc marker:text-stone-300">
                    {centre.requirements.slice(0, 3).map((req, idx) => (
                      <li key={idx} className="line-clamp-1">{req}</li>
                    ))}
                    {centre.requirements.length > 3 && (
                      <li className="text-stone-400 list-none -ml-4 font-medium text-[11px]">
                        +{centre.requirements.length - 3} more items in apply checklist
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenConversation(centre.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  title="Converse with this child care centre"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
                  <span>Message Centre</span>
                </button>

                {existingApp ? (
                  <button
                    type="button"
                    onClick={onNavigateToApply}
                    className="text-xs font-semibold text-[#0B4A52] hover:text-[#45B5A5] hover:underline flex items-center justify-center gap-1 py-1.5"
                  >
                    Manage Documents ({existingApp.status}) →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectCentre(centre.id)}
                    className="bg-[#0B4A52] hover:bg-[#08383e] text-white font-medium text-xs py-1.5 px-3.5 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs"
                  >
                    Select for Application
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {displayedCentres.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <p className="text-stone-600 text-sm">No child care centres match your selected filters.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedAgeGroup('All');
              setSelectedNeighbourhood('All');
            }}
            className="mt-2 text-xs font-semibold text-teal-700 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
};
