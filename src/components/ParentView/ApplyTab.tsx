import React, { useState } from 'react';
import { Centre, Application, ParentProfile } from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import { ApplicationDetailsModal } from '../ApplicationDetailsModal';
import { PreparedApplicationPanel } from './PreparedApplicationPanel';
import { PreparedDraft, centreStatusLabel } from '../../lib/prepareApplication';
import { DUE_LATER_LABEL, canBeNotApplicable, checklistSummary, requirementState } from '../../lib/checklist';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  CentreAvatar,
  IconTile,
} from '../ui/CareUI';
import { EmptyState, SpotChecklist } from '../ui/Illustrations';
import { CheckCircle2, Circle, Check, ShieldCheck, UploadCloud, FileCheck2, Trash2, Eye, X, Plus, ArrowRight, PenLine } from 'lucide-react';

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
  /** "If applicable" items only: mark Not applicable (with an optional note) or undo it. */
  onMarkNotApplicable: (applicationId: string, requirementName: string, notApplicable: boolean, note?: string) => void;
  onSubmitApplication: (applicationId: string) => void;
  preparedDrafts: Record<string, PreparedDraft>;
  onUpdatePreparedDraft: (applicationId: string, draft: PreparedDraft) => void;
  /** Note to the centre on a draft (used when the centre has no published requirements). */
  onUpdateNoteToCentre: (applicationId: string, note: string) => void;
  onNavigateToFind: () => void;
}

