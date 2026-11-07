import React, { useState } from 'react';
import { Centre, Application, ParentProfile } from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import { ApplicationDetailsModal } from '../ApplicationDetailsModal';
import { PreparedApplicationPanel } from './PreparedApplicationPanel';
import { PreparedDraft, centreStatusLabel } from '../../lib/prepareApplication';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  IconTile,
} from '../ui/CareUI';
import {
  CheckCircle2,
  Circle,
  Check,
  ShieldCheck,
  UploadCloud,
  FileCheck2,
  Trash2,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';

interface ApplyTabProps {
  centres: Centre[];
  applications: Application[];
  parentProfile: ParentProfile;
  onToggleRequirement: (applicationId: string, requirementName: string) => void;
  onUploadDocument: (
    applicationId: string,
    requirementName: string,
    file: { fileName: string; fileSize: string }
  ) => void;
  onRemoveDocument: (applicationId: string, requirementName: string) => void;
  onSubmitApplication: (applicationId: string) => void;
  preparedDrafts: Record<string, PreparedDraft>;
  onUpdatePreparedDraft: (applicationId: string, draft: PreparedDraft) => void;
  /** Note to the centre on a draft (used when the centre has no published requirements). */
  onUpdateNoteToCentre: (applicationId: string, note: string) => void;
  onNavigateToFind: () => void;
  onNavigateToTrack: () => void;
}

export const ApplyTab: React.FC<ApplyTabProps> = ({
  centres,
  applications,
  parentProfile,
  onToggleRequirement,
  onUploadDocument,
  onRemoveDocument,
  onSubmitApplication,
  preparedDrafts,
  onUpdatePreparedDraft,
  onUpdateNoteToCentre,
  onNavigateToFind,
  onNavigateToTrack,
}) => {
  // Modal state for review and approve confirmation
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null);
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [viewingAppForDocs, setViewingAppForDocs] = useState<Application | null>(null);

  // Group applications
  const draftApps = applications.filter((app) => app.status === 'Draft');

  const reviewingApp = applications.find((a) => a.id === reviewingAppId);
  const reviewingCentre = reviewingApp
    ? centres.find((c) => c.id === reviewingApp.centreId)
    : null;
  const reviewingDraft = reviewingApp ? preparedDrafts[reviewingApp.id] : undefined;
  const emptyFieldCount = reviewingDraft
    ? reviewingDraft.fields.filter((f) => f.source === 'parent to provide' && !f.value.trim()).length
    : 0;

  // Handle actual file upload
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    appId: string,
    reqName: string
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileSizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      onUploadDocument(appId, reqName, {
        fileName: file.name,
        fileSize: fileSizeStr,
      });
    }
  };

  // Attach sample simulated document
  const handleAttachSample = (appId: string, reqName: string) => {
    const sanitized = reqName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    onUploadDocument(appId, reqName, {
      fileName: `anya_${sanitized}_doc.pdf`,
      fileSize: '1.2 MB',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Apply"
        title="The right documents, the first time."
        subtitle="Each checklist comes from the centre's own policy. You approve before anything is sent."
        action={
          <GhostButton onClick={onNavigateToFind} className="h-10 text-xs">
            + Add more centres
          </GhostButton>
        }
      />

      {/* Draft Applications List */}
      {draftApps.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5B6B66]">
              Applications In Progress ({draftApps.length})
            </h3>
            <span className="text-xs text-[#7A8A84]">
              {parentProfile.childName} · {parentProfile.childAgeMonths} mos · {parentProfile.careType}
            </span>
          </div>

          <div className="space-y-6">
            {draftApps.map((app) => {
              const centre = centres.find((c) => c.id === app.centreId);
              if (!centre) return null;

              const totalRequirements = centre.requirements.length;
              const completedCount = centre.requirements.filter((r) =>
                app.completedRequirements.includes(r)
              ).length;
              const isAllReady = totalRequirements > 0 && completedCount === totalRequirements;
              const noRequirements = totalRequirements === 0;
              const progressPct =
                totalRequirements > 0
                  ? Math.round((completedCount / totalRequirements) * 100)
                  : 0;

              return (
                <Card key={app.id} className="p-6 space-y-6">
                  {/* Card Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E7E4DA]">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h4 className="text-lg font-bold text-[#173F42]">
                          {centre.name}
                        </h4>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-[#FAF9F4] text-[#5B6B66] border border-[#E7E4DA] rounded-md">
                          {centre.neighbourhood}
                        </span>
                      </div>
                      <p className="text-xs text-[#7A8A84] mt-1">
                        Intake: {parentProfile.careType} ({parentProfile.childAgeMonths} mos) · Desired Start: {parentProfile.preferredStartDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                  </div>

                  {noRequirements && (
                    <div className="rounded-xl border border-[#E7D6A8] bg-[#FBF6EA] p-4 space-y-3">
                      <p className="text-sm font-semibold text-[#5B4A2E]">This centre hasn't published its requirements yet</p>
                      <p className="text-xs text-[#5B4A2E]">
                        You can still send your application with a note. The centre may ask for documents later.
                      </p>
                      <div>
                        <label htmlFor={`note-only-${app.id}`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5B6B66]">
                          Note to {centre.name}
                        </label>
                        <textarea
                          id={`note-only-${app.id}`}
                          rows={3}
                          value={app.noteToCentre ?? ''}
                          onChange={(e) => onUpdateNoteToCentre(app.id, e.target.value)}
                          placeholder={`e.g. Hello, I'd like to apply for ${app.childName} for ${app.careType.toLowerCase()} care from ${app.preferredStartDate}.`}
                          className="mt-1 w-full rounded-xl border border-[#E7E4DA] bg-white p-2.5 text-sm text-[#173F42] focus:outline-hidden focus:ring-2 focus:ring-[#CBD9C6]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Thin Progress Bar: bg #E7E4DA, fill #4E7A5A */}
                  {!noRequirements && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[#5B6B66] font-medium">
                      <span>Checklist readiness</span>
                      <span>
                        {completedCount} of {totalRequirements} ready
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#E7E4DA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4E7A5A] rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  )}

                  {/* Where the checklist comes from (real centres: quoted from their published handbook) */}
                  {!noRequirements && centre.requirementsExtractedFrom && (
                    <p className="text-[11px] text-[#5B6B66]">
                      Extracted from {centre.requirementsExtractedFrom.docTitle}
                      {centre.requirementsExtractedFrom.sourceUrl ? '' : ' (source link not found)'}
                      {centre.requirementsExtractedFrom.fallback === 'licensing-manual' && centre.requirementsExtractedFrom.sourceNote
                        ? `. ${centre.requirementsExtractedFrom.sourceNote}`
                        : ''}
                    </p>
                  )}

                  {/* Requirement rows as checkbox lines */}
                  <div className="space-y-3">
                    {centre.requirements.map((req) => {
                      const isDone = app.completedRequirements.includes(req);
                      const uploadedDoc = app.uploadedDocuments?.[req];

                      return (
                        <div
                          key={req}
                          className="rounded-xl border border-[#E7E4DA] bg-[#FBFAF3] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-[#CBD9C6]"
                        >
                          {/* Left: Checkbox & requirement name */}
                          <div className="flex items-start gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => onToggleRequirement(app.id, req)}
                              className="mt-0.5 shrink-0 focus:outline-hidden cursor-pointer"
                              title="Toggle requirement completion"
                            >
                              {uploadedDoc || isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-[#4E7A5A] fill-[#E4ECE1]" />
                              ) : (
                                <Circle className="w-5 h-5 text-[#7A8A84]" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-[#173F42]">
                                  {req}
                                </span>
                                {uploadedDoc || isDone ? (
                                  <span className="text-[10px] font-semibold bg-[#E4ECE1] text-[#4E7A5A] border border-[#CBD9C6] px-2 py-0.5 rounded-full">
                                    Ready
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold bg-[#FDF3DD] text-[#8A6411] border border-[#EADBB8] px-2 py-0.5 rounded-full">
                                    Missing
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#7A8A84] mt-0.5">
                                {centre.requirementCitations?.[req]
                                  ? `From ${centre.requirementCitations[req]}`
                                  : `Required by ${centre.name} policy for admissions intake.`}
                              </p>
                            </div>
                          </div>

                          {/* Right: Uploaded chip or upload actions */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                            {uploadedDoc ? (
                              <div className="flex items-center gap-2 bg-white border border-[#CBD9C6] px-3 py-1.5 rounded-xl shadow-2xs">
                                <FileCheck2 className="w-4 h-4 text-[#4E7A5A] shrink-0" />
                                <div className="text-left">
                                  <div className="text-xs font-semibold text-[#173F42] max-w-[140px] truncate">
                                    {uploadedDoc.fileName}
                                  </div>
                                  <div className="text-[10px] text-[#7A8A84]">
                                    {uploadedDoc.fileSize}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setViewingAppForDocs(app)}
                                  title="Preview document"
                                  className="p-1 text-[#5B6B66] hover:text-[#0B4A52] rounded hover:bg-[#FAF9F4] transition-colors ml-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onRemoveDocument(app.id, req)}
                                  title="Remove document"
                                  className="p-1 text-[#7A8A84] hover:text-rose-600 rounded hover:bg-[#FAF9F4] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer">
                                  <GhostButton className="h-9 text-xs flex items-center gap-1.5 pointer-events-none">
                                    <UploadCloud className="w-3.5 h-3.5 text-[#5B6B66]" />
                                    <span>Upload document</span>
                                  </GhostButton>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    onChange={(e) => handleFileChange(e, app.id, req)}
                                  />
                                </label>

                                <GhostButton
                                  onClick={() => handleAttachSample(app.id, req)}
                                  className="h-9 text-xs"
                                >
                                  + Attach sample
                                </GhostButton>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI-prepared application: CareQ demo centres only (other open-data centres never have applications) */}
                  <div className="pt-4 border-t border-[#E7E4DA]">
                    {noRequirements ? (
                      <p className="text-xs text-[#7A8A84]">
                        Prepare with AI is available once {centre.name} publishes its requirements.
                      </p>
                    ) : (
                    <PreparedApplicationPanel
                      app={app}
                      centre={centre}
                      parentProfile={parentProfile}
                      draft={preparedDrafts[app.id]}
                      onChange={(d) => onUpdatePreparedDraft(app.id, d)}
                    />
                    )}
                  </div>

                  {/* Card Footer: Submit button */}
                  <div className="pt-4 border-t border-[#E7E4DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-[#5B6B66]">
                      {isAllReady ? (
                        <span className="text-[#4E7A5A] font-semibold flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          All checklist requirements ready for review.
                        </span>
                      ) : (
                        <span>
                          {noRequirements
                            ? 'Add a note if you like, then send when you are ready.'
                            : 'Attach remaining requirements or sample items before submitting.'}
                        </span>
                      )}
                    </p>

                    <PrimaryButton
                      onClick={() => {
                        setConfirmedReview(false);
                        setReviewingAppId(app.id);
                      }}
                      className="h-11"
                    >
                      Approve and send
                    </PrimaryButton>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#E4ECE1] text-[#4E7A5A] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#173F42]">
            No draft applications in progress
          </h3>
          <p className="text-sm text-[#5B6B66] max-w-md mx-auto">
            All your selected child care centres have been submitted, or you can find more centres to begin a new application.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <PrimaryButton onClick={onNavigateToFind}>
              Find centres
            </PrimaryButton>
            <GhostButton onClick={onNavigateToTrack}>
              View track status
            </GhostButton>
          </div>
        </Card>
      )}

      {/* Review and Approve Confirmation Modal */}
      {reviewingApp && reviewingCentre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173F42]/40 backdrop-blur-xs">
          <Card className="max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <IconTile icon={ShieldCheck} tone="sage" />
                <div>
                  <h3 className="text-lg font-bold text-[#173F42]">
                    Approve and send application
                  </h3>
                  <p className="text-xs text-[#5B6B66]">
                    Ontario Child Care Intake Central Verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingAppId(null)}
                className="text-[#7A8A84] hover:text-[#173F42] p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#FAF9F4] rounded-xl p-4 text-xs space-y-2 border border-[#E7E4DA]">
              <div className="flex justify-between">
                <span className="text-[#5B6B66]">Child Care Centre:</span>
                <span className="font-semibold text-[#173F42] text-right">
                  {reviewingCentre.name} ({reviewingCentre.neighbourhood})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6B66]">Child &amp; Age:</span>
                <span className="font-semibold text-[#173F42]">
                  {parentProfile.childName} ({parentProfile.childAgeMonths} months)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6B66]">Desired Intake:</span>
                <span className="font-semibold text-[#173F42]">
                  {parentProfile.preferredStartDate} ({parentProfile.careType})
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#E7E4DA]">
                <span className="text-[#5B6B66]">Parent / Guardian:</span>
                <span className="font-semibold text-[#173F42]">
                  {parentProfile.name}
                </span>
              </div>
            </div>

            {/* Checklist summary */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5B6B66]">
                {reviewingDraft
                  ? 'Checklist as you reviewed it:'
                  : `Attached Checklist (${reviewingApp.completedRequirements.length}/${reviewingCentre.requirements.length}):`}
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {/* With an AI draft, show exactly the statuses that will be sent */}
                {reviewingDraft?.checklist.map((c) => (
                  <div
                    key={c.requirement}
                    className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-[#FBFAF3] border border-[#E7E4DA]"
                  >
                    <div className="truncate pr-2">
                      <span className="text-[#173F42] font-medium">{c.requirement}</span>
                      {c.matchedDocument && (
                        <span className="block text-[10px] text-[#7A8A84] truncate">File: {c.matchedDocument}</span>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-semibold ${
                        c.status === 'ready' ? 'text-[#4E7A5A]' : c.status === 'missing' ? 'text-[#8A6411]' : 'text-[#5A4A85]'
                      }`}
                    >
                      {centreStatusLabel(c)}
                    </span>
                  </div>
                ))}
                {!reviewingDraft && reviewingCentre.requirements.map((req) => {
                  const isDone = reviewingApp.completedRequirements.includes(req);
                  const doc = reviewingApp.uploadedDocuments?.[req];

                  return (
                    <div
                      key={req}
                      className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-[#FBFAF3] border border-[#E7E4DA]"
                    >
                      <div className="truncate pr-2">
                        <span className="text-[#173F42] font-medium">{req}</span>
                        {doc && (
                          <span className="block text-[10px] text-[#7A8A84] truncate">
                            File: {doc.fileName}
                          </span>
                        )}
                      </div>
                      {isDone || doc ? (
                        <span className="text-[#4E7A5A] font-semibold shrink-0 flex items-center gap-1 text-[11px]">
                          <Check className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-[#8A6411] font-semibold shrink-0 text-[11px]">
                          Missing
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {reviewingCentre.requirements.length === 0 && (
              <p className="text-xs text-[#5B4A2E] bg-[#FBF6EA] border border-[#E7D6A8] rounded-lg px-3 py-2">
                {reviewingCentre.name} hasn't published its requirements yet.
                {reviewingApp.noteToCentre?.trim() ? ` Your note: “${reviewingApp.noteToCentre.trim()}”` : ' No note added.'}
              </p>
            )}

            {/* AI draft summary: unfilled fields warn but don't block */}
            {reviewingDraft && (
              <div className="space-y-1.5 text-xs">
                <p className="text-[#5B6B66] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8A6A3B]" />
                  Includes your reviewed AI draft: {reviewingDraft.fields.length} details, checklist statuses
                  {reviewingDraft.noteToCentre.trim() ? ' and a note' : ''}.
                </p>
                {emptyFieldCount > 0 && (
                  <p className="rounded-lg bg-[#FDF3DD] border border-[#EADBB8] px-3 py-2 text-[#8A6411]">
                    {emptyFieldCount} {emptyFieldCount === 1 ? 'field' : 'fields'} still to provide. You can send now or fill
                    them in first.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-[#5B6B66] bg-[#E4ECE1]/40 border border-[#CBD9C6] p-3 rounded-xl">
              By approving, your verified application package will be marked <strong>"Submitted"</strong> and immediately transmitted to <strong>{reviewingCentre.name}</strong>.
            </p>

            <label className="flex items-start gap-2 text-sm text-[#173F42] cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmedReview}
                onChange={(e) => setConfirmedReview(e.target.checked)}
              />
              <span>I&apos;ve reviewed this application and want to send it to {reviewingCentre.name}.</span>
            </label>

            {/* Dialog Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <GhostButton
                onClick={() => setReviewingAppId(null)}
                className="text-xs h-10"
              >
                Cancel
              </GhostButton>
              <PrimaryButton
                disabled={!confirmedReview}
                onClick={() => {
                  if (!confirmedReview) return;
                  onSubmitApplication(reviewingApp.id);
                  setReviewingAppId(null);
                }}
                className="text-xs h-10"
              >
                Confirm &amp; submit
              </PrimaryButton>
            </div>
          </Card>
        </div>
      )}

      {/* Document Inspector Modal for Parent */}
      {viewingAppForDocs && (
        <ApplicationDetailsModal
          isOpen={!!viewingAppForDocs}
          onClose={() => setViewingAppForDocs(null)}
          application={viewingAppForDocs}
          centre={centres.find((c) => c.id === viewingAppForDocs.centreId) || centres[0]}
          onOpenConversation={() => {}}
        />
      )}
    </div>
  );
};
