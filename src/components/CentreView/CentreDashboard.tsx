import React, { useState } from 'react';
import {
  Centre,
  Application,
  ApplicationStatus,
} from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import { ApplicationDetailsModal } from '../ApplicationDetailsModal';
import { HelpTab } from '../HelpTab';
import { SupportRequest } from '../../data/helpData';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  IconTile,
  Eyebrow,
  DemoBanner,
  SimNote,
  AiFallbackNote,
  AiMode,
} from '../ui/CareUI';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  User,
  Plus,
  Trash2,
  Edit2,
  Check,
  Quote,
  Loader2,
  MessageSquare,
  FileCheck2,
  Eye,
  Heart,
  X,
} from 'lucide-react';

interface ExtractedRequirement {
  requirement: string;
  sourceSentence: string;
}

interface CentreDashboardProps {
  singleCentre: Centre;
  applications: Application[];
  onUpdateStatus: (
    applicationId: string,
    newStatus: ApplicationStatus,
    waitlistPosition?: number,
    waitlistEstimate?: string
  ) => void;
  onUpdateCentreRequirements: (centreId: string, newRequirements: string[]) => void;
  onOpenConversation: (application: Application) => void;
  requests: SupportRequest[];
  onSubmitRequest: (newReq: Omit<SupportRequest, 'id' | 'referenceNumber' | 'submittedAt'>) => void;
  onAdvanceConcernStep: (requestId: string) => void;
  activeTab?: 'applications' | 'policy' | 'help';
  onTabChange?: (t: 'applications' | 'policy' | 'help') => void;
}

