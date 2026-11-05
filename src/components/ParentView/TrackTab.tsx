import React, { useState } from 'react';
import { Centre, Application, ParentProfile } from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  DemoBanner,
  IconTile,
  SimNote,
} from '../ui/CareUI';
import {
  Sparkles,
  AlertTriangle,
  Check,
  Heart,
  X,
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
      {/* Page Header */}
      <PageHeader
        eyebrow="Track status"
        title="Every application, one calm place."
        subtitle="Follow each status and respond to offers."
        action={
          <PrimaryButton onClick={onNavigateToFind}>
            Find centres
          </PrimaryButton>
        }
      />

      {/* Demo Banner */}
      <DemoBanner title="Demo workspace.">
        Every application, queue position, offer and message here is simulated. No real centre is contacted.
      </DemoBanner>

      {/* Offer Received Spotlight Card (if any active offer) */}
      {applications.some((a) => a.status === 'Offer') && (
        <div className="rounded-2xl bg-[#E4ECE1] border border-[#CBD9C6] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white text-[#4E7A5A] flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#173F42]">
                Placement offer received!
              </h3>
              <p className="text-xs text-[#5B6B66] mt-0.5">
                A spot is available for {parentProfile.childName}. Review and accept below to secure enrolment.
              </p>
            </div>
          </div>
          <PrimaryButton
            noArrow
            onClick={() => {
              const offerApp = applications.find((a) => a.status === 'Offer');
              if (offerApp) setSelectedOfferAppId(offerApp.id);
            }}
            className="h-10 text-xs shrink-0 self-start sm:self-auto"
          >
            Review offer
          </PrimaryButton>
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-[#173F42]">Your applications</h2>
          <span className="rounded-md bg-[#E4ECE1] text-[#4E7A5A] text-xs px-2 py-0.5 font-semibold">
            {applications.length}
          </span>
        </div>
        <div className="text-xs text-[#5B6B66]">
          {parentProfile.name} &amp; {parentProfile.childName} · Demo family
        </div>
      </div>

      {/* Applications Content: Desktop Table & Mobile Cards */}
      {applications.length > 0 ? (
        <>
          {/* Desktop (md+): Table inside Card p-0 overflow-hidden */}
          <div className="hidden md:block">
            <Card className="p-0 overflow-hidden shadow-2xs">
              {/* Table Header Row */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3.5 bg-[#FAF9F4] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5B6B66] border-b border-[#E7E4DA]">
                <div className="col-span-4">CHILD CARE CENTRE</div>
                <div className="col-span-2">PROGRAM / START</div>
                <div className="col-span-2">STATUS</div>
                <div className="col-span-2">QUEUE</div>
                <div className="col-span-2 text-right">ACTIONS</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#E7E4DA]">
                {applications.map((app) => {
                  const centre = centres.find((c) => c.id === app.centreId);
                  const hasPosition =
                    typeof app.waitlistPosition === 'number' && app.waitlistPosition > 0;
                  const isOffer = app.status === 'Offer';
                  const isAccepted = app.status === 'Accepted';
                  const isWithdrawn = app.status === 'Withdrawn';
                  const isDraft = app.status === 'Draft';

                  return (
                    <div
                      key={app.id}
                      className={`grid grid-cols-12 gap-4 items-center py-6 px-6 transition-colors ${
                        isOffer
                          ? 'bg-[#E4ECE1]/25 hover:bg-[#E4ECE1]/40'
                          : isWithdrawn
                          ? 'opacity-60 bg-[#FAF9F4]/40'
                          : 'hover:bg-[#FAF9F4]/70'
                      }`}
                    >
                      {/* 1. Centre name & details */}
                      <div className="col-span-4 min-w-0 pr-3">
                        <div className="text-sm font-bold text-[#173F42] truncate">
                          {centre?.name || 'Child Care Centre'}
                        </div>
                        <div className="text-[11px] text-[#7A8A84] mt-0.5 truncate">
                          {centre?.neighbourhood || 'Toronto'} · {app.id}
                        </div>
                        {app.submittedAt && (
                          <div className="text-[11px] text-[#7A8A84] mt-0.5">
                            Submitted {app.submittedAt}
                          </div>
                        )}
                      </div>

                      {/* 2. Program / Start */}
                      <div className="col-span-2">
                        <div className="text-xs font-semibold text-[#173F42]">
                          {app.careType || parentProfile.careType}
                        </div>
                        <div className="text-[11px] text-[#5B6B66] mt-0.5">
                          Start {app.preferredStartDate || parentProfile.preferredStartDate}
                        </div>
                      </div>

                      {/* 3. Status */}
                      <div className="col-span-2">
                        <StatusBadge status={app.status} size="sm" />
                      </div>

                      {/* 4. Queue */}
                      <div className="col-span-2">
                        {hasPosition ? (
                          <div>
                            <div className="text-2xl font-bold text-[#4E7A5A] leading-tight">
                              #{app.waitlistPosition}
                            </div>
                            <div className="text-[10px] text-[#7A8A84] mt-0.5 leading-tight">
                              reported by {app.waitlistReportedBy || centre?.name || 'centre'} ·{' '}
                              {app.waitlistReportedDate || 'recently'}
                            </div>
                            {app.waitlistEstimate && (
                              <div className="text-[10px] text-[#7A8A84] mt-1 leading-tight">
                                Centre's estimate: {app.waitlistEstimate}, not a guarantee
                              </div>
                            )}
                          </div>
                        ) : app.waitlistEstimate ? (
                          <div className="text-[10px] text-[#7A8A84] leading-tight">
                            Centre's estimate: {app.waitlistEstimate}, not a guarantee
                          </div>
                        ) : (
                          <div className="text-xs text-[#7A8A84]">Not reported</div>
                        )}
                      </div>

                      {/* 5. Actions */}
                      <div className="col-span-2 flex flex-col items-end gap-1.5">
                        <GhostButton
                          onClick={() => onOpenConversation(app.centreId)}
                          className="h-9 text-xs"
                        >
                          View &amp; message →
                        </GhostButton>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {hasPosition && (
                            <button
                              type="button"
                              onClick={() => setHistoryModalAppId(app.id)}
                              className="text-[11px] font-semibold text-[#0B4A52] hover:underline cursor-pointer"
                            >
                              History
                            </button>
                          )}

                          {isOffer && (
                            <PrimaryButton
                              noArrow
                              onClick={() => setSelectedOfferAppId(app.id)}
                              className="h-8 px-3 text-xs"
                            >
                              Accept offer
                            </PrimaryButton>
                          )}

                          {isDraft && (
                            <button
                              type="button"
                              onClick={onNavigateToApply}
                              className="text-[11px] font-semibold text-[#0B4A52] hover:underline cursor-pointer"
                            >
                              Complete apply →
                            </button>
                          )}

                          {!isOffer && !isDraft && !isAccepted && !isWithdrawn && (
                            <button
                              type="button"
                              onClick={() => onWithdrawApplication(app.id)}
                              className="text-[11px] font-medium text-[#7A8A84] hover:text-rose-600 cursor-pointer transition-colors"
                            >
                              Withdraw
                            </button>
                          )}

                          {isAccepted && (
                            <span className="text-[11px] font-bold text-[#4E7A5A]">
                              ✓ Confirmed
                            </span>
                          )}

                          {isWithdrawn && (
                            <span className="text-[11px] text-[#7A8A84] italic">
                              Withdrawn
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Mobile (md:hidden): Stacked Cards */}
          <div className="md:hidden space-y-4">
            {applications.map((app) => {
              const centre = centres.find((c) => c.id === app.centreId);
              const hasPosition =
                typeof app.waitlistPosition === 'number' && app.waitlistPosition > 0;
              const isOffer = app.status === 'Offer';
              const isAccepted = app.status === 'Accepted';
              const isWithdrawn = app.status === 'Withdrawn';
              const isDraft = app.status === 'Draft';

              return (
                <Card
                  key={app.id}
                  className={`p-5 space-y-4 ${
                    isOffer ? 'bg-[#E4ECE1]/20 border-[#CBD9C6]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#173F42]">
                        {centre?.name || 'Child Care Centre'}
                      </div>
                      <div className="text-[11px] text-[#7A8A84] mt-0.5">
                        {centre?.neighbourhood || 'Toronto'} · {app.id}
                      </div>
                      {app.submittedAt && (
                        <div className="text-[10px] text-[#7A8A84] mt-0.5">
                          Submitted {app.submittedAt}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={app.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E7E4DA] text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#5B6B66] block">
                        Program
                      </span>
                      <span className="text-[#173F42] font-semibold">
                        {app.careType || parentProfile.careType}
                      </span>
                      <span className="block text-[11px] text-[#5B6B66]">
                        Start {app.preferredStartDate || parentProfile.preferredStartDate}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#5B6B66] block">
                        Queue
                      </span>
                      {hasPosition ? (
                        <div>
                          <span className="text-xl font-bold text-[#4E7A5A]">
                            #{app.waitlistPosition}
                          </span>
                          <span className="block text-[10px] text-[#7A8A84] mt-0.5">
                            Reported {app.waitlistReportedDate || 'recently'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#7A8A84]">Not reported</span>
                      )}
                    </div>
                  </div>

                  {app.waitlistEstimate && (
                    <div className="text-[11px] text-[#7A8A84] bg-[#FAF9F4] p-2.5 rounded-lg border border-[#E7E4DA]">
                      Centre's estimate: {app.waitlistEstimate}, not a guarantee
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#E7E4DA] flex items-center justify-between gap-2">
                    <GhostButton
                      onClick={() => onOpenConversation(app.centreId)}
                      className="h-9 text-xs"
                    >
                      View &amp; message →
                    </GhostButton>

                    <div className="flex items-center gap-2">
                      {hasPosition && (
                        <button
                          type="button"
                          onClick={() => setHistoryModalAppId(app.id)}
                          className="text-xs font-semibold text-[#0B4A52] hover:underline"
                        >
                          History
                        </button>
                      )}

                      {isOffer && (
                        <PrimaryButton
                          noArrow
                          onClick={() => setSelectedOfferAppId(app.id)}
                          className="h-8 px-3 text-xs"
                        >
                          Accept
                        </PrimaryButton>
                      )}

                      {!isOffer && !isDraft && !isAccepted && !isWithdrawn && (
                        <button
                          type="button"
                          onClick={() => onWithdrawApplication(app.id)}
                          className="text-xs font-medium text-[#7A8A84] hover:text-rose-600"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-[#5B6B66]">No applications recorded yet.</p>
          <PrimaryButton onClick={onNavigateToFind}>
            Find centres
          </PrimaryButton>
        </Card>
      )}

      {/* Footer Row */}
      <div className="rounded-2xl border border-[#E7E4DA] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-3">
          <IconTile icon={Heart} tone="sand" />
          <div>
            <div className="text-sm font-semibold text-[#173F42]">
              Queues are shown only when the centre records one.
            </div>
            <div className="text-[11px] text-[#7A8A84] mt-0.5">
              Centres manage their own admissions policies and waitlist updates.
            </div>
          </div>
        </div>
        <SimNote>
          CareQ never calculates or predicts a queue position.
        </SimNote>
      </div>

      {/* Offer Acceptance & Withdraw Other Applications Confirmation Dialog */}
      {selectedOfferApp && selectedOfferCentre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173F42]/40 backdrop-blur-xs">
          <Card className="max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <IconTile icon={Sparkles} tone="sage" />
              <div>
                <h3 className="text-lg font-bold text-[#173F42]">
                  Accept child care offer
                </h3>
                <p className="text-xs text-[#5B6B66]">
                  {selectedOfferCentre.name} ({selectedOfferCentre.neighbourhood})
                </p>
              </div>
            </div>

            <div className="bg-[#E4ECE1]/60 border border-[#CBD9C6] rounded-xl p-3.5 text-xs text-[#173F42] space-y-1">
              <p className="font-semibold">
                Congratulations! A licensed spot has been offered for {parentProfile.childName}.
              </p>
              <p className="text-[#5B6B66]">
                Target Start Date: {parentProfile.preferredStartDate} · Toddler Room · {selectedOfferCentre.hours}
              </p>
            </div>

            {otherActiveApps.length > 0 ? (
              <div className="bg-[#FBFAF3] border border-[#E7E4DA] rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#C46E4E] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-[#173F42]">
                      Withdraw other applications?
                    </h4>
                    <p className="text-xs text-[#5B6B66] mt-0.5">
                      You hold {otherActiveApps.length} other pending or waitlisted application(s):
                    </p>
                  </div>
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1 text-xs text-[#5B6B66] pl-6 list-disc">
                  {otherActiveApps.map((oa) => {
                    const c = centres.find((centre) => centre.id === oa.centreId);
                    return (
                      <div key={oa.id} className="flex justify-between items-center pr-2 py-0.5">
                        <span className="font-medium text-[#173F42] truncate">
                          • {c?.name}
                        </span>
                        <StatusBadge status={oa.status} size="sm" />
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-[#7A8A84] pt-1 border-t border-[#E7E4DA]">
                  Withdrawing other applications frees up waitlist spots for other Ontario families.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#5B6B66]">
                You have no other active applications in the queue.
              </p>
            )}

            {/* Dialog Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <GhostButton
                onClick={() => setSelectedOfferAppId(null)}
                className="order-3 sm:order-1 text-xs"
              >
                Cancel
              </GhostButton>

              {otherActiveApps.length > 0 && (
                <GhostButton
                  onClick={() => {
                    onAcceptOffer(selectedOfferApp.id, false);
                    setSelectedOfferAppId(null);
                  }}
                  className="order-2 text-xs"
                >
                  Accept &amp; Keep Others
                </GhostButton>
              )}

              <PrimaryButton
                noArrow
                onClick={() => {
                  onAcceptOffer(selectedOfferApp.id, true);
                  setSelectedOfferAppId(null);
                }}
                className="order-1 sm:order-3 text-xs"
              >
                <Check className="w-4 h-4 mr-1.5" />
                {otherActiveApps.length > 0
                  ? 'Accept & Withdraw Others'
                  : 'Confirm & Accept Offer'}
              </PrimaryButton>
            </div>
          </Card>
        </div>
      )}

      {/* Waitlist Position History Modal */}
      {historyModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173F42]/40 backdrop-blur-xs">
          <Card className="max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#173F42]">
                  Waitlist position history
                </h3>
                <p className="text-xs text-[#5B6B66] mt-0.5">
                  {historyModalCentre?.name || historyModalApp.waitlistReportedBy || 'Child Care Centre'} · {historyModalApp.childName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalAppId(null)}
                className="text-[#7A8A84] hover:text-[#173F42] p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#FAF9F4] border border-[#E7E4DA] rounded-xl p-4">
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
                        <div className="text-sm text-[#173F42]">
                          - {history[0].date} — Position {history[0].position} (joined the waitlist)
                        </div>
                      )}
                      <p className="text-xs text-[#7A8A84] italic">No changes recorded yet.</p>
                    </div>
                  );
                }

                const newestFirst = [...history].reverse();

                return (
                  <ul className="space-y-2.5 text-xs text-[#173F42]">
                    {newestFirst.map((item, idx) => {
                      const isOldest = idx === newestFirst.length - 1;
                      return (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#7A8A84] select-none">-</span>
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
              <GhostButton
                onClick={() => setHistoryModalAppId(null)}
                className="text-xs h-9"
              >
                Close
              </GhostButton>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
