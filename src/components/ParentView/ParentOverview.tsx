import React from 'react';
import {
  ParentProfile,
  Application,
  Centre,
  InAppNotification,
} from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import { ageInMonths, formatAge } from '../../lib/family';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  IconTile,
  SimNote,
  Eyebrow,
  HouseIllustration,
} from '../ui/CareUI';
import {
  Sun,
  Heart,
  FileText,
  Bell,
  Leaf,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export interface ParentOverviewProps {
  parentProfile: ParentProfile;
  applications: Application[];
  centres: Centre[];
  notifications: InAppNotification[];
  onNavigate: (tab: 'home' | 'find' | 'apply' | 'track' | 'companion' | 'help') => void;
}

export const ParentOverview: React.FC<ParentOverviewProps> = ({
  parentProfile,
  applications,
  centres,
  notifications,
  onNavigate,
}) => {
  // Stat calculations
  const activeApps = applications.filter(
    (a) => a.status !== 'Draft' && a.status !== 'Withdrawn'
  );
  const draftApps = applications.filter((a) => a.status === 'Draft');
  const unreadNotifications = notifications.filter((n) => !n.read);

  // Filter out withdrawn applications for journey list
  const journeyApps = applications.filter((a) => a.status !== 'Withdrawn');

  // Helper to find centre name
  const getCentreName = (centreId: string) => {
    const c = centres.find((item) => item.id === centreId);
    return c ? c.name : 'Child Care Centre';
  };

  // Determine "Needs you" state: Offer takes highest priority, then Drafts, then all caught up
  const offerApp = applications.find((a) => a.status === 'Offer');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <PageHeader
        eyebrow="Parent portal"
        title={
          <span className="inline-flex items-center gap-2.5">
            Hello, {parentProfile.name}
            <Sun className="w-7 h-7 text-cq-sun-deep inline-block shrink-0" />
          </span>
        }
        subtitle="One family profile. A clearer path to care."
      />

      {/* Read-only family line (ages derived from dates of birth) */}
      {parentProfile.children.length > 0 && (
        <p className="-mt-4 text-sm text-cq-muted">
          <span className="font-semibold text-cq-ink">Your family:</span>{' '}
          {parentProfile.children.map((c) => `${c.firstName}, ${formatAge(ageInMonths(c.dateOfBirth))}`).join(' · ')}
        </p>
      )}

      {/* Hero Card */}
      <div className="rounded-3xl bg-cq-sage border border-cq-sage-line-2 p-7 sm:p-9 overflow-hidden">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-cq-sage-line px-3.5 py-1 text-xs font-semibold text-cq-sage-ink">
              <Heart className="w-3.5 h-3.5 fill-cq-sage-ink shrink-0" />
              Your next chapter, together
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold text-cq-ink leading-tight">
              Find their place.
              <br />
              Keep every step close.
            </h2>

            <p className="text-sm text-cq-muted max-w-md leading-relaxed">
              CareQ keeps all your centre applications, documents and updates in
              one calm place — so you can focus on family.
            </p>

            <div className="pt-2">
              <PrimaryButton onClick={() => onNavigate('find')}>
                Explore centres
              </PrimaryButton>
            </div>
          </div>

          {/* Right Column with Illustration & Floating Note */}
          <div className="lg:col-span-5 relative flex items-center justify-center pt-4 lg:pt-0">
            <div className="w-full max-w-[320px] rounded-2xl overflow-hidden shadow-xs border border-cq-sage-line">
              <HouseIllustration tone="sage" />
            </div>

            {/* Floating Note rotated -3deg */}
            <div className="absolute -bottom-2 right-2 sm:right-4 transform -rotate-3 rounded-2xl bg-white border border-cq-sage-line-2 shadow-md p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cq-sage text-cq-sage-ink flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-cq-ink">
                  A little more clarity
                </div>
                <div className="text-xs text-cq-muted">
                  for your family's next step
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Row */}
      <div className="grid sm:grid-cols-3 gap-5">
        {/* 1) Active Applications */}
        <Card
          onClick={() => onNavigate('track')}
          className="cursor-pointer hover:shadow-md transition-shadow group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-cq-muted">
              Active applications
            </span>
            <IconTile icon={FileText} tone="sage" />
          </div>
          <div>
            <div className="text-3xl font-bold text-cq-ink">
              {activeApps.length}
            </div>
            <div className="text-xs text-cq-soft mt-1">
              In review or on waitlist
            </div>
          </div>
        </Card>

        {/* 2) Drafts in Progress */}
        <Card
          onClick={() => onNavigate('apply')}
          className="cursor-pointer hover:shadow-md transition-shadow group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-cq-muted">
              Drafts in progress
            </span>
            <IconTile icon={Heart} tone="peach" />
          </div>
          <div>
            <div className="text-3xl font-bold text-cq-ink">
              {draftApps.length}
            </div>
            <div className="text-xs text-cq-soft mt-1">
              Ready to finish and submit
            </div>
          </div>
        </Card>

        {/* 3) Unread Companion Updates */}
        <Card
          onClick={() => onNavigate('companion')}
          className="cursor-pointer hover:shadow-md transition-shadow group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-cq-muted">
              Unread companion updates
            </span>
            <IconTile icon={Bell} tone="lilac" />
          </div>
          <div>
            <div className="text-3xl font-bold text-cq-ink">
              {unreadNotifications.length}
            </div>
            <div className="text-xs text-cq-soft mt-1">
              Messages & status changes
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Your care journey */}
        <Card className="lg:col-span-2 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-5 border-b border-cq-line mb-4">
              <div>
                <h3 className="text-base font-bold text-cq-ink">
                  Your care journey
                </h3>
                <p className="text-xs text-cq-muted mt-0.5">
                  Current standing across your centres
                </p>
              </div>
              <GhostButton
                onClick={() => onNavigate('track')}
                className="text-xs self-start sm:self-auto"
              >
                View all applications →
              </GhostButton>
            </div>

            {journeyApps.length === 0 ? (
              <div className="py-8 text-center text-xs text-cq-soft">
                No applications submitted yet. Explore centres to start.
              </div>
            ) : (
              <div className="space-y-2.5">
                {journeyApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => onNavigate('track')}
                    className="rounded-xl border border-cq-line p-4 hover:bg-cq-page flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                      <IconTile icon={Leaf} tone="sage" />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-cq-ink truncate">
                          {getCentreName(app.centreId)}
                        </div>
                        <div className="text-xs text-cq-soft mt-0.5">
                          {app.childName} · {app.careType}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 sm:ml-3">
                      <StatusBadge status={app.status} />
                      <ChevronRight className="w-4 h-4 text-cq-soft" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-cq-line">
            <SimNote>
              Queue positions are determined by each centre under its own
              published policy.
            </SimNote>
          </div>
        </Card>

        {/* Right Column: Needs you spotlight */}
        <Card className="bg-cq-sand p-6 flex flex-col justify-between">
          <div>
            <Eyebrow>Needs you</Eyebrow>

            {offerApp ? (
              <div className="mt-2">
                <h3 className="text-lg font-bold text-cq-ink">
                  You have an offer!
                </h3>
                <p className="text-xs text-cq-muted mt-1 leading-relaxed">
                  {getCentreName(offerApp.centreId)} has a spot for{' '}
                  {offerApp.childName}.
                </p>
                <div className="mt-4">
                  <PrimaryButton onClick={() => onNavigate('track')}>
                    Review offer
                  </PrimaryButton>
                </div>
              </div>
            ) : draftApps.length > 0 ? (
              <div className="mt-2">
                <h3 className="text-lg font-bold text-cq-ink">
                  Finish your application
                </h3>
                <p className="text-xs text-cq-muted mt-1 leading-relaxed">
                  You have {draftApps.length} draft
                  {draftApps.length === 1 ? '' : 's'} waiting for documents or
                  submission.
                </p>
                <div className="mt-4">
                  <PrimaryButton onClick={() => onNavigate('apply')}>
                    Continue application
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <h3 className="text-lg font-bold text-cq-ink">
                  You're all caught up
                </h3>
                <p className="text-xs text-cq-muted mt-1 leading-relaxed">
                  Nothing needs your attention today.
                </p>
                <div className="mt-4">
                  <GhostButton
                    onClick={() => onNavigate('find')}
                    className="bg-white/80"
                  >
                    Browse more centres
                  </GhostButton>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Sub-card */}
          <div className="mt-6 pt-5 border-t border-cq-line-sand">
            <div className="flex items-start gap-3">
              <IconTile icon={Sparkles} tone="sand" className="shrink-0" />
              <div>
                <div className="font-bold text-xs text-cq-ink">
                  Two sides. One care journey.
                </div>
                <div className="text-xs text-cq-soft mt-0.5 leading-relaxed">
                  Centres review on their timeline. CareQ keeps communication
                  transparent and calm.
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
