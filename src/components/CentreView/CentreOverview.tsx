import React from 'react';
import { Centre, Application, InAppNotification } from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  IconTile,
  Eyebrow,
  DemoBanner,
  SimNote,
} from '../ui/CareUI';
import {
  Users,
  FileText,
  Clock,
  Heart,
  ArrowRight,
  Leaf,
  Check,
} from 'lucide-react';

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
      {/* 1. PageHeader */}
      <PageHeader
        eyebrow="Centre portal"
        title="More time for the children in the room."
        subtitle={`Your simulated workspace for ${singleCentre.name}.`}
        action={
          <PrimaryButton onClick={() => onNavigate('applications')}>
            Review applications
          </PrimaryButton>
        }
      />

      {/* 2. Centre Identity Card */}
      <div className="rounded-3xl bg-cq-sage border border-cq-sage-line-2 p-8 sm:p-10 flex items-center justify-between gap-6">
        <div>
          <Eyebrow className="text-xs">Simulated centre workspace</Eyebrow>
          <h2 className="mt-3 text-[28px] sm:text-[32px] font-bold text-cq-ink leading-tight">
            {singleCentre.name}
          </h2>
          <p className="mt-3 text-sm text-cq-muted">
            {singleCentre.address || singleCentre.neighbourhood}
            {singleCentre.hours ? ` · ${singleCentre.hours}` : ''}
          </p>
          <span className="mt-4 inline-block rounded-md border border-cq-sage-200 bg-white/70 px-2.5 py-1 text-xs text-cq-sage-ink font-semibold">
            {singleCentre.demoKind === 'open-data'
              ? `Licensed centre · Ontario open data${singleCentre.licenceNumber ? ` (licence #${singleCentre.licenceNumber})` : ''}`
              : singleCentre.demoKind === 'fictional'
              ? 'Fictional centre · Demo details'
              : 'Licensed centre · Demo details'}
          </span>
        </div>

        <div className="hidden sm:flex w-[72px] h-[72px] rounded-3xl bg-cq-sage-250 rotate-[-6deg] items-center justify-center shrink-0 shadow-2xs">
          <Users className="w-8 h-8 text-cq-sage-ink rotate-[6deg]" />
        </div>
      </div>

      {/* 3. Three Stat Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Stat 1: New applications to review */}
        <Card
          onClick={() => onNavigate('applications')}
          className="p-5 flex items-center gap-4 cursor-pointer hover:border-cq-sage-200 transition-colors group justify-between"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <IconTile icon={FileText} tone="sage" />
            <div className="min-w-0">
              <div className="text-2xl font-bold text-cq-ink">
                {reviewCount}
              </div>
              <div className="text-xs text-cq-muted truncate mt-0.5">
                New applications to review
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-cq-faint group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Card>

        {/* Stat 2: Families on your waitlist */}
        <Card
          onClick={() => onNavigate('applications')}
          className="p-5 flex items-center gap-4 cursor-pointer hover:border-cq-sage-200 transition-colors group justify-between"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <IconTile icon={Clock} tone="peach" />
            <div className="min-w-0">
              <div className="text-2xl font-bold text-cq-ink">
                {waitlistCount}
              </div>
              <div className="text-xs text-cq-muted truncate mt-0.5">
                Families on your waitlist
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-cq-faint group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Card>

        {/* Stat 3: Offers waiting on families */}
        <Card
          onClick={() => onNavigate('applications')}
          className="p-5 flex items-center gap-4 cursor-pointer hover:border-cq-sage-200 transition-colors group justify-between"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <IconTile icon={Heart} tone="lilac" />
            <div className="min-w-0">
              <div className="text-2xl font-bold text-cq-ink">
                {offerCount}
              </div>
              <div className="text-xs text-cq-muted truncate mt-0.5">
                Offers waiting on families
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-cq-faint group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Card>
      </div>

      {/* 4. DemoBanner */}
      <DemoBanner title="Demo workspace.">
        You are not signed in as real centre staff. These fictional families and actions show the centre side of CareQ.
      </DemoBanner>

      {/* 5. Section: Applications at a glance */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-cq-ink">
              Applications at a glance
            </h3>
            <p className="text-xs text-cq-muted mt-0.5">
              The newest requests. Keep families in the loop.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('applications')}
            className="text-xs font-semibold text-cq-ink hover:underline cursor-pointer shrink-0"
          >
            View queue →
          </button>
        </div>

        {nonDraftApps.length === 0 ? (
          <Card className="py-10 text-center text-xs text-cq-soft">
            No applications yet. When a family applies, it shows up here.
          </Card>
        ) : (
          <>
            {/* Desktop Table (md+) */}
            <div className="hidden md:block">
              <Card className="p-0 overflow-hidden shadow-2xs">
                {/* Header row */}
                <div className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr] gap-4 items-center bg-cq-page border-b border-cq-line px-6 py-4">
                  <Eyebrow className="text-xs">CHILD / FAMILY</Eyebrow>
                  <Eyebrow className="text-xs">PROGRAM / START</Eyebrow>
                  <Eyebrow className="text-xs">STATUS</Eyebrow>
                  <Eyebrow className="text-xs">QUEUE</Eyebrow>
                  <Eyebrow className="text-xs text-right">ACTIONS</Eyebrow>
                </div>

                {/* Rows */}
                <div className="divide-y divide-cq-line">
                  {nonDraftApps.map((app) => (
                    <div
                      key={app.id}
                      className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr] gap-4 items-center px-6 py-6 hover:bg-cq-page/60 transition-colors"
                    >
                      {/* Child / Family */}
                      <div className="min-w-0 pr-2">
                        <div className="text-sm font-bold text-cq-ink truncate">
                          {app.childName}
                        </div>
                        <div className="text-xs text-cq-sage-ink font-medium mt-0.5 truncate">
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
                          Review →
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
                      <div className="text-xs text-cq-sage-ink font-medium mt-0.5">
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
                      Review →
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
                  Go to Policy &amp; requirements →
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
