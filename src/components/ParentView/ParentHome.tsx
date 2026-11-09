import React, { useState } from 'react';
import {
  ParentProfile,
  Application,
  Centre,
  InAppNotification,
} from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
import { estimateLine, reportedLine } from '../../lib/simulated';
import {
  PageHeader,
  GhostButton,
  Card,
  IconTile,
  SimNote,
} from '../ui/CareUI';
import {
  TrendingUp,
  Gift,
  FileText,
  Bell,
  Check,
  CalendarDays,
  Plus,
  X,
  ArrowRight,
  Heart,
  Sparkles,
} from 'lucide-react';

interface ParentHomeProps {
  parentProfile: ParentProfile;
  applications: Application[];
  centres: Centre[];
  notifications: InAppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (tab: 'home' | 'find' | 'apply' | 'track' | 'companion' | 'help') => void;
}

interface GentleReminder {
  id: string;
  text: string;
  date?: string;
  completed: boolean;
}

export const ParentHome: React.FC<ParentHomeProps> = ({
  parentProfile,
  applications,
  centres,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}) => {
  // Update filter pill state: 'all' | 'waitlist' | 'offers' | 'applications'
  const [activeFilter, setActiveFilter] = useState<'all' | 'waitlist' | 'offers' | 'applications'>('all');

  // Reminders state (local useState only)
  const [reminders, setReminders] = useState<GentleReminder[]>([
    {
      id: 'rem-1',
      text: 'Submit updated immunization records for Anya',
      date: 'Nov 12',
      completed: false,
    },
    {
      id: 'rem-2',
      text: 'Check subsidized CWELCC fee calculations',
      completed: true,
    },
  ]);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    const item: GentleReminder = {
      id: `rem-${Date.now()}`,
      text: newReminderText.trim(),
      date: newReminderDate.trim() || undefined,
      completed: false,
    };
    setReminders((prev) => [item, ...prev]);
    setNewReminderText('');
    setNewReminderDate('');
  };

  const handleToggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const handleRemoveReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Filtered notifications (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => b.createdAt - a.createdAt);
  const filteredNotifications = sortedNotifications.filter((n) => {
    if (activeFilter === 'waitlist') return n.type === 'position' || n.type === 'status';
    if (activeFilter === 'offers') return n.type === 'offer';
    if (activeFilter === 'applications') return n.type === 'application';
    return true;
  });

  // Where you stand list (applications not Draft / Withdrawn)
  const activeStandingApps = applications.filter(
    (a) => a.status !== 'Draft' && a.status !== 'Withdrawn'
  );

  // Next steps calculation
  const step1Done = applications.length > 0;
  const step2Done = !applications.some((a) => a.status === 'Draft');
  const step3Done = applications.some((a) => a.status !== 'Draft' && a.status !== 'Withdrawn');
  const step4Done = !applications.some((a) => a.status === 'Offer');
  const stepsDoneCount = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;

  return (
    <div className="space-y-8">
      {/* 1. Header row with PageHeader and GhostButton */}
      <PageHeader
        eyebrow="Parent companion"
        title="A little more in the loop."
        subtitle="Updates, conversations and gentle reminders for your care journey."
        action={
          <GhostButton onClick={onMarkAllAsRead}>
            ✓ Mark all as read
          </GhostButton>
        }
      />

      {/* 2. Two columns on lg (left lg:col-span-2, right 1), stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT COLUMN (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sage card above the feed */}
          <div className="rounded-2xl bg-cq-sage border border-cq-sage-line-2 p-6 flex items-center gap-4 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 text-cq-sage-ink shadow-xs">
              <Heart className="w-5 h-5 fill-cq-sage-ink/20" />
            </div>
            <div>
              <h3 className="font-bold text-cq-ink text-base">
                Parents &amp; centres, connected.
              </h3>
              <p className="text-xs text-cq-muted mt-0.5">
                Sample activity from your demo workspace.
              </p>
            </div>
          </div>

          {/* Latest updates feed card */}
          <Card className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-cq-line">
              <h2 className="text-base font-bold text-cq-ink">Latest updates</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cq-page text-cq-soft border border-cq-line">
                Simulated data
              </span>
            </div>

            {/* Feed filters as underline text tabs */}
            <div className="flex items-center gap-6 text-sm border-b border-cq-line -mt-2">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                  activeFilter === 'all'
                    ? 'text-cq-ink font-semibold border-cq-ink'
                    : 'text-cq-muted hover:text-cq-ink border-transparent'
                }`}
              >
                All updates
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('waitlist')}
                className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                  activeFilter === 'waitlist'
                    ? 'text-cq-ink font-semibold border-cq-ink'
                    : 'text-cq-muted hover:text-cq-ink border-transparent'
                }`}
              >
                Waitlist
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('offers')}
                className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                  activeFilter === 'offers'
                    ? 'text-cq-ink font-semibold border-cq-ink'
                    : 'text-cq-muted hover:text-cq-ink border-transparent'
                }`}
              >
                Offers
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('applications')}
                className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                  activeFilter === 'applications'
                    ? 'text-cq-ink font-semibold border-cq-ink'
                    : 'text-cq-muted hover:text-cq-ink border-transparent'
                }`}
              >
                Applications
              </button>
            </div>

            {/* Notification items */}
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-cq-soft">
                No updates yet. When a centre changes your status, it shows up here.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notif) => {
                  const isUnread = !notif.read;
                  const itemIcon =
                    notif.type === 'position'
                      ? TrendingUp
                      : notif.type === 'offer'
                      ? Gift
                      : notif.type === 'application'
                      ? FileText
                      : Bell;

                  const itemHeadline =
                    notif.type === 'position'
                      ? 'Queue position update'
                      : notif.type === 'offer'
                      ? 'Spot offer received'
                      : notif.type === 'application'
                      ? 'Application updated'
                      : 'Centre message';

                  return (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-xl border border-cq-line bg-white transition-all flex items-start gap-4 ${
                        isUnread
                          ? 'border-l-[3px] border-l-cq-sage-ink bg-cq-sage/15'
                          : 'hover:border-cq-stone-300'
                      }`}
                    >
                      <IconTile icon={itemIcon} tone="sage" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cq-soft">
                            {notif.type} · Simulated · {notif.timestamp}
                          </span>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cq-sage-ink inline-block shrink-0" />
                          )}
                        </div>
                        <h4 className="text-[15px] font-bold text-cq-ink mt-0.5">
                          {itemHeadline}
                        </h4>
                        <p className="text-sm text-cq-muted mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => onMarkAsRead(notif.id)}
                          className="shrink-0 text-xs font-semibold text-cq-sage-ink hover:underline transition-colors cursor-pointer self-start mt-1"
                        >
                          Mark as read ✓
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Where you stand */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cq-line">
              <h2 className="text-base font-bold text-cq-ink">Where you stand</h2>
              <button
                type="button"
                onClick={() => onNavigate('track')}
                className="text-xs font-semibold text-cq-brand hover:underline flex items-center gap-1 transition-colors cursor-pointer"
              >
                Open in Track <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeStandingApps.length === 0 ? (
              <p className="text-sm text-cq-muted py-4">
                No submitted applications yet. Look through verified centres to submit an application.
              </p>
            ) : (
              <div className="space-y-3">
                {activeStandingApps.map((app) => {
                  const centre = centres.find((c) => c.id === app.centreId);
                  const centreName = centre?.name || 'Child Care Centre';

                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl border border-cq-line bg-cq-input flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-sm font-bold text-cq-ink">{centreName}</h3>
                          <StatusBadge
                            status={app.status}
                            waitlistPosition={app.waitlistPosition}
                            size="sm"
                          />
                        </div>

                        {/* Position & Estimate text */}
                        <div className="text-xs text-cq-muted space-y-0.5">
                          {app.waitlistPosition ? (
                            <p className="font-medium text-cq-ink">
                              #{app.waitlistPosition} · {reportedLine(app.waitlistReportedBy || centreName, app.waitlistReportedDate || 'recently')}
                            </p>
                          ) : (
                            <p className="text-cq-soft">
                              Position not provided by the centre
                            </p>
                          )}

                          {app.waitlistEstimate ? (
                            <p className="text-cq-soft italic">
                              {estimateLine(app.waitlistEstimate)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate('track')}
                        className="self-start sm:self-auto text-xs font-semibold text-cq-brand hover:underline transition-colors cursor-pointer shrink-0"
                      >
                        Open in Track →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN (lg:col-span-1) */}
        <div className="space-y-6">
          {/* Card: Your next little steps */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-cq-ink">Your next little steps</h2>
              <span className="text-xs font-semibold text-cq-muted">{stepsDoneCount}/4</span>
            </div>

            {/* Thin progress bar */}
            <div className="w-full bg-cq-line rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cq-brand h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(stepsDoneCount / 4) * 100}%` }}
              />
            </div>

            {/* Four automatic steps */}
            <div className="space-y-2 pt-1">
              {/* Step A */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-cq-page transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      step1Done ? 'bg-cq-sage-ink text-white' : 'border border-cq-line'
                    }`}
                  >
                    {step1Done && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      step1Done ? 'line-through text-cq-faint' : 'text-cq-ink font-medium'
                    }`}
                  >
                    Find a few places you love
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('find')}
                  className="text-xs text-cq-brand hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  Find
                </button>
              </div>

              {/* Step B */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-cq-page transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      step2Done ? 'bg-cq-sage-ink text-white' : 'border border-cq-line'
                    }`}
                  >
                    {step2Done && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      step2Done ? 'line-through text-cq-faint' : 'text-cq-ink font-medium'
                    }`}
                  >
                    Finish your drafts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('apply')}
                  className="text-xs text-cq-brand hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  Drafts
                </button>
              </div>

              {/* Step C */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-cq-page transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      step3Done ? 'bg-cq-sage-ink text-white' : 'border border-cq-line'
                    }`}
                  >
                    {step3Done && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      step3Done ? 'line-through text-cq-faint' : 'text-cq-ink font-medium'
                    }`}
                  >
                    Send your first application
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('apply')}
                  className="text-xs text-cq-brand hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {/* Step D */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-cq-page transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      step4Done ? 'bg-cq-sage-ink text-white' : 'border border-cq-line'
                    }`}
                  >
                    {step4Done && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      step4Done ? 'line-through text-cq-faint' : 'text-cq-ink font-medium'
                    }`}
                  >
                    Answer your offers
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('track')}
                  className="text-xs text-cq-brand hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  Offers
                </button>
              </div>
            </div>

            <p className="text-xs text-cq-soft pt-1">At your pace. One step at a time.</p>
          </Card>

          {/* Card: Gentle reminders */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-cq-line">
              <CalendarDays className="w-4 h-4 text-cq-sage-ink" />
              <h2 className="text-base font-bold text-cq-ink">Gentle reminders</h2>
            </div>

            {/* Input + optional date + button */}
            <form onSubmit={handleAddReminder} className="space-y-2.5">
              <input
                type="text"
                placeholder="What would you like to remember?"
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-cq-line-input bg-cq-input text-cq-ink-body placeholder:text-cq-faint focus:outline-none focus:ring-2 focus:ring-cq-brand/20 focus:border-cq-brand"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Optional date (e.g., Nov 15)"
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-cq-line-input bg-cq-input text-cq-ink-body placeholder:text-cq-faint focus:outline-none focus:ring-2 focus:ring-cq-brand/20 focus:border-cq-brand"
                />
                <button
                  type="submit"
                  disabled={!newReminderText.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-cq-brand text-white rounded-xl hover:bg-cq-brand-hover disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </form>

            {/* Reminders list */}
            {reminders.length === 0 ? (
              <p className="text-xs text-cq-soft italic py-2">No active reminders.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className={`flex items-start justify-between gap-2 p-2.5 rounded-xl border transition-colors ${
                      rem.completed
                        ? 'bg-cq-page border-cq-line text-cq-faint'
                        : 'bg-white border-cq-line text-cq-ink-body'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 min-w-0 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rem.completed}
                        onChange={() => handleToggleReminder(rem.id)}
                        className="mt-0.5 rounded border-cq-line-input text-cq-brand focus:ring-cq-brand cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-xs leading-snug ${
                            rem.completed ? 'line-through text-cq-faint' : 'text-cq-ink'
                          }`}
                        >
                          {rem.text}
                        </p>
                        {rem.date && (
                          <span className="text-xs text-cq-soft block mt-0.5">
                            Due {rem.date}
                          </span>
                        )}
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveReminder(rem.id)}
                      className="text-cq-soft hover:text-cq-rose-500 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                      title="Remove reminder"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-cq-soft pt-1">Only on this page · No notifications sent</p>
          </Card>

          {/* Centred quote under right column: Sparkles (#C9B98A) then "One little step / at your family's pace." */}
          <div className="pt-6 text-center space-y-2 select-none">
            <Sparkles className="w-5 h-5 text-cq-sand-400 mx-auto" />
            <p className="text-xl text-cq-faint font-medium leading-relaxed">
              One little step
              <br />
              at your family's pace.
            </p>
          </div>
        </div>
      </div>

      {/* Footer SimNote */}
      <div className="pt-4 border-t border-cq-line">
        <SimNote>
          No live centre feed is connected. These updates come from sample data and your actions.
        </SimNote>
      </div>
    </div>
  );
};
