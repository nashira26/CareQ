import React from 'react';
import { ParentProfile, Application, Centre, InAppNotification, ApplicationStatus } from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import { ageInMonths, formatAge } from '../../lib/family';
import { PrimaryButton, GhostButton, TertiaryButton, SimNote, SimTag, CentreAvatar, ProgressStrip } from '../ui/CareUI';
import { SpotJourney } from '../ui/Illustrations';
import { Bell, ChevronRight, ArrowRight } from 'lucide-react';

export interface ParentOverviewProps {
  parentProfile: ParentProfile;
  applications: Application[];
  centres: Centre[];
  notifications: InAppNotification[];
  onNavigate: (tab: 'home' | 'find' | 'apply' | 'track' | 'companion' | 'help') => void;
}

/** Applications that need the parent come first; the rest keep their stored order. */
const ATTENTION_ORDER: Record<ApplicationStatus, number> = {
  Offer: 0,
  Draft: 1,
  'Under review': 2,
  Waitlisted: 3,
  Submitted: 4,
  Accepted: 5,
  Withdrawn: 6,
};

export const ParentOverview: React.FC<ParentOverviewProps> = ({
  parentProfile,
  applications,
  centres,
  notifications,
  onNavigate,
}) => {
  const draftApps = applications.filter((a) => a.status === 'Draft');
  const unreadNotifications = notifications.filter((n) => !n.read);
  const journeyApps = applications
    .filter((a) => a.status !== 'Withdrawn')
    .map((a, i) => ({ a, i }))
    .sort((x, y) => ATTENTION_ORDER[x.a.status] - ATTENTION_ORDER[y.a.status] || x.i - y.i)
    .map(({ a }) => a);

  const getCentreName = (centreId: string) => centres.find((c) => c.id === centreId)?.name ?? 'Child Care Centre';
  const offerApp = applications.find((a) => a.status === 'Offer');
  const firstName = parentProfile.name.split(' ')[0] || parentProfile.name;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Greeting band */}
      <section className="rounded-3xl bg-butter px-5 py-6 sm:px-8 sm:py-7 flex items-center justify-between gap-4 overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[30px] sm:leading-[38px] font-extrabold text-brand">Hello, {firstName}</h1>
          <p className="mt-1 text-base text-ink">Here’s where things stand today.</p>
          {parentProfile.children.length > 0 && (
            <p className="mt-3 text-sm text-cq-sand-ink">
              <span className="font-bold">Your family:</span>{' '}
              {parentProfile.children.map((c) => `${c.firstName}, ${formatAge(ageInMonths(c.dateOfBirth))}`).join(' · ')}
            </p>
          )}
        </div>
        <SpotJourney className="w-28 sm:w-52 shrink-0 -mr-2 sm:mr-0" />
      </section>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Needs you + updates */}
        <section className="lg:col-span-2 space-y-3" aria-labelledby="needs-heading">
          <h2 id="needs-heading" className="text-xl font-extrabold text-brand">
            Here’s what needs your attention
          </h2>

          <div className="rounded-2xl bg-white border border-cq-line border-l-4 border-l-coral shadow-sm p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-coral-ink">Needs you</p>
              {offerApp && <SimTag />}
            </div>
            {offerApp ? (
              <>
                <h3 className="mt-1 text-lg font-extrabold text-ink">You have an offer!</h3>
                <p className="mt-0.5 text-[15px] text-ink-muted">
                  {getCentreName(offerApp.centreId)} has a spot for {offerApp.childName}.
                </p>
                <PrimaryButton arrow className="mt-4 w-full sm:w-auto" onClick={() => onNavigate('track')}>
                  Review offer
                </PrimaryButton>
              </>
            ) : draftApps.length > 0 ? (
              <>
                <h3 className="mt-1 text-lg font-extrabold text-ink">Finish your application</h3>
                <p className="mt-0.5 text-[15px] text-ink-muted">
                  You have {draftApps.length} draft{draftApps.length === 1 ? '' : 's'} waiting for documents or submission.
                </p>
                <PrimaryButton arrow className="mt-4 w-full sm:w-auto" onClick={() => onNavigate('apply')}>
                  Continue application
                </PrimaryButton>
              </>
            ) : (
              <>
                <h3 className="mt-1 text-lg font-extrabold text-ink">You’re all caught up</h3>
                <p className="mt-0.5 text-[15px] text-ink-muted">Nothing needs your attention today.</p>
                <GhostButton className="mt-4 w-full sm:w-auto" onClick={() => onNavigate('find')}>
                  Browse more centres
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </GhostButton>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('companion')}
            className="w-full flex items-center gap-3 rounded-2xl bg-white border border-cq-line px-4 py-3.5 text-left hover:bg-mint-50 transition-colors cursor-pointer"
          >
            <span className="w-10 h-10 rounded-xl bg-info-bg text-info flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold text-ink">
                {unreadNotifications.length} unread companion update{unreadNotifications.length === 1 ? '' : 's'}
              </span>
              <span className="block text-xs text-ink-muted">Messages &amp; status changes</span>
            </span>
            <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
          </button>
        </section>

        {/* Your applications */}
        <section className="lg:col-span-3" aria-labelledby="apps-heading">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 id="apps-heading" className="text-xl font-extrabold text-brand">
              Your applications
            </h2>
            {journeyApps.length > 0 && (
              <TertiaryButton className="h-auto px-0" onClick={() => onNavigate('track')}>
                View all
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </TertiaryButton>
            )}
          </div>

          {journeyApps.length === 0 ? (
            <div className="rounded-2xl bg-white border border-cq-line px-5 py-8 text-center text-sm text-ink-muted">
              No applications submitted yet. Explore centres to start.
            </div>
          ) : (
            <ul className="rounded-2xl bg-white border border-cq-line divide-y divide-cq-line overflow-hidden">
              {journeyApps.map((app) => (
                <li key={app.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(app.status === 'Draft' ? 'apply' : 'track')}
                    className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-left hover:bg-mint-50 transition-colors cursor-pointer"
                  >
                    <CentreAvatar centreId={app.centreId} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-bold text-ink leading-snug">{getCentreName(app.centreId)}</span>
                      <span className="block text-xs text-ink-muted mt-0.5">
                        {app.childName} · {app.careType}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={app.status} waitlistPosition={app.waitlistPosition} />
                      </span>
                      <ProgressStrip status={app.status} className="mt-3 max-w-sm" />
                    </span>
                    <ChevronRight className="hidden sm:block w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <SimNote className="mt-3">Queue positions are determined by each centre under its own published policy.</SimNote>

          <div className="mt-6">
            <GhostButton onClick={() => onNavigate('find')} className="w-full sm:w-auto">
              Explore centres
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </GhostButton>
          </div>
        </section>
      </div>
    </div>
  );
};