export const CentreDashboard: React.FC<CentreDashboardProps> = ({
  singleCentre,
  applications,
  onUpdateStatus,
  onUpdateCentreRequirements,
  onOpenConversation,
  requests,
  onSubmitRequest,
  onAdvanceConcernStep,
  activeTab,
  onTabChange,
}) => {
  // Centre View internal tabs: 'applications' | 'policy' | 'help'
  const [internalCentreTab, setInternalCentreTab] = useState<'applications' | 'policy' | 'help'>('applications');
  const centreTab = activeTab ?? internalCentreTab;
  const setCentreTab = onTabChange ?? setInternalCentreTab;

  // Application sub-filter tab
  const [appSubFilter, setAppSubFilter] = useState<'all' | 'review' | 'waitlist' | 'offers'>('all');

  // Single expanded row in the applications table
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  // Waitlist position modal state
  const [waitlistModalAppId, setWaitlistModalAppId] = useState<string | null>(null);
  const [positionInput, setPositionInput] = useState<number>(14);
  const [waitEstimateInput, setWaitEstimateInput] = useState<string>('8–12 months');
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // Application & Document Viewer modal state
  const [selectedAppForDetails, setSelectedAppForDetails] = useState<Application | null>(null);

  // Policy text and AI extraction state
  const [policyInputText, setPolicyInputText] = useState<string>(
    `${singleCentre.name} - 2026/2027 CWELCC Intake & Admission Policy.
Pursuant to the Ontario Child Care and Early Years Act (CCEYA), every child admitted into the toddler or preschool program must submit an official Birth Certificate or Canadian passport verifying age.
Parents must present a verified Yellow Immunization Card in compliance with Immunization of School Pupils Act (ISPA) prior to the first day of care.
To qualify for Toronto municipal operating guidelines, parents must provide Proof of Ontario Residency via a recent residential utility bill or lease agreement.
All families must complete and execute the signed Emergency Contact & Medical Release Form with two local emergency contacts.
For children with known anaphylactic allergies or dietary requirements, a Physician's Anaphylaxis Emergency Protocol must be provided.
A signed Photography & Media Consent Form is required for classroom developmental documentation.`
  );
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedRequirements, setExtractedRequirements] = useState<ExtractedRequirement[] | null>(
    null
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [policyUpdateSuccess, setPolicyUpdateSuccess] = useState<boolean>(false);
  const [extractAiMode, setExtractAiMode] = useState<AiMode | null>(null);

  // Applications specifically for this single centre
  const centreApplications = applications.filter((app) => app.centreId === singleCentre.id);

  // Filtered applications by sub-filter
  const filteredApps = centreApplications.filter((app) => {
    if (appSubFilter === 'review') {
      return app.status === 'Submitted' || app.status === 'Under review';
    }
    if (appSubFilter === 'waitlist') {
      return app.status === 'Waitlisted';
    }
    if (appSubFilter === 'offers') {
      return app.status === 'Offer' || app.status === 'Accepted';
    }
    return true;
  });

  const handleSetStatus = (
    appId: string,
    status: ApplicationStatus,
    childName: string,
    pos?: number,
    estimate?: string
  ) => {
    onUpdateStatus(appId, status, pos, estimate);
    const posStr = pos ? ` (Waitlist position #${pos}${estimate ? `, estimate: ${estimate}` : ''})` : '';
    setLastActionMessage(
      `Updated ${childName}'s application to "${status}"${posStr}. Changes are active in the portal.`
    );
  };

  // Call Gemini to extract policy requirements
  const handleExtractRequirements = async () => {
    if (!policyInputText.trim()) return;

    setIsExtracting(true);
    setPolicyUpdateSuccess(false);

    try {
      const res = await fetch('/api/extract-policy-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyText: policyInputText }),
      });

      const data = await res.json();
      if (data.success && data.requirements) {
        setExtractedRequirements(data.requirements);
        setExtractAiMode(data.aiMode ?? null);
      }
    } catch (err) {
      console.error('Extraction error:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Confirm and replace centre requirements
  const handleConfirmReplaceRequirements = () => {
    if (!extractedRequirements || extractedRequirements.length === 0) return;
    const requirementTitles = extractedRequirements.map((r) => r.requirement.trim()).filter(Boolean);
    onUpdateCentreRequirements(singleCentre.id, requirementTitles);
    setPolicyUpdateSuccess(true);
    setLastActionMessage(
      `Successfully updated ${singleCentre.name}'s active requirements to ${requirementTitles.length} items.`
    );
  };

  // Edit single extracted requirement
  const handleStartEdit = (index: number, current: string) => {
    setEditingIndex(index);
    setEditingText(current);
  };

  const handleSaveEdit = (index: number) => {
    if (!extractedRequirements) return;
    const updated = [...extractedRequirements];
    updated[index] = { ...updated[index], requirement: editingText };
    setExtractedRequirements(updated);
    setEditingIndex(null);
  };

  const handleDeleteExtracted = (index: number) => {
    if (!extractedRequirements) return;
    const updated = extractedRequirements.filter((_, i) => i !== index);
    setExtractedRequirements(updated);
  };

  const handleAddCustomExtracted = () => {
    if (!extractedRequirements) return;
    setExtractedRequirements([
      ...extractedRequirements,
      {
        requirement: 'New Custom Prerequisite Document',
        sourceSentence: 'Manually specified by centre administrator.',
      },
    ]);
  };

  const getAgeGroup = (months: number) => {
    if (months < 18) return 'Infant';
    if (months < 30) return 'Toddler';
    return 'Preschool';
  };

  const activeWaitlistApp = centreApplications.find((a) => a.id === waitlistModalAppId);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* If activeTab is given, render lastActionMessage banner at the top if set */}
      {lastActionMessage && (
        <div className="rounded-2xl bg-[#EEF3EA] border border-[#CBD9C6] px-5 py-4 text-sm text-[#173F42] flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#4E7A5A] shrink-0" />
            <span className="font-semibold">{lastActionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setLastActionMessage(null)}
            className="text-[#7A8A84] hover:text-[#173F42] text-xs p-1 cursor-pointer"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: APPLICATIONS & QUEUE */}
      {centreTab === 'applications' && (
        <div className="space-y-6">
          {/* 1. PageHeader */}
          <PageHeader
            eyebrow="Applications & queue"
            title="Every family, one clear next step."
            subtitle="Review applications, update statuses and record positions. Families see each update with your name and the date."
          />

          {/* 2. DemoBanner */}
          <DemoBanner title="Demo workspace.">
            Every application, queue position, offer and message here is simulated. No real centre or family is contacted.
          </DemoBanner>

          {/* 3. Toolbar Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
            <div className="text-sm text-[#3F5250]">
              <span className="font-bold">{centreApplications.length} applications</span>
              {' · '}
              <span className="text-[#4E7A5A] font-semibold">{singleCentre.name}</span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-[#5B6B66] font-medium">Status</span>
              <select
                value={appSubFilter}
                onChange={(e) => setAppSubFilter(e.target.value as any)}
                aria-label="Filter applications by status"
                className="h-10 rounded-xl border border-[#E7E4DA] bg-white px-3 text-xs text-[#173F42] focus:outline-hidden cursor-pointer"
              >
                <option value="all">All statuses</option>
                <option value="review">Needs review</option>
                <option value="waitlist">Waitlist</option>
                <option value="offers">Offers</option>
              </select>
            </div>
          </div>

          {/* 4. Table in Card p-0 overflow-hidden */}
          {filteredApps.length === 0 ? (
            <Card className="py-12 text-center text-xs text-[#7A8A84]">
              No applications match this status filter.
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table (md+) */}
              <div className="hidden md:block">
                <Card className="p-0 overflow-hidden shadow-2xs">
                  {/* Table Header Row */}
                  <div className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr] gap-4 items-center bg-[#FAF9F4] border-b border-[#E7E4DA] px-6 py-4">
                    <Eyebrow className="text-[10px]">CHILD / FAMILY</Eyebrow>
                    <Eyebrow className="text-[10px]">PROGRAM / START</Eyebrow>
                    <Eyebrow className="text-[10px]">STATUS</Eyebrow>
                    <Eyebrow className="text-[10px]">QUEUE</Eyebrow>
                    <Eyebrow className="text-[10px] text-right">ACTIONS</Eyebrow>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-[#E7E4DA]">
                    {filteredApps.map((app) => {
                      const isExpanded = expandedAppId === app.id;
                      const hasPosition =
                        typeof app.waitlistPosition === 'number' && app.waitlistPosition > 0;
                      const isOffer = app.status === 'Offer';
                      const isAccepted = app.status === 'Accepted';
                      const isWithdrawn = app.status === 'Withdrawn';
                      const isUnderReview = app.status === 'Under review';
                      const isWaitlisted = app.status === 'Waitlisted';

                      return (
                        <div key={app.id}>
                          {/* Main Row */}
                          <div
                            className={`grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr] gap-4 items-center px-6 py-6 transition-colors ${
                              isExpanded
                                ? 'bg-[#FAF9F4]'
                                : 'hover:bg-[#FAF9F4]/60'
                            }`}
                          >
                            {/* Child / Family */}
                            <div className="min-w-0 pr-2">
                              <div className="text-sm font-bold text-[#173F42] truncate">
                                {app.childName}
                              </div>
                              <div className="text-[11px] text-[#4E7A5A] font-medium mt-0.5 truncate">
                                {app.parentName} · {app.id}
                              </div>
                              {app.submittedAt && (
                                <div className="text-[11px] text-[#7A8A84] mt-0.5">
                                  Submitted {app.submittedAt}
                                </div>
                              )}
                            </div>

                            {/* Program / Start */}
                            <div>
                              <div className="text-xs font-semibold text-[#3F5250]">
                                {getAgeGroup(app.childAgeMonths)}
                              </div>
                              <div className="text-[11px] text-[#7A8A84] mt-0.5">
                                {app.careType} · {app.preferredStartDate}
                              </div>
                            </div>

                            {/* Status */}
                            <div>
                              <StatusBadge status={app.status} size="sm" />
                            </div>

                            {/* Queue */}
                            <div>
                              {hasPosition ? (
                                <div>
                                  <div className="text-2xl font-bold text-[#4E7A5A] leading-tight">
                                    #{app.waitlistPosition}
                                  </div>
                                  {app.waitlistEstimate && (
                                    <div className="text-[10px] text-[#7A8A84] mt-0.5 leading-tight">
                                      Estimate: {app.waitlistEstimate}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-[#7A8A84]">Not reported</div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="text-right">
                              <GhostButton
                                onClick={() =>
                                  setExpandedAppId(isExpanded ? null : app.id)
                                }
                                className="h-9 px-4 text-xs"
                              >
                                {isExpanded ? 'Close' : 'Review →'}
                              </GhostButton>
                            </div>
                          </div>

                          {/* Expanded Review Panel */}
                          {isExpanded && (
                            <div className="bg-[#FAF9F4] border-t border-[#E7E4DA] px-6 py-5 space-y-4 animate-in fade-in-50 duration-150">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E4DA]">
                                <div className="text-xs text-[#5B6B66]">
                                  <span className="font-bold text-[#173F42]">
                                    {app.childName} ({app.childAgeMonths} mos)
                                  </span>
                                  {' · '}
                                  <span>Parent: {app.parentName}</span>
                                  {' · '}
                                  <span>
                                    Docs verified: {app.completedRequirements.length} of{' '}
                                    {singleCentre.requirements.length}
                                  </span>
                                </div>

                                {app.parentNotes && (
                                  <p className="text-xs italic text-[#5B6B66] bg-white px-3 py-1.5 rounded-lg border border-[#E7E4DA]">
                                    "{app.parentNotes}"
                                  </p>
                                )}
                              </div>

                              {/* Uploaded Documents Chips */}
                              {Object.keys(app.uploadedDocuments || {}).length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-semibold text-[#5B6B66]">
                                    Submitted documents:
                                  </span>
                                  {Object.entries(app.uploadedDocuments || {}).map(
                                    ([reqName, doc]) => (
                                      <button
                                        key={reqName}
                                        type="button"
                                        onClick={() => setSelectedAppForDetails(app)}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-[#E4ECE1] text-[#173F42] border border-[#CBD9C6] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                        title={`Inspect ${doc.fileName}`}
                                      >
                                        <FileCheck2 className="w-3.5 h-3.5 text-[#4E7A5A]" />
                                        <span className="truncate max-w-[140px]">
                                          {reqName}
                                        </span>
                                        <Eye className="w-3 h-3 text-[#7A8A84]" />
                                      </button>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Action Buttons Row */}
                              <div className="flex flex-wrap items-center gap-2 pt-2">
                                <GhostButton
                                  onClick={() => setSelectedAppForDetails(app)}
                                  className="h-9 text-xs"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1 text-[#0B4A52]" />
                                  <span>View application &amp; docs</span>
                                </GhostButton>

                                <GhostButton
                                  onClick={() => onOpenConversation(app)}
                                  className="h-9 text-xs"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 mr-1 text-[#0B4A52]" />
                                  <span>Message family</span>
                                </GhostButton>

                                <GhostButton
                                  disabled={
                                    isUnderReview || isAccepted || isWithdrawn
                                  }
                                  onClick={() =>
                                    handleSetStatus(app.id, 'Under review', app.childName)
                                  }
                                  className="h-9 text-xs"
                                >
                                  {isUnderReview ? '✓ In review' : 'Move to review'}
                                </GhostButton>

                                <PrimaryButton
                                  noArrow
                                  disabled={isAccepted || isWithdrawn}
                                  onClick={() => {
                                    setPositionInput(app.waitlistPosition || 5);
                                    setWaitEstimateInput(
                                      app.waitlistEstimate || '8–12 months'
                                    );
                                    setWaitlistModalAppId(app.id);
                                  }}
                                  className="h-9 text-xs"
                                >
                                  {isWaitlisted
                                    ? `Waitlisted (#${app.waitlistPosition})`
                                    : 'Set position / estimate…'}
                                </PrimaryButton>

                                <PrimaryButton
                                  noArrow
                                  disabled={isOffer || isAccepted || isWithdrawn}
                                  onClick={() =>
                                    handleSetStatus(app.id, 'Offer', app.childName)
                                  }
                                  className="h-9 text-xs"
                                >
                                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                                  {isOffer ? 'Offer pending' : 'Make offer'}
                                </PrimaryButton>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Mobile Stacked Cards (md:hidden) */}
              <div className="md:hidden space-y-4">
                {filteredApps.map((app) => {
                  const isExpanded = expandedAppId === app.id;
                  const hasPosition =
                    typeof app.waitlistPosition === 'number' && app.waitlistPosition > 0;
                  const isOffer = app.status === 'Offer';
                  const isAccepted = app.status === 'Accepted';
                  const isWithdrawn = app.status === 'Withdrawn';
                  const isUnderReview = app.status === 'Under review';
                  const isWaitlisted = app.status === 'Waitlisted';

                  return (
                    <Card key={app.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-[#173F42]">
                            {app.childName}
                          </div>
                          <div className="text-[11px] text-[#4E7A5A] font-medium mt-0.5">
                            {app.parentName} · {app.id}
                          </div>
                          {app.submittedAt && (
                            <div className="text-[10px] text-[#7A8A84] mt-0.5">
                              Submitted {app.submittedAt}
                            </div>
                          )}
                        </div>
                        <StatusBadge status={app.status} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E7E4DA]">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-[#5B6B66] block">
                            Program
                          </span>
                          <span className="font-semibold text-[#173F42]">
                            {getAgeGroup(app.childAgeMonths)}
                          </span>
                          <span className="block text-[11px] text-[#7A8A84]">
                            {app.careType}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-semibold text-[#5B6B66] block">
                            Queue
                          </span>
                          {hasPosition ? (
                            <div>
                              <span className="text-lg font-bold text-[#4E7A5A]">
                                #{app.waitlistPosition}
                              </span>
                              {app.waitlistEstimate && (
                                <span className="block text-[10px] text-[#7A8A84]">
                                  {app.waitlistEstimate}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#7A8A84]">Not reported</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E7E4DA] flex justify-end">
                        <GhostButton
                          onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                          className="h-8 px-3 text-xs"
                        >
                          {isExpanded ? 'Close' : 'Review →'}
                        </GhostButton>
                      </div>

                      {isExpanded && (
                        <div className="pt-3 border-t border-[#E7E4DA] space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <GhostButton
                              onClick={() => setSelectedAppForDetails(app)}
                              className="h-8 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Docs
                            </GhostButton>

                            <GhostButton
                              onClick={() => onOpenConversation(app)}
                              className="h-8 text-xs"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Message
                            </GhostButton>

                            <GhostButton
                              disabled={isUnderReview || isAccepted || isWithdrawn}
                              onClick={() =>
                                handleSetStatus(app.id, 'Under review', app.childName)
                              }
                              className="h-8 text-xs"
                            >
                              Review
                            </GhostButton>

                            <PrimaryButton
                              noArrow
                              disabled={isAccepted || isWithdrawn}
                              onClick={() => {
                                setPositionInput(app.waitlistPosition || 5);
                                setWaitEstimateInput(
                                  app.waitlistEstimate || '8–12 months'
                                );
                                setWaitlistModalAppId(app.id);
                              }}
                              className="h-8 text-xs"
                            >
                              Waitlist…
                            </PrimaryButton>

                            <PrimaryButton
                              noArrow
                              disabled={isOffer || isAccepted || isWithdrawn}
                              onClick={() =>
                                handleSetStatus(app.id, 'Offer', app.childName)
                              }
                              className="h-8 text-xs"
                            >
                              Offer
                            </PrimaryButton>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Footer Under Table */}
          <div className="rounded-2xl border border-[#E7E4DA] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-3">
              <IconTile icon={Heart} tone="sand" />
              <div>
                <div className="text-sm font-semibold text-[#173F42]">
                  Positions are only shown to families after you save them.
                </div>
                <div className="text-[11px] text-[#7A8A84] mt-0.5">
                  Centres hold authority over admissions ordering and reporting dates.
                </div>
              </div>
            </div>
            <SimNote>
              CareQ never calculates or predicts a family's place.
            </SimNote>
          </div>
        </div>
      )}

      {/* TAB 2: POLICY & REQUIREMENTS MANAGEMENT */}
      {centreTab === 'policy' && (
        <div className="space-y-6">
          {/* 1. PageHeader */}
          <PageHeader
            eyebrow="Policy & requirements"
            title="One policy. One checklist parents can trust."
            subtitle="Paste your admission policy. AI finds each requirement and quotes the sentence it came from. Nothing reaches parents until you confirm."
          />

          {/* 2. Grid lg:grid-cols-2 gap-6 */}
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* LEFT Card: Your policy text */}
            <Card className="p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#173F42]">
                  Your policy text
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setPolicyInputText(
                      `High Park Forest Care & Preschool - 2026 Admissions Directive.
Applicants must submit a verified Birth Certificate or Passport.
ISPA immunization proof is required 30 days before attendance.
Parents must sign the Outdoor Risk & Nature All-Weather Participation Agreement.
A Developmental History Questionnaire must be submitted for toddler program placement.
Emergency Contacts Authorization with 2 verified guardians is mandatory.`
                    )
                  }
                  className="text-[11px] font-semibold text-[#0B4A52] hover:underline cursor-pointer"
                >
                  Preset: Forest Policy
                </button>
              </div>

              <textarea
                rows={10}
                value={policyInputText}
                onChange={(e) => setPolicyInputText(e.target.value)}
                placeholder="Paste centre policy text, handbook, or intake guidelines..."
                className="h-72 rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] p-4 text-sm leading-relaxed w-full focus:outline-hidden focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 resize-none text-[#173F42]"
              />

              <div className="pt-2">
                <PrimaryButton
                  onClick={handleExtractRequirements}
                  disabled={isExtracting || !policyInputText.trim()}
                  className="h-11"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  <span>
                    {isExtracting
                      ? 'Reading your policy…'
                      : 'Find requirements with AI'}
                  </span>
                </PrimaryButton>
              </div>
            </Card>

            {/* RIGHT Card: Requirements found */}
            <Card className="p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E4DA]">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#173F42]">
                    Requirements found
                  </h3>
                  <span className="rounded-md bg-[#E4ECE1] text-[#4E7A5A] text-xs px-2 py-0.5 font-semibold">
                    {extractedRequirements ? extractedRequirements.length : 0}
                  </span>
                </div>

                <GhostButton
                  onClick={handleAddCustomExtracted}
                  className="h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add custom requirement</span>
                </GhostButton>
              </div>

              {extractedRequirements && extractedRequirements.length > 0 ? (
                <div className="space-y-3">
                  <AiFallbackNote aiMode={extractAiMode} />
                  <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
                    {extractedRequirements.map((item, index) => {
                      const isEditing = editingIndex === index;

                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-[#E7E4DA] p-4 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* Requirement title */}
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full text-sm font-semibold px-2.5 py-1 bg-white border border-[#0B4A52] rounded-lg focus:outline-hidden text-[#173F42]"
                                    autoFocus
                                  />
                                  <GhostButton
                                    onClick={() => handleSaveEdit(index)}
                                    className="h-8 px-2.5 text-xs font-semibold"
                                  >
                                    Save
                                  </GhostButton>
                                </div>
                              ) : (
                                <span className="text-sm font-semibold text-[#173F42]">
                                  {item.requirement}
                                </span>
                              )}
                            </div>

                            {/* Edit / Remove actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isEditing && (
                                <GhostButton
                                  onClick={() =>
                                    handleStartEdit(index, item.requirement)
                                  }
                                  className="h-8 px-2.5 text-xs"
                                  title="Edit requirement title"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </GhostButton>
                              )}
                              <GhostButton
                                onClick={() => handleDeleteExtracted(index)}
                                className="h-8 px-2.5 text-xs hover:text-rose-600"
                                title="Remove requirement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </GhostButton>
                            </div>
                          </div>

                          {/* Source sentence quote block */}
                          <div className="border-l-2 border-[#C9DCC2] pl-3 text-xs italic text-[#5B6B66] mt-2">
                            <Eyebrow className="text-[10px] not-italic mb-0.5">
                              From your policy
                            </Eyebrow>
                            <span>"{item.sourceSentence}"</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Confirmation and publish */}
                  <div className="pt-3 border-t border-[#E7E4DA] space-y-3">
                    {policyUpdateSuccess && (
                      <div className="rounded-xl bg-[#E4ECE1] border border-[#CBD9C6] p-3 text-xs text-[#173F42] flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-[#4E7A5A] shrink-0" />
                        <span>Active requirements updated for {singleCentre.name}!</span>
                      </div>
                    )}

                    <PrimaryButton
                      onClick={handleConfirmReplaceRequirements}
                      className="w-full h-11 justify-center"
                    >
                      Confirm and publish to parents
                    </PrimaryButton>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#7A8A84] py-8 text-center">
                  Paste your admission policy on the left and click "Find requirements with AI". CareQ will analyze each sentence.
                </p>
              )}
            </Card>
          </div>

          {/* 3. Below, full-width Card: Live for parents now */}
          <Card className="bg-[#E4ECE1] border border-[#D9E4D3] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD9C6]">
              <div>
                <Eyebrow className="text-[10px]">Live for parents now</Eyebrow>
                <h4 className="text-lg font-bold text-[#173F42] mt-1">
                  Active checklist for {singleCentre.name}
                </h4>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-[#4E7A5A] border border-[#CBD9C6]">
                {singleCentre.requirements.length} active requirements
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {singleCentre.requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs font-semibold text-[#173F42] bg-white/70 p-3 rounded-xl border border-[#CBD9C6]"
                >
                  <Check className="w-4 h-4 text-[#4E7A5A] shrink-0 mt-0.5" />
                  <span className="leading-snug">{req}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: HELP & SUPPORT */}
      {centreTab === 'help' && (
        <HelpTab
          role="centre"
          userName={singleCentre.name}
          requests={requests}
          onSubmitRequest={onSubmitRequest}
          onAdvanceConcernStep={onAdvanceConcernStep}
        />
      )}

      {/* Modal for setting Waitlist position */}
      {activeWaitlistApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173F42]/40 backdrop-blur-xs">
          <Card className="max-w-sm w-full p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#173F42]">
                Set waitlist position
              </h3>
              <p className="text-xs text-[#5B6B66] mt-0.5">
                {singleCentre.name} · Applicant: {activeWaitlistApp.childName} (
                {activeWaitlistApp.childAgeMonths} mos)
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="waitlist-pos-input"
                  className="text-xs font-semibold text-[#173F42] uppercase tracking-wider block mb-1"
                >
                  Queue position number:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#5B6B66]">#</span>
                  <input
                    id="waitlist-pos-input"
                    type="number"
                    min="1"
                    max="200"
                    value={positionInput}
                    onChange={(e) =>
                      setPositionInput(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full text-base font-semibold px-3 py-1.5 border border-[#E7E4DA] bg-[#FBFAF3] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/25 focus:border-[#45B5A5] text-[#173F42]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="waitlist-est-input"
                  className="text-xs font-semibold text-[#173F42] uppercase tracking-wider block mb-1"
                >
                  Centre's typical wait estimate:
                </label>
                <input
                  id="waitlist-est-input"
                  type="text"
                  placeholder="e.g. 8–12 months (or leave blank if no estimate)"
                  value={waitEstimateInput}
                  onChange={(e) => setWaitEstimateInput(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-1.5 border border-[#E7E4DA] bg-[#FBFAF3] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/25 focus:border-[#45B5A5] text-[#173F42]"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['8–12 months', '6–9 months', '3–6 months', '12+ months'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWaitEstimateInput(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        waitEstimateInput === preset
                          ? 'bg-[#0B4A52] text-white border-[#0B4A52] font-semibold'
                          : 'bg-white text-[#5B6B66] hover:bg-[#FAF9F4] border-[#E7E4DA]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWaitEstimateInput('')}
                    className="text-[10px] px-2 py-0.5 rounded-lg border text-[#7A8A84] hover:text-[#173F42] hover:bg-[#FAF9F4] border-[#E7E4DA] cursor-pointer"
                  >
                    Clear (no estimate)
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[#7A8A84] pt-1">
                Parent {activeWaitlistApp.parentName} will see "Position {positionInput} · reported by {singleCentre.name} on today's date".
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#E7E4DA]">
              <GhostButton
                onClick={() => setWaitlistModalAppId(null)}
                className="h-9 px-3.5 text-xs"
              >
                Cancel
              </GhostButton>
              <PrimaryButton
                noArrow
                onClick={() => {
                  handleSetStatus(
                    activeWaitlistApp.id,
                    'Waitlisted',
                    activeWaitlistApp.childName,
                    positionInput,
                    waitEstimateInput.trim() || undefined
                  );
                  setWaitlistModalAppId(null);
                }}
                className="h-9 px-4 text-xs font-semibold"
              >
                Save waitlist position
              </PrimaryButton>
            </div>
          </Card>
        </div>
      )}

      {/* Application & Submitted Documents Viewer Modal */}
      {selectedAppForDetails && (
        <ApplicationDetailsModal
          isOpen={!!selectedAppForDetails}
          onClose={() => setSelectedAppForDetails(null)}
          application={selectedAppForDetails}
          centre={singleCentre}
          onOpenConversation={onOpenConversation}
        />
      )}
    </div>
  );
};
