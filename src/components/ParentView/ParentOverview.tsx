import React from 'react';
import {
  ParentProfile,
  Application,
  Centre,
  InAppNotification,
} from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
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
            <Sun className="w-7 h-7 text-[#E0A31A] inline-block shrink-0" />
          </span>
        }
        subtitle="One family profile. A clearer path to care."
      />

      {/* Hero Card */}
      <div className="rounded-[28px] bg-[#E4ECE1] border border-[#D9E4D3] p-7 sm:p-9 overflow-hidden">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-[#CBD9C6] px-3.5 py-1 text-xs font-semibold text-[#4E7A5A]">
              <Heart className="w-3.5 h-3.5 fill-[#4E7A5A] shrink-0" />
              Your next chapter, together
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#173F42] leading-tight">
              Find their place.
              <br />
              Keep every step close.
            </h2>

            <p className="text-sm text-[#5B6B66] max-w-md leading-relaxed">
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
            <div className="w-full max-w-[320px] rounded-2xl overflow-hidden shadow-xs border border-[#CBD9C6]">
              <HouseIllustration tone="sage" />
            </div>

            {/* Floating Note rotated -3deg */}
            <div className="absolute -bottom-2 right-2 sm:right-4 transform -rotate-3 rounded-2xl bg-white border border-[#D9E4D3] shadow-md p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E4ECE1] text-[#4E7A5A] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#173F42]">
                  A little more clarity
                </div>
                <div className="text-[11px] text-[#5B6B66]">
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
            <span className="text-xs font-medium text-[#5B6B66]">
              Active applications
            </span>
            <IconTile icon={FileText} tone="sage" />
          </div>
          <div>
            <div className="text-3xl font-bold text-[#173F42]">
              {activeApps.length}
            </div>
            <div className="text-xs text-[#7A8A84] mt-1">
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
            <span className="text-xs font-medium text-[#5B6B66]">
              Drafts in progress
            </span>
            <IconTile icon={Heart} tone="peach" />
          </div>
          <div>
            <div className="text-3xl font-bold text-[#173F42]">
              {draftApps.length}
            </div>
            <div className="text-xs text-[#7A8A84] mt-1">
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
            <span className="text-xs font-medium text-[#5B6B66]">
              Unread companion updates
            </span>
            <IconTile icon={Bell} tone="lilac" />
          </div>
          <div>
            <div className="text-3xl font-bold text-[#173F42]">
              {unreadNotifications.length}
            </div>
            <div className="text-xs text-[#7A8A84] mt-1">
              Messages & status changes
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Your care journey */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-5 border-b border-[#E7E4DA] mb-4">
              <div>
                <h3 className="text-base font-bold text-[#173F42]">
                  Your care journey
                </h3>
                <p className="text-xs text-[#5B6B66] mt-0.5">
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
              <div className="py-8 text-center text-xs text-[#7A8A84]">
                No applications submitted yet. Explore centres to start.
              </div>
            ) : (
              <div className="space-y-2.5">
                {journeyApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => onNavigate('track')}
                    className="rounded-xl border border-[#E7E4DA] p-4 hover:bg-[#FAF9F4] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <IconTile icon={Leaf} tone="sage" />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#173F42] truncate">
                          {getCentreName(app.centreId)}
                        </div>
                        <div className="text-xs text-[#7A8A84] mt-0.5">
                          {app.childName} · {app.careType}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <StatusBadge status={app.status} />
                      <ChevronRight className="w-4 h-4 text-[#7A8A84]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#E7E4DA]">
            <SimNote>
              Queue positions are determined by each centre under its own
              published policy.
            </SimNote>
          </div>
        </Card>

        {/* Right Column: Needs you spotlight */}
        <Card className="bg-[#F3EEE3] border border-[#E3DAC7] p-6 flex flex-col justify-between">
          <div>
            <Eyebrow>Needs you</Eyebrow>

            {offerApp ? (
              <div className="mt-2">
                <h3 className="text-lg font-bold text-[#173F42]">
                  You have an offer!
                </h3>
                <p className="text-xs text-[#5B6B66] mt-1 leading-relaxed">
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
                <h3 className="text-lg font-bold text-[#173F42]">
                  Finish your application
                </h3>
                <p className="text-xs text-[#5B6B66] mt-1 leading-relaxed">
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
                <h3 className="text-lg font-bold text-[#173F42]">
                  You're all caught up
                </h3>
                <p className="text-xs text-[#5B6B66] mt-1 leading-relaxed">
                  Nothing needs your attention today.
                </p>
                <div className="mt-4">
                  <GhostButton
                    onClick={() => onNavigate('find')}
                    className="border-[#D8CFBC] bg-white/80"
                  >
                    Browse more centres
                  </GhostButton>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Sub-card */}
          <div className="mt-6 pt-5 border-t border-[#E3DAC7]">
            <div className="flex items-start gap-3">
              <IconTile icon={Sparkles} tone="sand" className="shrink-0" />
              <div>
                <div className="font-bold text-xs text-[#173F42]">
                  Two sides. One care journey.
                </div>
                <div className="text-[11px] text-[#7A8A84] mt-0.5 leading-relaxed">
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
