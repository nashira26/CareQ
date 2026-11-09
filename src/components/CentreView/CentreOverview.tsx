import React from 'react';
import { Centre, Application, InAppNotification } from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import {
  Card,
  PrimaryButton,
  GhostButton,
  IconTile,
  Eyebrow,
  DemoBanner,
  SimNote,
  TertiaryButton,
  GreetingBand,
} from '../ui/CareUI';
import { FileText, Clock, Heart, ArrowRight, Leaf, Check } from 'lucide-react';
import { EmptyState, SpotChecklist } from '../ui/Illustrations';

export interface CentreOverviewProps {
  singleCentre: Centre;
  applications: Application[];
  notifications: InAppNotification[];
  onNavigate: (tab: 'home' | 'applications' | 'messages' | 'policy' | 'help') => void;
}

export const CentreOverview: React.FC<CentreOverviewProps> = ({
  singleCentre,
  applications,
  notifications,
  onNavigate,
}) => {
  // Stat counts
  const reviewCount = applications.filter(
    (a) => a.status === 'Submitted' || a.status === 'Under review'
  ).length;
  const waitlistCount = applications.filter(
    (a) => a.status === 'Waitlisted'
  ).length;
  const offerCount = applications.filter((a) => a.status === 'Offer').length;

  // Newest 5 applications skipping 'Draft'
  const nonDraftApps = applications
    .filter((a) => a.status !== 'Draft')
    .slice(0, 5);

  // Families waiting longest for news: 'Waitlisted' apps sorted by waitlistReportedTimestamp oldest first (none first)
  const waitingLongest = applications
    .filter((a) => a.status === 'Waitlisted')
    .sort((a, b) => {
      const tA = a.waitlistReportedTimestamp ?? 0;
      const tB = b.waitlistReportedTimestamp ?? 0;
      return tA - tB;
    })
    .slice(0, 4);

  // Helper for age group label
  const getAgeGroup = (months: number) => {
    if (months < 18) return 'Infant';
    if (months < 30) return 'Toddler';
    return 'Preschool';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Greeting */}
      <GreetingBand
        tone="mint"
        scene="centre"
        note={{ title: 'Families see your updates', detail: 'the moment you save them' }}
      >
        <p className="text-base font-bold text-leaf-ink">Good to see you</p>
        <h1 className="mt-0.5 text-2xl sm:text-[30px] sm:leading-[38px] font-extrabold text-brand">{singleCentre.name}</h1>
        <p className="mt-1 text-base text-ink">Here’s what needs your attention today.</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-xs font-bold text-sim">Simulated centre workspace</span>
          <span className="inline-flex rounded-md bg-white px-2 py-0.5 text-xs text-brand font-bold">
            {singleCentre.demoKind === 'open-data'
              ? `Licensed centre · Ontario open data${singleCentre.licenceNumber ? ` (licence #${singleCentre.licenceNumber})` : ''}`
              : singleCentre.demoKind === 'fictional'
              ? 'Fictional centre · Demo details'
              : 'Licensed centre · Demo details'}
          </span>
        </div>
        <div className="mt-5">
          <PrimaryButton arrow onClick={() => onNavigate('applications')}>
            Review applications
          </PrimaryButton>
        </div>
      </GreetingBand>

      {/* 3. Needs attention: counts that open the queue */}
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="text-lg font-extrabold text-brand mb-3">
          Needs your attention
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { n: reviewCount, label: 'New applications to review', Icon: FileText, tone: 'bg-info-bg text-info', urgent: reviewCount > 0 },
            { n: waitlistCount, label: 'Families on your waitlist', Icon: Clock, tone: 'bg-status-wait-bg text-status-wait', urgent: false },
            { n: offerCount, label: 'Offers waiting on families', Icon: Heart, tone: 'bg-sun text-status-offer', urgent: false },
          ].map(({ n, label, Icon, tone, urgent }) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate('applications')}
              className={`group rounded-2xl bg-white border border-cq-line p-4 flex items-center gap-3.5 text-left hover:bg-mint-50 transition-colors cursor-pointer ${
                urgent ? 'border-l-4 border-l-coral' : ''
              }`}
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-extrabold text-ink leading-none">{n}</span>
                <span className="block text-sm text-ink-muted mt-1">{label}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-ink-faint group-hover:translate-x-0.5 transition-transform shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      {/* 4. DemoBanner */}
      <DemoBanner title="Demo workspace.">
        You are not signed in as real centre staff. These fictional families and actions show the centre side of CareQ.
      </DemoBanner>

      {/* 5. Section: Applications at a glance */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-brand">
              Applications at a glance
            </h2>
            <p className="text-xs text-cq-muted mt-0.5">
              The newest requests. Keep families in the loop.
            </p>
          </div>
          <TertiaryButton onClick={() => onNavigate('applications')} className="shrink-0">
            View queue
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </TertiaryButton>
        </div>

        {nonDraftApps.length === 0 ? (
          <Card>
            <EmptyState title="No applications yet." spot={<SpotChecklist />}>
              When a family applies, it shows up here.
            </EmptyState>
          </Card>
        ) : (
          <>
            {/* Desktop Table (md+) */}
            <div className="hidden md:block">
              <Card className="p-0 overflow-hidden shadow-2xs">
                {/* Header row */}
                <div className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr] gap-4 items-center bg-page border-b border-cq-line px-6 py-3">
                  <Eyebrow className="text-xs">Child / family</Eyebrow>
                  <Eyebrow className="text-xs">Program / start</Eyebrow>
                  <Eyebrow className="text-xs">Status</Eyebrow>
                  <Eyebrow className="text-xs">Queue</Eyebrow>
                  <Eyebrow className="text-xs text-right">Actions</Eyebrow>
                </div>

                {/* Rows */}
                <div className="divide-y divide-cq-line">
                  {nonDraftApps.map((app) => (
                    <div
                      key={app.id}
                      className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 hover:bg-cq-page/60 transition-colors"
                    >
                      {/* Child / Family */}
                      <div className="min-w-0 pr-2">
                        <div className="text-sm font-bold text-cq-ink truncate">
                          {app.childName}
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5 truncate">
                          {app.parentName} · {app.id}
                        </div>
                        {app.submittedAt && (
                          <div className="text-xs text-cq-soft mt-0.5">
                            Submitted {app.submittedAt}
                          </div>
                        )}
                      </div>

                      {/* Program / Start */}
                      <div>
                        <div className="text-xs font-semibold text-cq-ink-2">
                          {getAgeGroup(app.childAgeMonths)}
                        </div>
                        <div className="text-xs text-cq-soft mt-0.5">
                          {app.careType} · {app.preferredStartDate}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <StatusBadge status={app.status} size="sm" />
                      </div>

                      {/* Queue */}
                      <div>
                        {typeof app.waitlistPosition === 'number' &&
                        app.waitlistPosition > 0 ? (
                          <div className="text-2xl font-bold text-cq-sage-ink leading-tight">
                            #{app.waitlistPosition}
                          </div>
                        ) : (
                          <div className="text-xs text-cq-soft">Not reported</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="text-right">
                        <GhostButton
                          onClick={() => onNavigate('applications')}
                          className="h-9 px-4 text-xs"
                        >
                          Review <ArrowRight className="w-4 h-4 inline-block" aria-hidden="true" />
                        </GhostButton>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Mobile Stacked Cards (md:hidden) */}
            <div className="md:hidden space-y-3">
              {nonDraftApps.map((app) => (
                <Card key={app.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-cq-ink">
                        {app.childName}
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {app.parentName} · {app.id}
                      </div>
                      {app.submittedAt && (
                        <div className="text-xs text-cq-soft mt-0.5">
                          Submitted {app.submittedAt}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={app.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-cq-line">
                    <div>
                      <span className="text-xs font-semibold text-cq-muted block">
                        Program
                      </span>
                      <span className="font-semibold text-cq-ink">
                        {getAgeGroup(app.childAgeMonths)}
                      </span>
                      <span className="block text-xs text-cq-soft">
                        {app.careType}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-cq-muted block">
                        Queue
                      </span>
                      {typeof app.waitlistPosition === 'number' &&
                      app.waitlistPosition > 0 ? (
                        <span className="text-lg font-bold text-cq-sage-ink">
                          #{app.waitlistPosition}
                        </span>
                      ) : (
                        <span className="text-xs text-cq-soft">Not reported</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-cq-line flex justify-end">
                    <GhostButton
                      onClick={() => onNavigate('applications')}
                      className="h-8 px-3 text-xs"
                    >
                      Review <ArrowRight className="w-4 h-4 inline-block" aria-hidden="true" />
                    </GhostButton>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 6. Two Cards Below: Families Waiting Longest + What Parents See */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Card 1: Families waiting longest for news */}
        <Card className="p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-bold text-cq-ink">
                Families waiting longest for news
              </h4>
              <p className="text-xs text-cq-muted mt-0.5">
                Waitlisted applicants needing status or estimate reviews.
              </p>
            </div>

            {waitingLongest.length === 0 ? (
              <p className="text-xs text-cq-soft py-6 text-center">
                No families currently waiting in queue.
              </p>
            ) : (
              <div className="space-y-2.5">
                {waitingLongest.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-xl border border-cq-line p-3.5 flex items-center justify-between gap-3 bg-cq-page"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconTile icon={Leaf} tone="sage" className="w-9 h-9" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-cq-ink truncate">
                          {app.childName} · {app.parentName}
                        </div>
                        <div className="text-xs text-cq-muted mt-0.5">
                          {typeof app.waitlistPosition === 'number' &&
                          app.waitlistPosition > 0
                            ? `Position #${app.waitlistPosition}`
                            : 'No position set'}
                        </div>
                        <div className="text-xs text-cq-soft">
                          {app.waitlistReportedDate
                            ? `Last updated ${app.waitlistReportedDate}`
                            : 'Never updated'}
                        </div>
                      </div>
                    </div>

                    <GhostButton
                      onClick={() => onNavigate('applications')}
                      className="h-8 px-3 text-xs shrink-0"
                    >
                      Update
                    </GhostButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-cq-line">
            <SimNote>All families and positions are simulated.</SimNote>
          </div>
        </Card>

        {/* Card 2: What parents see */}
        <Card className="p-6 bg-cq-sand flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div>
              <Eyebrow className="text-xs">Your live checklist</Eyebrow>
              <h4 className="text-2xl font-bold text-cq-ink mt-2 mb-1">
                {singleCentre.requirements.length} requirements
              </h4>
              <p className="text-xs text-cq-muted">
                Documents families must approve and submit to join your queue.
              </p>
            </div>

            {singleCentre.requirements.length === 0 ? (
              <div className="py-6 space-y-3">
                <p className="text-xs text-cq-muted">
                  No checklist yet. Paste your policy and let CareQ draft one.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('policy')}
                  className="text-xs font-semibold text-cq-brand hover:underline cursor-pointer"
                >
                  Go to Policy &amp; requirements <ArrowRight className="w-4 h-4 inline-block" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {singleCentre.requirements.slice(0, 4).map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-cq-ink bg-white/70 p-2.5 rounded-lg border border-cq-sand-line-2"
                  >
                    <Check className="w-4 h-4 text-cq-sage-ink shrink-0 mt-0.5" />
                    <span className="font-medium leading-snug">{req}</span>
                  </div>
                ))}
                {singleCentre.requirements.length > 4 && (
                  <p className="text-xs text-cq-soft pl-1">
                    +{singleCentre.requirements.length - 4} more checklist items
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-cq-line-sand flex justify-between items-center">
            <button
              type="button"
              onClick={() => onNavigate('policy')}
              className="text-xs font-bold text-cq-brand hover:text-cq-secondary hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>Review policy</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-cq-soft">
              Self-managed intake rules
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