export const ApplyTab: React.FC<ApplyTabProps> = ({
  centres,
  applications,
  parentProfile,
  onToggleRequirement,
  onUploadDocument,
  onRemoveDocument,
  onMarkNotApplicable,
  onSubmitApplication,
  preparedDrafts,
  onUpdatePreparedDraft,
  onUpdateNoteToCentre,
  onNavigateToFind,
}) => {
  // Modal state for review and approve confirmation
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null);
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [viewingAppForDocs, setViewingAppForDocs] = useState<Application | null>(null);
  // The "if applicable" item whose Not applicable note is being written (`${appId}::${requirement}`)
  const [naEditing, setNaEditing] = useState<string | null>(null);
  const [naNote, setNaNote] = useState('');

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
  // Checklist items still missing (the reviewed AI draft's checklist, or the centre's requirements)
  const missingCount = !reviewingApp || !reviewingCentre
    ? 0
    : reviewingDraft
    ? reviewingDraft.checklist.filter((c) => c.status === 'missing').length
    : checklistSummary(reviewingApp, reviewingCentre).missing;

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
    // Named after the active child (sample file, nothing is uploaded)
    const childSlug = parentProfile.childName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'child';
    onUploadDocument(appId, reqName, {
      fileName: `${childSlug}_${sanitized}_doc.pdf`,
      fileSize: '1.2 MB',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Drafts"
        subtitle="Applications you haven't sent yet."
        action={
          <GhostButton onClick={onNavigateToFind}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add more centres
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </GhostButton>
        }
      />

      {/* Draft Applications List */}
      {draftApps.length > 0 ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h2 className="text-xl font-extrabold text-brand">
              Applications in progress ({draftApps.length})
            </h2>
            <span className="text-sm text-ink-muted">
              {parentProfile.childName} · {parentProfile.childAgeMonths} mos · {parentProfile.careType}
            </span>
          </div>

          <div className="space-y-6">
            {draftApps.map((app) => {
              const centre = centres.find((c) => c.id === app.centreId);
              if (!centre) return null;

              // N/A and "due when a space is confirmed" items count as neither ready nor missing
              const summary = checklistSummary(app, centre);
              const totalRequirements = summary.needed;
              const completedCount = summary.ready;
              const isAllReady = centre.requirements.length > 0 && summary.missing === 0;
              const noRequirements = centre.requirements.length === 0;
              const progressPct =
                totalRequirements > 0
                  ? Math.round((completedCount / totalRequirements) * 100)
                  : 0;

              return (
                <Card key={app.id} className="p-6 space-y-6">
                  {/* Card Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-cq-line">
                    <div className="flex items-start gap-3 min-w-0">
                      <CentreAvatar centreId={centre.id} />
                      <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-extrabold text-ink leading-snug">
                          {centre.name}
                        </h3>
                        <span className="text-xs font-bold px-2 py-0.5 bg-stone text-status-draft rounded-md">
                          {centre.neighbourhood}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-1">
                        Intake: {parentProfile.careType} ({parentProfile.childAgeMonths} mos) · Desired Start: {parentProfile.preferredStartDate}
                      </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                  </div>

                  {noRequirements && (
                    <div className="rounded-xl border border-cq-sand-line bg-cq-sand-50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-cq-sand-ink">This centre hasn't published its requirements yet</p>
                      <p className="text-xs text-cq-sand-ink">
                        You can still send your application with a note. The centre may ask for documents later.
                      </p>
                      <div>
                        <label htmlFor={`note-only-${app.id}`} className="text-xs font-semibold text-cq-muted">
                          Note to {centre.name}
                        </label>
                        <textarea
                          id={`note-only-${app.id}`}
                          rows={3}
                          value={app.noteToCentre ?? ''}
                          onChange={(e) => onUpdateNoteToCentre(app.id, e.target.value)}
                          placeholder={`e.g. Hello, I'd like to apply for ${app.childName} for ${app.careType.toLowerCase()} care from ${app.preferredStartDate}.`}
                          className="mt-1 w-full rounded-xl border border-cq-line bg-white p-2.5 text-sm text-cq-ink focus:outline-hidden focus:ring-2 focus:ring-cq-sage-line"
                        />
                      </div>
                    </div>
                  )}

                  {/* Thin Progress Bar: bg #E7E4DA, fill #4E7A5A */}
                  {!noRequirements && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm text-ink-muted font-semibold">
                      <span>Checklist readiness</span>
                      <span>
                        {completedCount} of {totalRequirements} ready
                      </span>
                    </div>
                    <div className="h-2 w-full bg-stone rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={totalRequirements} aria-valuenow={completedCount} aria-label="Checklist readiness">
                      <div
                        className="h-full bg-leaf rounded-full transition-[width] duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  )}

                  {/* Where the checklist comes from (real centres: quoted from their published handbook) */}
                  {!noRequirements && centre.requirementsExtractedFrom && (
                    <p className="text-xs text-cq-muted">
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
                      const state = requirementState(app, centre, req);
                      const naKey = `${app.id}::${req}`;

                      return (
                        <div
                          key={req}
                          className={`rounded-xl border px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            uploadedDoc || isDone ? 'border-mint-line bg-mint-50' : 'border-cq-line bg-white'
                          }`}
                        >
                          {/* Left: Checkbox & requirement name */}
                          <div className="flex items-start gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => onToggleRequirement(app.id, req)}
                              className="-m-2.5 w-11 h-11 inline-flex items-center justify-center shrink-0 rounded-xl cursor-pointer"
                              title="Toggle requirement completion"
                              aria-pressed={!!(uploadedDoc || isDone)}
                              aria-label={`${req}: ${uploadedDoc || isDone ? 'ready' : 'missing'}`}
                            >
                              {uploadedDoc || isDone ? (
                                <CheckCircle2 className="w-6 h-6 text-white fill-leaf-ink" />
                              ) : (
                                <Circle className="w-6 h-6 text-line-strong" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[15px] font-bold text-ink">
                                  {req}
                                </span>
                                {uploadedDoc || isDone ? (
                                  <span className="text-xs font-bold bg-mint text-leaf-ink px-2 py-0.5 rounded-full">
                                    Ready
                                  </span>
                                ) : state === 'not-applicable' ? (
                                  <span className="text-xs font-bold bg-stone text-ink-muted px-2 py-0.5 rounded-full">
                                    N/A
                                  </span>
                                ) : state === 'due-later' ? (
                                  <span className="text-xs font-bold bg-cq-sand-50 text-cq-sand-ink px-2 py-0.5 rounded-full">
                                    {DUE_LATER_LABEL}
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold bg-warning-bg text-warning px-2 py-0.5 rounded-full">
                                    Missing
                                  </span>
                                )}
                              </div>
                              {state === 'not-applicable' && (
                                <p className="text-xs text-ink-muted mt-0.5">
                                  Not applicable{app.notApplicable?.[req]?.note ? `: ${app.notApplicable[req].note}` : ''}
                                </p>
                              )}
                              <p className="text-xs text-cq-soft mt-0.5">
                                {centre.requirementCitations?.[req]
                                  ? `From ${centre.requirementCitations[req]}`
                                  : `Required by ${centre.name} policy for admissions intake.`}
                              </p>
                            </div>
                          </div>

                          {/* Right: Uploaded chip or upload actions */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                            {uploadedDoc ? (
                              <div className="flex items-center gap-2 bg-white border border-cq-sage-line px-3 py-1.5 rounded-xl shadow-2xs">
                                <FileCheck2 className="w-4 h-4 text-cq-sage-ink shrink-0" />
                                <div className="text-left">
                                  <div className="text-xs font-semibold text-cq-ink max-w-[140px] truncate">
                                    {uploadedDoc.fileName}
                                  </div>
                                  <div className="text-xs text-cq-soft">
                                    {uploadedDoc.fileSize}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setViewingAppForDocs(app)}
                                  title="Preview document"
                                  className="p-1 text-cq-muted hover:text-cq-brand rounded hover:bg-cq-page transition-colors ml-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onRemoveDocument(app.id, req)}
                                  title="Remove document"
                                  className="p-1 text-cq-soft hover:text-cq-rose-600 rounded hover:bg-cq-page transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : state === 'not-applicable' ? (
                              <GhostButton onClick={() => onMarkNotApplicable(app.id, req, false)} className="h-9 text-xs">
                                Undo N/A
                              </GhostButton>
                            ) : naEditing === naKey ? (
                              <form
                                className="flex flex-wrap items-center gap-2"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  onMarkNotApplicable(app.id, req, true, naNote);
                                  setNaEditing(null);
                                }}
                              >
                                <input
                                  autoFocus
                                  value={naNote}
                                  maxLength={200}
                                  onChange={(e) => setNaNote(e.target.value)}
                                  placeholder="Note (optional), e.g. Both parents on file"
                                  aria-label={`Why ${req} does not apply (optional)`}
                                  className="h-9 w-56 rounded-lg border border-cq-line bg-white px-2.5 text-xs text-cq-ink focus:outline-hidden focus:ring-2 focus:ring-cq-sage-line"
                                />
                                <GhostButton type="submit" className="h-9 text-xs">Mark N/A</GhostButton>
                                <GhostButton onClick={() => setNaEditing(null)} className="h-9 text-xs">Cancel</GhostButton>
                              </form>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {canBeNotApplicable(req) && (
                                  <GhostButton
                                    onClick={() => {
                                      setNaNote('');
                                      setNaEditing(naKey);
                                    }}
                                    className="h-9 text-xs"
                                  >
                                    Not applicable
                                  </GhostButton>
                                )}
                                <label className="cursor-pointer">
                                  <GhostButton className="h-9 text-xs flex items-center gap-1.5 pointer-events-none">
                                    <UploadCloud className="w-3.5 h-3.5 text-cq-muted" />
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
                  <div className="pt-4 border-t border-cq-line">
                    {noRequirements ? (
                      <p className="text-xs text-cq-soft">
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
                  <div className="pt-4 border-t border-cq-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-cq-muted">
                      {isAllReady ? (
                        <span className="text-success font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
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
        <Card>
          <EmptyState
            title="No applications in progress."
            spot={<SpotChecklist />}
            actions={
              <PrimaryButton arrow onClick={onNavigateToFind}>
                Find centres
              </PrimaryButton>
            }
          >
            Find a centre to start one.
          </EmptyState>
        </Card>
      )}

      {/* Review and Approve Confirmation Modal */}
      {reviewingApp && reviewingCentre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/45">
          <Card className="max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <IconTile icon={ShieldCheck} tone="sage" />
                <div>
                  <h3 className="text-lg font-bold text-cq-ink">
                    Approve and send application
                  </h3>
                  <p className="text-xs text-cq-muted">
                    Ontario Child Care Intake Central Verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingAppId(null)}
                className="text-cq-soft hover:text-cq-ink p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-cq-page rounded-xl p-4 text-xs space-y-2 border border-cq-line">
              <div className="flex justify-between">
                <span className="text-cq-muted">Child Care Centre:</span>
                <span className="font-semibold text-cq-ink text-right">
                  {reviewingCentre.name} ({reviewingCentre.neighbourhood})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-cq-muted">Child &amp; Age:</span>
                <span className="font-semibold text-cq-ink">
                  {parentProfile.childName} ({parentProfile.childAgeMonths} months)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-cq-muted">Desired Intake:</span>
                <span className="font-semibold text-cq-ink">
                  {parentProfile.preferredStartDate} ({parentProfile.careType})
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-cq-line">
                <span className="text-cq-muted">Parent / Guardian:</span>
                <span className="font-semibold text-cq-ink">
                  {parentProfile.name}
                </span>
              </div>
            </div>

            {/* Checklist summary */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-cq-muted">
                {reviewingDraft
                  ? 'Checklist as you reviewed it:'
                  : `Attached Checklist (${checklistSummary(reviewingApp, reviewingCentre).ready}/${checklistSummary(reviewingApp, reviewingCentre).needed}):`}
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {/* With an AI draft, show exactly the statuses that will be sent */}
                {reviewingDraft?.checklist.map((c) => (
                  <div
                    key={c.requirement}
                    className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-cq-input border border-cq-line"
                  >
                    <div className="truncate pr-2">
                      <span className="text-cq-ink font-medium">{c.requirement}</span>
                      {c.matchedDocument && (
                        <span className="block text-xs text-cq-soft truncate">File: {c.matchedDocument}</span>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        c.status === 'ready' ? 'text-cq-sage-ink' : c.status === 'missing' ? 'text-cq-amber-ink' : 'text-cq-lilac-ink-2'
                      }`}
                    >
                      {centreStatusLabel(c)}
                    </span>
                  </div>
                ))}
                {!reviewingDraft && reviewingCentre.requirements.map((req) => {
                  const doc = reviewingApp.uploadedDocuments?.[req];
                  const state = requirementState(reviewingApp, reviewingCentre, req);

                  return (
                    <div
                      key={req}
                      className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-cq-input border border-cq-line"
                    >
                      <div className="truncate pr-2">
                        <span className="text-cq-ink font-medium">{req}</span>
                        {doc && (
                          <span className="block text-xs text-cq-soft truncate">
                            File: {doc.fileName}
                          </span>
                        )}
                      </div>
                      {state === 'ready' ? (
                        <span className="text-cq-sage-ink font-semibold shrink-0 flex items-center gap-1 text-xs">
                          <Check className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : state === 'not-applicable' ? (
                        <span className="text-ink-muted font-semibold shrink-0 text-xs">N/A</span>
                      ) : state === 'due-later' ? (
                        <span className="text-cq-sand-ink font-semibold shrink-0 text-xs">{DUE_LATER_LABEL}</span>
                      ) : (
                        <span className="text-cq-amber-ink font-semibold shrink-0 text-xs">
                          Missing
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {reviewingCentre.requirements.length === 0 && (
              <p className="text-xs text-cq-sand-ink bg-cq-sand-50 border border-cq-sand-line rounded-lg px-3 py-2">
                {reviewingCentre.name} hasn't published its requirements yet.
                {reviewingApp.noteToCentre?.trim() ? ` Your note: “${reviewingApp.noteToCentre.trim()}”` : ' No note added.'}
              </p>
            )}

            {/* AI draft summary: unfilled fields warn but don't block */}
            {reviewingDraft && (
              <div className="space-y-1.5 text-xs">
                <p className="text-cq-muted flex items-center gap-1.5">
                  <PenLine className="w-4 h-4 text-brand" aria-hidden="true" />
                  Includes your reviewed AI draft: {reviewingDraft.fields.length} details, checklist statuses
                  {reviewingDraft.noteToCentre.trim() ? ' and a note' : ''}.
                </p>
                {emptyFieldCount > 0 && (
                  <p className="rounded-lg bg-cq-cream-amber border border-cq-sand-line-2 px-3 py-2 text-cq-amber-ink">
                    {emptyFieldCount} {emptyFieldCount === 1 ? 'field' : 'fields'} still to provide. You can send now or fill
                    them in first.
                  </p>
                )}
              </div>
            )}

            {missingCount > 0 && (
              <p className="text-xs rounded-lg bg-cq-cream-amber border border-cq-sand-line-2 px-3 py-2 text-cq-amber-ink">
                {missingCount} {missingCount === 1 ? 'item is' : 'items are'} still missing. You can send now or add them first.
              </p>
            )}

            <p className="text-xs text-cq-muted bg-cq-sage/40 border border-cq-sage-line p-3 rounded-xl">
              Your application package will be sent to <strong>{reviewingCentre.name}</strong> (simulated in this demo).
            </p>

            <label className="flex items-start gap-2 text-sm text-cq-ink cursor-pointer">
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
