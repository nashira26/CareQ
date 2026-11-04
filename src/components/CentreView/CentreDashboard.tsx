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
  Building2,
  FileText,
  Users,
  Sparkles,
  Bot,
  CheckCircle2,
  Baby,
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
  HelpCircle,
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
}) => {
  // Centre View internal tabs: 'applications' | 'policy' | 'help'
  const [centreTab, setCentreTab] = useState<'applications' | 'policy' | 'help'>('applications');

  // Application sub-filter tab
  const [appSubFilter, setAppSubFilter] = useState<'all' | 'review' | 'waitlist' | 'offers'>('all');

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

  const activeWaitlistApp = centreApplications.find((a) => a.id === waitlistModalAppId);

  return (
    <div className="space-y-6">
      {/* Single Centre Header Bar (Strict single centre access - no cross role links) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  {singleCentre.name}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Licensed Centre
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  CWELCC ($10/day)
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {singleCentre.address || singleCentre.neighbourhood} • Operating Hours: {singleCentre.hours}
              </p>
            </div>
          </div>

          <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl self-start lg:self-auto">
            Active Enrolment Queue: <strong className="text-stone-900">{centreApplications.length} applicants</strong>
          </div>
        </div>

        {/* Live sync notification banner if an action was just taken */}
        {lastActionMessage && (
          <div className="mt-4 bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm p-3 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{lastActionMessage}</span>
            </div>
          </div>
        )}

        {/* Centre View Navigation Tabs: Applications vs Policy Management */}
        <div className="mt-6 pt-4 border-t border-stone-200 flex gap-4 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setCentreTab('applications')}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-2 transition-all ${
              centreTab === 'applications'
                ? 'border-[#45B5A5] text-[#0B4A52]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Applications Queue ({centreApplications.length} children)</span>
          </button>

          <button
            type="button"
            onClick={() => setCentreTab('policy')}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-2 transition-all ${
              centreTab === 'policy'
                ? 'border-[#45B5A5] text-[#0B4A52]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Policy & Requirements Management (AI Extractor)</span>
          </button>

          <button
            type="button"
            onClick={() => setCentreTab('help')}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-2 transition-all ${
              centreTab === 'help'
                ? 'border-[#45B5A5] text-[#0B4A52]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help & Support</span>
          </button>
        </div>
      </div>

      {/* TAB 1: APPLICATIONS QUEUE (Multiple Kids) */}
      {centreTab === 'applications' && (
        <div className="space-y-4">
          {/* Sub-filter tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setAppSubFilter('all')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  appSubFilter === 'all'
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Applications ({centreApplications.length})
              </button>
              <button
                type="button"
                onClick={() => setAppSubFilter('review')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  appSubFilter === 'review'
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Intake / Under Review (
                {
                  centreApplications.filter(
                    (a) => a.status === 'Submitted' || a.status === 'Under review'
                  ).length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => setAppSubFilter('waitlist')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  appSubFilter === 'waitlist'
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Waitlist (
                {centreApplications.filter((a) => a.status === 'Waitlisted').length})
              </button>
              <button
                type="button"
                onClick={() => setAppSubFilter('offers')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  appSubFilter === 'offers'
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Offers & Enrolled (
                {
                  centreApplications.filter(
                    (a) => a.status === 'Offer' || a.status === 'Accepted'
                  ).length
                }
                )
              </button>
            </div>

            <div className="text-xs text-stone-500">
              Showing <strong>{filteredApps.length}</strong> child applications
            </div>
          </div>

          {/* Application Cards List with Messaging Button */}
          <div className="space-y-3">
            {filteredApps.map((app) => {
              const isOffer = app.status === 'Offer';
              const isAccepted = app.status === 'Accepted';
              const isWithdrawn = app.status === 'Withdrawn';
              const isUnderReview = app.status === 'Under review';
              const isWaitlisted = app.status === 'Waitlisted';

              return (
                <div
                  key={app.id}
                  className={`bg-white rounded-xl border p-5 transition-all shadow-xs ${
                    isOffer
                      ? 'border-emerald-300 ring-1 ring-emerald-500/20'
                      : isAccepted
                      ? 'border-teal-300 bg-teal-50/20'
                      : isWithdrawn
                      ? 'border-stone-200 opacity-60'
                      : 'border-stone-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Child Details */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-stone-900">
                          {app.childName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-stone-100 text-stone-700">
                          {app.childAgeMonths} months (
                          {app.childAgeMonths < 18
                            ? 'Infant'
                            : app.childAgeMonths < 30
                            ? 'Toddler'
                            : 'Preschool'}
                          )
                        </span>

                        <StatusBadge
                          status={app.status}
                          waitlistPosition={app.waitlistPosition}
                          size="sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 sm:gap-x-4 text-xs text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-stone-400" />
                          <span>
                            Parent: <strong>{app.parentName}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>
                            Start: {app.preferredStartDate} ({app.careType})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileCheck2 className="w-3.5 h-3.5 text-stone-400" />
                          <span>
                            Docs: {app.completedRequirements.length} /{' '}
                            {singleCentre.requirements.length} verified
                          </span>
                        </div>
                      </div>

                      {/* Submitted documents clickable chips */}
                      {Object.keys(app.uploadedDocuments || {}).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-stone-500">Submitted Documents:</span>
                          {Object.entries(app.uploadedDocuments || {}).map(([reqName, doc]) => (
                            <button
                              key={reqName}
                              type="button"
                              onClick={() => setSelectedAppForDetails(app)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium bg-stone-100 hover:bg-teal-50 hover:text-teal-900 border border-stone-200 hover:border-teal-300 px-2 py-0.5 rounded-md transition-colors shadow-2xs"
                              title={`Click to open and inspect ${doc.fileName}`}
                            >
                              <FileCheck2 className="w-3 h-3 text-teal-700 shrink-0" />
                              <span className="truncate max-w-[130px]">{reqName}</span>
                              <Eye className="w-2.5 h-2.5 text-stone-400" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Parent Notes */}
                      {app.parentNotes && (
                        <p className="text-xs text-stone-500 italic bg-stone-50 p-2 rounded-md border border-stone-100">
                          "{app.parentNotes}"
                        </p>
                      )}
                    </div>

                    {/* Right: View Application & Docs button, Message Parent button & Action Status Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100 shrink-0">
                      {/* View Application & Documents Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedAppForDetails(app)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition-colors flex items-center gap-1.5 shadow-2xs"
                        title="Open full application details and inspect submitted documents"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-700" />
                        <span>View Application & Documents</span>
                      </button>

                      {/* Message Parent Button */}
                      <button
                        type="button"
                        onClick={() => onOpenConversation(app)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1.5 shadow-2xs"
                        title="Converse with parent with AI assistance"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
                        <span>Message Parent</span>
                      </button>

                      {/* Set Under Review */}
                      <button
                        type="button"
                        disabled={isUnderReview || isAccepted || isWithdrawn}
                        onClick={() =>
                          handleSetStatus(app.id, 'Under review', app.childName)
                        }
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          isUnderReview
                            ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold cursor-default'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50 hover:border-stone-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isUnderReview ? '✓ Under Review' : 'Set Under Review'}
                      </button>

                      {/* Set Waitlisted with position */}
                      <button
                        type="button"
                        disabled={isAccepted || isWithdrawn}
                        onClick={() => {
                          setPositionInput(app.waitlistPosition || 5);
                          setWaitlistModalAppId(app.id);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          isWaitlisted
                            ? 'bg-purple-50 text-purple-800 border-purple-300 font-semibold'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50 hover:border-stone-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isWaitlisted
                          ? `Waitlisted (#${app.waitlistPosition})`
                          : 'Set Waitlisted...'}
                      </button>

                      {/* Make offer button */}
                      <button
                        type="button"
                        disabled={isOffer || isAccepted || isWithdrawn}
                        onClick={() => handleSetStatus(app.id, 'Offer', app.childName)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs ${
                          isOffer
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isOffer ? 'Offer Pending' : 'Make Offer'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: POLICY & REQUIREMENTS MANAGEMENT (AI GEMINI EXTRACTOR) */}
      {centreTab === 'policy' && (
        <div className="space-y-6">
          {/* Active Requirements Overview */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Current Application Requirements for {singleCentre.name}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  These items appear on the checklist for parents applying to this centre.
                </p>
              </div>
              <span className="text-xs font-semibold bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full self-start sm:self-auto">
                {singleCentre.requirements.length} Active Requirements
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
              {singleCentre.requirements.map((req, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs font-medium text-stone-800 flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate">{req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Paste Policy Text Box & AI Extractor */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Extract Requirements from Policy Text (Gemini AI)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Paste policy text, handbook, or guidelines. Gemini extracts every prerequisite with its exact source sentence.
                  </p>
                </div>
              </div>

              {/* Sample Policy Loader */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                  Preset:
                </span>
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
                  className="text-[11px] px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors"
                >
                  Nature/Forest Policy
                </button>
              </div>
            </div>

            {/* Paste Policy Textarea */}
            <div>
              <label
                htmlFor="policy-text-area"
                className="text-xs font-semibold text-stone-700 uppercase tracking-wider block mb-1.5"
              >
                Paste Policy Text:
              </label>
              <textarea
                id="policy-text-area"
                rows={6}
                value={policyInputText}
                onChange={(e) => setPolicyInputText(e.target.value)}
                placeholder="Paste centre policy text, handbook, or intake guidelines..."
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3.5 text-xs sm:text-sm text-stone-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700 font-mono leading-relaxed resize-y"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-stone-500">
                {policyInputText.split(/\s+/).filter(Boolean).length} words ready for AI analysis
              </span>

              <button
                type="button"
                disabled={isExtracting || !policyInputText.trim()}
                onClick={handleExtractRequirements}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Requirements with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Application Requirements</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Extracted Requirements Confirmation & Edit Section */}
          {extractedRequirements && (
            <div className="bg-white rounded-xl border border-purple-200 p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
                <div>
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Extracted Requirements ({extractedRequirements.length} items found)
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Review and confirm or edit the extracted items below before replacing the centre's active requirements.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomExtracted}
                  className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Requirement</span>
                </button>
              </div>

              {/* Items List with Edit/Confirm Controls and Exact Source Sentence */}
              <div className="space-y-3">
                {extractedRequirements.map((item, index) => {
                  const isEditing = editingIndex === index;

                  return (
                    <div
                      key={index}
                      className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-stone-50 transition-colors space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Requirement Title (Editable) */}
                        <div className="flex-1">
                          <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                            Requirement #{index + 1}:
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full text-sm font-semibold px-2.5 py-1 bg-white border border-teal-500 rounded-md focus:outline-hidden"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(index)}
                                className="px-2.5 py-1 bg-teal-700 text-white text-xs font-semibold rounded hover:bg-teal-800"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-stone-900">
                                {item.requirement}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(index, item.requirement)}
                                className="text-stone-400 hover:text-stone-700 p-1"
                                title="Edit requirement title"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Action: Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteExtracted(index)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remove this requirement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Exact source sentence from policy text */}
                      <div className="bg-white p-2.5 rounded-lg border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
                        <Quote className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[11px] font-semibold text-purple-900 block">
                            Exact Source Sentence from Policy:
                          </span>
                          <span className="italic text-stone-700">
                            "{item.sourceSentence}"
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Banner to Confirm & Replace Centre Requirements */}
              <div className="pt-4 border-t border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-stone-600">
                  {policyUpdateSuccess ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Active requirements updated for {singleCentre.name}!
                    </span>
                  ) : (
                    <span>
                      Click confirm to replace {singleCentre.name}'s active requirements with this
                      extracted checklist.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmReplaceRequirements}
                  className="px-5 py-2.5 bg-[#0B4A52] hover:bg-[#08383e] text-white font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Replace Centre Requirements</span>
                </button>
              </div>
            </div>
          )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Set Waitlist Position
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {singleCentre.name} • Applicant: {activeWaitlistApp.childName} (
                {activeWaitlistApp.childAgeMonths} mos)
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="waitlist-pos-input"
                  className="text-xs font-semibold text-stone-700 uppercase tracking-wider block mb-1"
                >
                  Queue Position Number:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-500">#</span>
                  <input
                    id="waitlist-pos-input"
                    type="number"
                    min="1"
                    max="200"
                    value={positionInput}
                    onChange={(e) =>
                      setPositionInput(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full text-base font-semibold px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="waitlist-est-input"
                  className="text-xs font-semibold text-stone-700 uppercase tracking-wider block mb-1"
                >
                  Centre's Typical Wait Estimate:
                </label>
                <input
                  id="waitlist-est-input"
                  type="text"
                  placeholder="e.g. 8–12 months (or leave blank if no estimate)"
                  value={waitEstimateInput}
                  onChange={(e) => setWaitEstimateInput(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['8–12 months', '6–9 months', '3–6 months', '12+ months'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWaitEstimateInput(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        waitEstimateInput === preset
                          ? 'bg-purple-100 text-purple-900 border-purple-300 font-semibold'
                          : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWaitEstimateInput('')}
                    className="text-[10px] px-2 py-0.5 rounded border text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    Clear (no estimate)
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 pt-1">
                Parent {activeWaitlistApp.parentName} will see "Position {positionInput} · reported by {singleCentre.name} on today's date".
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setWaitlistModalAppId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
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
                className="px-4 py-1.5 text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white rounded-lg transition-colors shadow-xs"
              >
                Save Waitlist Position
              </button>
            </div>
          </div>
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
