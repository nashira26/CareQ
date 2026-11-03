import React, { useState } from 'react';
import { Centre, Application, ParentProfile, UploadedDocument } from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import { ApplicationDetailsModal } from '../ApplicationDetailsModal';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Building2,
  MapPin,
  Check,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  FileCheck2,
  Paperclip,
  Trash2,
  RefreshCw,
  ExternalLink,
  FileText,
  Eye,
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
  onNavigateToFind,
  onNavigateToTrack,
}) => {
  // Modal state for review and approve confirmation
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null);
  const [viewingAppForDocs, setViewingAppForDocs] = useState<Application | null>(null);

  // Group applications
  const draftApps = applications.filter((app) => app.status === 'Draft');
  const submittedApps = applications.filter((app) => app.status !== 'Draft');

  const reviewingApp = applications.find((a) => a.id === reviewingAppId);
  const reviewingCentre = reviewingApp
    ? centres.find((c) => c.id === reviewingApp.centreId)
    : null;

  // Handle actual file upload or simulated file attachment
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

  const handleAttachSample = (appId: string, reqName: string) => {
    const sanitized = reqName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    onUploadDocument(appId, reqName, {
      fileName: `anya_${sanitized}_doc.pdf`,
      fileSize: '1.2 MB',
    });
  };

  return (
    <div className="space-y-6">
      {/* Intro info box */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-stone-900">
            Intake Documentation & Checklist
          </h2>
          <p className="text-sm text-stone-600 mt-0.5">
            Upload required verification documents for each selected centre. Already uploaded files are safely preserved.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToFind}
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 bg-white border border-stone-200 hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-colors shrink-0 self-start sm:self-auto"
        >
          + Add more centres
        </button>
      </div>

      {/* Draft / Pending Applications requiring review */}
      {draftApps.length > 0 ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-700">
              Applications In Progress ({draftApps.length})
            </h3>
            <span className="text-xs text-stone-500">
              Anya • 22 mos • Full-time • March 2027
            </span>
          </div>

          <div className="space-y-5">
            {draftApps.map((app) => {
              const centre = centres.find((c) => c.id === app.centreId);
              if (!centre) return null;

              const totalRequirements = centre.requirements.length;
              const completedCount = centre.requirements.filter((r) =>
                app.completedRequirements.includes(r)
              ).length;
              const missingCount = totalRequirements - completedCount;
              const isAllReady = missingCount === 0;

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden"
                >
                  {/* Centre Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-50 to-white border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-stone-900">
                          {centre.name}
                        </h4>
                        <span className="text-xs font-medium px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md">
                          {centre.neighbourhood}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Target Intake: Toddler Room (22 mos) • Desired Start: {parentProfile.preferredStartDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAllReady ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Ready for Submission ({totalRequirements}/{totalRequirements})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          {missingCount} {missingCount === 1 ? 'document' : 'documents'} missing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Requirements List with Document Upload Section or Already Uploaded Button */}
                  <div className="p-4 sm:p-5 space-y-4">
                    <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Application Requirements Checklist:
                    </p>

                    <div className="space-y-3">
                      {centre.requirements.map((req) => {
                        const isDone = app.completedRequirements.includes(req);
                        const uploadedDoc = app.uploadedDocuments?.[req];

                        return (
                          <div
                            key={req}
                            className={`p-4 rounded-xl border transition-all ${
                              uploadedDoc || isDone
                                ? 'bg-emerald-50/20 border-emerald-200'
                                : 'bg-stone-50/70 border-stone-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Left: Document Name & Status */}
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => onToggleRequirement(app.id, req)}
                                  className="mt-0.5 shrink-0 focus:outline-hidden"
                                  title="Toggle requirement satisfaction"
                                >
                                  {uploadedDoc || isDone ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-stone-400" />
                                  )}
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-stone-900">
                                      {req}
                                    </span>
                                    {uploadedDoc || isDone ? (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                        Uploaded
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-stone-500 mt-0.5">
                                    Required by Ontario child care licensing guidelines for Toddler intake.
                                  </p>
                                </div>
                              </div>

                              {/* Right: Upload Section or Already Uploaded Button */}
                              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                {uploadedDoc ? (
                                  /* Already Uploaded Button / Card */
                                  <div className="flex items-center gap-2 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs">
                                    <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <div className="text-left">
                                      <div className="text-xs font-semibold text-stone-800 max-w-[140px] truncate">
                                        {uploadedDoc.fileName}
                                      </div>
                                      <div className="text-[10px] text-stone-400">
                                        {uploadedDoc.fileSize} • Uploaded {uploadedDoc.uploadedAt}
                                      </div>
                                    </div>

                                    {/* Action buttons */}
                                    <button
                                      type="button"
                                      onClick={() => setViewingAppForDocs(app)}
                                      title="Open and preview uploaded document"
                                      className="p-1 text-stone-500 hover:text-teal-700 rounded hover:bg-stone-100 transition-colors ml-1"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onRemoveDocument(app.id, req)}
                                      title="Remove uploaded document"
                                      className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-stone-100 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  /* Upload Section */
                                  <div className="flex items-center gap-2">
                                    <label className="cursor-pointer bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs">
                                      <UploadCloud className="w-3.5 h-3.5 text-stone-500" />
                                      <span>Upload Document</span>
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={(e) => handleFileChange(e, app.id, req)}
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => handleAttachSample(app.id, req)}
                                      className="text-[11px] font-medium text-teal-700 hover:text-teal-900 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                      title="Attach sample document with one click"
                                    >
                                      + Attach Sample
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-stone-600">
                        {isAllReady ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-4 h-4 text-emerald-600" />
                            All documents uploaded and verified. Ready to submit!
                          </span>
                        ) : (
                          <span>
                            {missingCount} missing requirement(s). You can upload documents or attach sample files before reviewing.
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setReviewingAppId(app.id)}
                        className="bg-[#0B4A52] hover:bg-[#08383e] text-white font-medium text-sm py-2 px-5 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Review and approve</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-[#45B5A5]/20 text-[#0B4A52] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#0B4A52]">
            No Draft Applications Pending
          </h3>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            All your selected child care centres have been submitted or you haven't selected any new centres yet.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateToFind}
              className="px-4 py-2 bg-[#0B4A52] hover:bg-[#08383e] text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
            >
              Browse Centres in Find Tab
            </button>
            <button
              type="button"
              onClick={onNavigateToTrack}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-medium rounded-lg transition-colors"
            >
              View Tracked Applications
            </button>
          </div>
        </div>
      )}

      {/* Review and Approve Confirmation Dialog */}
      {reviewingApp && reviewingCentre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Review & Approve Application
                </h3>
                <p className="text-xs text-stone-500">
                  CareQ Ontario Child Care Central Application Verification
                </p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-4 text-xs space-y-2 border border-stone-200">
              <div className="flex justify-between">
                <span className="text-stone-500">Child Care Centre:</span>
                <span className="font-semibold text-stone-900 text-right">
                  {reviewingCentre.name} ({reviewingCentre.neighbourhood})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Child & Age:</span>
                <span className="font-semibold text-stone-900">
                  {parentProfile.childName} ({parentProfile.childAgeMonths} months)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Desired Intake:</span>
                <span className="font-semibold text-stone-900">
                  {parentProfile.preferredStartDate} ({parentProfile.careType})
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-stone-200">
                <span className="text-stone-500">Parent / Guardian:</span>
                <span className="font-semibold text-stone-900">
                  {parentProfile.name}
                </span>
              </div>
            </div>

            {/* Checklist summary */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Attached Documents ({reviewingApp.completedRequirements.length}/{reviewingCentre.requirements.length}):
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {reviewingCentre.requirements.map((req) => {
                  const isDone = reviewingApp.completedRequirements.includes(req);
                  const doc = reviewingApp.uploadedDocuments?.[req];

                  return (
                    <div
                      key={req}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-stone-50 border border-stone-100"
                    >
                      <div className="truncate pr-2">
                        <span className="text-stone-800 font-medium">{req}</span>
                        {doc && (
                          <span className="block text-[10px] text-stone-400 truncate">
                            File: {doc.fileName}
                          </span>
                        )}
                      </div>
                      {isDone || doc ? (
                        <span className="text-emerald-700 font-semibold shrink-0 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Uploaded
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold shrink-0 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Missing
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900">
              By approving, your verified application package will be marked <strong>"Submitted"</strong> and immediately transmitted to <strong>{reviewingCentre.name}</strong>.
            </p>

            {/* Dialog Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewingAppId(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSubmitApplication(reviewingApp.id);
                  setReviewingAppId(null);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-medium bg-[#0B4A52] hover:bg-[#08383e] text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Confirm & Submit Application
              </button>
            </div>
          </div>
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
