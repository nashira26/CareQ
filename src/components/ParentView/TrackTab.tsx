import React, { useState } from 'react';
import { Centre, Application, ParentProfile } from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import {
  Sparkles,
  Building2,
  AlertTriangle,
  Check,
  Ban,
  Clock,
  ArrowRight,
  UserCheck,
  MessageSquare,
} from 'lucide-react';

interface TrackTabProps {
  centres: Centre[];
  applications: Application[];
  parentProfile: ParentProfile;
  onAcceptOffer: (applicationId: string, withdrawOthers: boolean) => void;
  onWithdrawApplication: (applicationId: string) => void;
  onNavigateToApply: () => void;
  onNavigateToFind: () => void;
  onOpenConversation: (centreId: string) => void;
}

export const TrackTab: React.FC<TrackTabProps> = ({
  centres,
  applications,
  parentProfile,
  onAcceptOffer,
  onWithdrawApplication,
  onNavigateToApply,
  onNavigateToFind,
  onOpenConversation,
}) => {
  // Offer acceptance confirmation dialog state
  const [selectedOfferAppId, setSelectedOfferAppId] = useState<string | null>(null);

  // Waitlist position history popup modal state
  const [historyModalAppId, setHistoryModalAppId] = useState<string | null>(null);
  const historyModalApp = applications.find((a) => a.id === historyModalAppId);
  const historyModalCentre = historyModalApp
    ? centres.find((c) => c.id === historyModalApp.centreId)
    : null;

  const selectedOfferApp = applications.find((a) => a.id === selectedOfferAppId);
  const selectedOfferCentre = selectedOfferApp
    ? centres.find((c) => c.id === selectedOfferApp.centreId)
    : null;

  // Other active applications that could be withdrawn
  const otherActiveApps = applications.filter(
    (a) =>
      a.id !== selectedOfferAppId &&
      a.status !== 'Withdrawn' &&
      a.status !== 'Accepted'
  );

  return (
    <div className="space-y-6">
      {/* Intro info box */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-stone-900">
            Application Queue Tracker
          </h2>
          <p className="text-sm text-stone-600 mt-0.5">
            Monitor real-time application progression across licensed child care centres in Toronto.
          </p>
        </div>
        <div className="text-xs text-stone-500 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shrink-0">
          Total Applications: <strong className="text-stone-900">{applications.length}</strong>
        </div>
      </div>

      {/* Offer Banner if any offer is active */}
      {applications.some((a) => a.status === 'Offer') && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50 border border-emerald-300 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-950">
                Placement Offer Received!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                A licensed child care spot is now available for Anya. Review and accept below to secure enrolment.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const offerApp = applications.find((a) => a.status === 'Offer');
              if (offerApp) setSelectedOfferAppId(offerApp.id);
            }}
            className="px-4 py-2 bg-[#0B4A52] hover:bg-[#08383e] text-white font-medium text-xs sm:text-sm rounded-lg shadow-xs transition-colors shrink-0 self-start sm:self-auto"
          >
            Review Offer
          </button>
        </div>
      )}

      {/* Applications Table */}
      {applications.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-stone-700">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4 sm:px-6">
                    Child Care Centre
                  </th>
                  <th scope="col" className="py-3 px-3 sm:px-4 hidden md:table-cell">
                    Program / Age
                  </th>
                  <th scope="col" className="py-3 px-3 sm:px-4 hidden sm:table-cell">
                    Intake Date
                  </th>
                  <th scope="col" className="py-3 px-3 sm:px-4">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-4 sm:px-6 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {applications.map((app) => {
                  const centre = centres.find((c) => c.id === app.centreId);
                  const isOffer = app.status === 'Offer';
                  const isAccepted = app.status === 'Accepted';
                  const isWithdrawn = app.status === 'Withdrawn';
                  const isDraft = app.status === 'Draft';

                  return (
                    <tr
                      key={app.id}
                      className={`transition-colors ${
                        isOffer
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                          : isAccepted
                          ? 'bg-teal-50/30'
                          : isWithdrawn
                          ? 'opacity-60 bg-stone-50/50'
                          : 'hover:bg-stone-50/60'
                      }`}
                    >
                      {/* Centre Name & Neighbourhood */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-semibold text-stone-900">
                          {centre?.name || 'Child Care Centre'}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {centre?.neighbourhood} {centre?.hours && `• ${centre.hours}`}
                        </div>
                        {app.submittedAt && (
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            Submitted on {app.submittedAt}
                          </div>
                        )}
                      </td>

                      {/* Program / Age */}
                      <td className="py-3.5 px-3 sm:px-4 hidden md:table-cell text-xs">
                        <span className="font-medium text-stone-800">
                          Toddler ({parentProfile.childAgeMonths} mos)
                        </span>
                        <div className="text-stone-500">{parentProfile.careType}</div>
                      </td>

                      {/* Intake Date */}
                      <td className="py-3.5 px-3 sm:px-4 hidden sm:table-cell text-xs text-stone-700">
                        {parentProfile.preferredStartDate}
                      </td>

                      {/* Status & Centre-Reported Queue Information */}
                      <td className="py-3.5 px-3 sm:px-4">
                        <StatusBadge
                          status={app.status}
                          size="sm"
                        />

                        {/* Centre-reported waitlist queue position and wait details */}
                        {app.status === 'Waitlisted' && (
                          <div className="mt-2 space-y-1 text-xs">
                            {/* 1. Current position & History button */}
                            {typeof app.waitlistPosition === 'number' && app.waitlistPosition > 0 && (
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-stone-900">
                                    Waitlist position: {app.waitlistPosition}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setHistoryModalAppId(app.id)}
                                    className="px-2 py-0.5 text-[11px] font-semibold text-[#0B4A52] bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded transition-colors"
                                  >
                                    History
                                  </button>
                                </div>
                                <div className="text-[11px] text-stone-500 mt-0.5">
                                  Reported by {app.waitlistReportedBy || centre?.name || 'the centre'} · updated {app.waitlistReportedDate || (app.positionHistory && app.positionHistory[app.positionHistory.length - 1]?.date) || 'recently'}
                                </div>
                              </div>
                            )}

                            {/* 3. Below position, show centre's wait estimate */}
                            <div className="text-xs text-stone-700">
                              {app.waitlistEstimate ? (
                                <span>
                                  Wait estimate: {app.waitlistEstimate} (provided by {app.waitlistReportedBy || centre?.name || 'the centre'}, not a guarantee)
                                </span>
                              ) : (
                                <span className="text-stone-500">
                                  Wait estimate: not provided by the centre.
                                </span>
                              )}
                            </div>

                            {/* Small grey note if update is more than 30 days old */}
                            {app.waitlistReportedTimestamp &&
                              Date.now() - app.waitlistReportedTimestamp > 30 * 24 * 60 * 60 * 1000 && (
                                <div className="text-[11px] text-stone-400 font-normal">
                                  Last update over a month ago.
                                </div>
                              )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenConversation(app.centreId)}
                            className="p-1.5 text-stone-600 hover:text-teal-800 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1 text-xs border border-stone-200"
                            title="Chat with centre administrator"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
                            <span className="hidden sm:inline">Message</span>
                          </button>

                          {isOffer && (
                            <button
                              type="button"
                              onClick={() => setSelectedOfferAppId(app.id)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Accept Offer</span>
                            </button>
                          )}

                          {isDraft && (
                            <button
                              type="button"
                              onClick={onNavigateToApply}
                              className="text-teal-700 hover:text-teal-800 font-semibold text-xs inline-flex items-center gap-1 hover:underline"
                            >
                              <span>Complete Apply</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAccepted && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <Check className="w-4 h-4 text-emerald-600" />
                              Confirmed
                            </span>
                          )}

                          {!isOffer && !isDraft && !isAccepted && !isWithdrawn && (
                            <button
                              type="button"
                              onClick={() => onWithdrawApplication(app.id)}
                              className="text-stone-400 hover:text-rose-600 font-medium text-xs transition-colors px-1"
                              title="Withdraw application"
                            >
                              Withdraw
                            </button>
                          )}

                          {isWithdrawn && (
                            <span className="text-xs text-stone-400 italic">
                              Withdrawn
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center space-y-3">
          <p className="text-stone-600 text-sm">No applications recorded yet.</p>
          <button
            type="button"
            onClick={onNavigateToFind}
            className="px-4 py-2 bg-[#0B4A52] hover:bg-[#08383e] text-white text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors"
          >
            Find Centres
          </button>
        </div>
      )}

      {/* Offer Acceptance & Withdraw Other Applications Confirmation Dialog */}
      {selectedOfferApp && selectedOfferCentre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Accept Child Care Offer
                </h3>
                <p className="text-xs text-stone-500">
                  {selectedOfferCentre.name} ({selectedOfferCentre.neighbourhood})
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
              <p className="font-semibold text-emerald-950">
                Congratulations! A licensed spot has been offered for Anya.
              </p>
              <p className="text-emerald-800">
                Target Start Date: {parentProfile.preferredStartDate} • Toddler Room • {selectedOfferCentre.hours}
              </p>
            </div>

            {/* Prompt requirement:
                "If an offer is accepted, show a dialog offering to withdraw the other applications, which requires confirmation." */}
            {otherActiveApps.length > 0 ? (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-stone-800">
                      Withdraw other applications?
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      You currently hold {otherActiveApps.length} other pending or waitlisted application(s):
                    </p>
                  </div>
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1 text-xs text-stone-600 pl-6 list-disc">
                  {otherActiveApps.map((oa) => {
                    const c = centres.find((centre) => centre.id === oa.centreId);
                    return (
                      <div key={oa.id} className="flex justify-between items-center pr-2 py-0.5">
                        <span className="font-medium text-stone-800 truncate">
                          • {c?.name}
                        </span>
                        <StatusBadge status={oa.status} waitlistPosition={oa.waitlistPosition} size="sm" />
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-200">
                  Withdrawing your other applications frees up waitlist spots for other Ontario families waiting in queue.
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone-600">
                You have no other active applications in the queue.
              </p>
            )}

            {/* Dialog Actions with explicit confirmation */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOfferAppId(null)}
                className="px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors order-3 sm:order-1"
              >
                Cancel
              </button>

              {otherActiveApps.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onAcceptOffer(selectedOfferApp.id, false);
                    setSelectedOfferAppId(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors order-2"
                >
                  Accept & Keep Others
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onAcceptOffer(selectedOfferApp.id, true);
                  setSelectedOfferAppId(null);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-semibold bg-[#0B4A52] hover:bg-[#08383e] text-white rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 order-1 sm:order-3"
              >
                <Check className="w-4 h-4" />
                {otherActiveApps.length > 0
                  ? 'Accept & Withdraw Others'
                  : 'Confirm & Accept Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waitlist Position History Modal */}
      {historyModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Waitlist Position History
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {historyModalCentre?.name || historyModalApp.waitlistReportedBy || 'Child Care Centre'} • {historyModalApp.childName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalAppId(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors text-sm font-semibold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              {(() => {
                const history =
                  historyModalApp.positionHistory && historyModalApp.positionHistory.length > 0
                    ? [...historyModalApp.positionHistory]
                    : typeof historyModalApp.waitlistPosition === 'number' && historyModalApp.waitlistPosition > 0
                    ? [
                        {
                          position: historyModalApp.waitlistPosition,
                          date: historyModalApp.waitlistReportedDate || 'Initial',
                        },
                      ]
                    : [];

                if (history.length <= 1) {
                  return (
                    <div className="space-y-2 py-1">
                      {history.length === 1 && (
                        <div className="text-sm text-stone-800">
                          - {history[0].date} — Position {history[0].position} (joined the waitlist)
                        </div>
                      )}
                      <p className="text-sm text-stone-500 italic">No changes yet.</p>
                    </div>
                  );
                }

                // Newest first
                const newestFirst = [...history].reverse();

                return (
                  <ul className="space-y-2.5 text-sm text-stone-800">
                    {newestFirst.map((item, idx) => {
                      const isOldest = idx === newestFirst.length - 1;
                      return (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-stone-400 select-none">-</span>
                          <span>
                            {item.date} — Position {item.position}
                            {isOldest ? ' (joined the waitlist)' : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryModalAppId(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
