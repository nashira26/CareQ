import React, { useState } from 'react';
import {
  ParentProfile,
  Application,
  Centre,
  InAppNotification,
} from '../../data/mockData';
import {
  TrendingUp,
  Gift,
  FileText,
  Bell,
  Check,
  ArrowRight,
  Plus,
  X,
  Calendar,
  Sparkles,
  Search,
} from 'lucide-react';

interface HomeTabProps {
  parentProfile: ParentProfile;
  applications: Application[];
  centres: Centre[];
  notifications: InAppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (tab: 'home' | 'find' | 'apply' | 'track' | 'help') => void;
}

interface Reminder {
  id: string;
  text: string;
  date?: string;
  completed: boolean;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  parentProfile,
  applications,
  centres,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}) => {
  // Filter pill state for Latest Updates: 'All' | 'Waitlist' | 'Offers' | 'Applications'
  const [filterType, setFilterType] = useState<'All' | 'Waitlist' | 'Offers' | 'Applications'>('All');

  // Reminders in local useState only
  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: 'rem-1',
      text: "Upload Anya's updated immunization record",
      date: 'Nov 10',
      completed: false,
    },
    {
      id: 'rem-2',
      text: 'Follow up with Riverdale intake committee',
      date: 'Nov 15',
      completed: false,
    },
  ]);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');

  // Notifications sorted newest first by createdAt
  const sortedNotifications = [...notifications].sort((a, b) => b.createdAt - a.createdAt);

  // Filtered notifications
  const filteredNotifications = sortedNotifications.filter((n) => {
    if (filterType === 'All') return true;
    if (filterType === 'Waitlist') return n.type === 'position' || n.type === 'status';
    if (filterType === 'Offers') return n.type === 'offer';
    if (filterType === 'Applications') return n.type === 'application';
    return true;
  });

  // Calculate Next Steps
  // a) "Find centres that fit" – done if any application exists
  const step1Done = applications.length > 0;

  // b) "Finish your drafts" – done if no application has status 'Draft'
  const step2Done = applications.length > 0 && !applications.some((a) => a.status === 'Draft');

  // c) "Send your first application" – done if any status is not 'Draft'
  const step3Done = applications.some((a) => a.status !== 'Draft');

  // d) "Respond to offers" – done if no status is 'Offer'
  const step4Done = !applications.some((a) => a.status === 'Offer');

  const stepsCompletedCount = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;
  const progressPercent = Math.round((stepsCompletedCount / 4) * 100);

  // At a glance calculations
  const applicationsSentCount = applications.filter((a) => a.status !== 'Draft').length;
  const onWaitlistCount = applications.filter((a) => a.status === 'Waitlisted').length;
  const offersCount = applications.filter((a) => a.status === 'Offer').length;

  // Best waitlist position
  const waitlistedApps = applications.filter((a) => a.status === 'Waitlisted');
  let bestWaitlistApp: Application | null = null;
  for (const app of waitlistedApps) {
    if (typeof app.waitlistPosition === 'number' && app.waitlistPosition > 0) {
      if (!bestWaitlistApp || (bestWaitlistApp.waitlistPosition && app.waitlistPosition < bestWaitlistApp.waitlistPosition)) {
        bestWaitlistApp = app;
      }
    }
  }

  const bestCentreName = bestWaitlistApp
    ? centres.find((c) => c.id === bestWaitlistApp!.centreId)?.name || 'Centre'
    : '';

  // Reminder handlers
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;

    const newRem: Reminder = {
      id: `rem-${Date.now()}`,
      text: newReminderText.trim(),
      date: newReminderDate.trim() || undefined,
      completed: false,
    };
    setReminders((prev) => [...prev, newRem]);
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

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#45B5A5]">
            YOUR FAMILY SPACE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight mt-0.5">
            Hi {parentProfile.name}, here's where things stand.
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Updates from your centres, your next steps, and your own reminders.
          </p>
        </div>

        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="self-start sm:self-center px-3.5 py-1.5 rounded-xl border border-stone-300 hover:border-[#45B5A5] text-xs font-semibold text-[#0B4A52] hover:bg-white bg-white/60 transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
        >
          <span>✓ Mark all as read</span>
        </button>
      </div>

      {/* Two columns on desktop (~2/3 left, ~1/3 right), stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN – Latest updates card (~2/3) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-stone-900 tracking-tight">
              Latest updates
            </h2>

            {/* Filter pills: All · Waitlist · Offers · Applications */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs font-medium overflow-x-auto">
              {(['All', 'Waitlist', 'Offers', 'Applications'] as const).map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setFilterType(pill)}
                  className={`px-3 py-1 rounded-md transition-colors text-xs cursor-pointer ${
                    filterType === pill
                      ? 'bg-white text-[#0B4A52] font-bold shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Updates List */}
          {filteredNotifications.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Bell className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
                No updates yet. When a centre changes your status, it will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredNotifications.map((notif) => {
                // Determine icon
                let IconComponent = Bell;
                let iconColor = 'text-stone-600 bg-stone-100';

                if (notif.type === 'position') {
                  IconComponent = TrendingUp;
                  iconColor = 'text-[#0B4A52] bg-[#45B5A5]/20';
                } else if (notif.type === 'offer') {
                  IconComponent = Gift;
                  iconColor = 'text-[#451A03] bg-[#F9BE2F]/30';
                } else if (notif.type === 'application') {
                  IconComponent = FileText;
                  iconColor = 'text-teal-800 bg-teal-100';
                }

                const isUnread = !notif.read;

                return (
                  <div
                    key={notif.id}
                    className={`py-3.5 px-3 transition-colors rounded-lg flex items-start gap-3 my-1 ${
                      isUnread
                        ? 'border-l-[3px] border-l-[#45B5A5] bg-[#F0FDFA]/50 hover:bg-[#F0FDFA]'
                        : 'border-l-[3px] border-l-transparent hover:bg-stone-50/80'
                    }`}
                  >
                    {/* Icon in soft circle */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconColor}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Tiny grey label: {type} · {timestamp} */}
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-400 capitalize">
                        <span>{notif.type || 'Update'}</span>
                        <span>·</span>
                        <span>{notif.timestamp}</span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#45B5A5] inline-block ml-1" />
                        )}
                      </div>

                      {/* Main message text */}
                      <p className={`text-xs sm:text-sm mt-0.5 leading-relaxed ${isUnread ? 'text-stone-900 font-semibold' : 'text-stone-700'}`}>
                        {notif.message}
                      </p>
                    </div>

                    {/* Mark as read link */}
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(notif.id)}
                        className="text-[11px] font-semibold text-[#0B4A52] hover:text-[#45B5A5] shrink-0 pt-1 cursor-pointer transition-colors"
                      >
                        Mark as read ✓
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN – 3 Cards (~1/3) */}
        <div className="space-y-5">
          {/* CARD 1: Your next steps */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900 tracking-tight">
                Your next steps
              </h2>
              <span className="text-xs font-bold text-[#0B4A52] bg-[#45B5A5]/15 px-2 py-0.5 rounded-full">
                {stepsCompletedCount}/4
              </span>
            </div>

            {/* Thin #45B5A5 progress bar */}
            <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#45B5A5] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* 4 Automatic Steps */}
            <div className="space-y-2.5 text-xs">
              {/* Step A */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50/60 border border-stone-100">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${
                      step1Done ? 'bg-[#45B5A5]' : 'border border-stone-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span
                    className={
                      step1Done
                        ? 'line-through text-stone-400'
                        : 'text-stone-800 font-medium'
                    }
                  >
                    Find centres that fit
                  </span>
                </div>
                {!step1Done && (
                  <button
                    type="button"
                    onClick={() => onNavigate('find')}
                    className="px-2 py-0.5 text-[11px] font-bold bg-[#0B4A52] hover:bg-[#08383e] text-white rounded-md transition-colors cursor-pointer"
                  >
                    Find
                  </button>
                )}
              </div>

              {/* Step B */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50/60 border border-stone-100">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${
                      step2Done ? 'bg-[#45B5A5]' : 'border border-stone-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span
                    className={
                      step2Done
                        ? 'line-through text-stone-400'
                        : 'text-stone-800 font-medium'
                    }
                  >
                    Finish your drafts
                  </span>
                </div>
                {!step2Done && (
                  <button
                    type="button"
                    onClick={() => onNavigate('apply')}
                    className="px-2 py-0.5 text-[11px] font-bold bg-[#0B4A52] hover:bg-[#08383e] text-white rounded-md transition-colors cursor-pointer"
                  >
                    Review
                  </button>
                )}
              </div>

              {/* Step C */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50/60 border border-stone-100">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${
                      step3Done ? 'bg-[#45B5A5]' : 'border border-stone-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span
                    className={
                      step3Done
                        ? 'line-through text-stone-400'
                        : 'text-stone-800 font-medium'
                    }
                  >
                    Send your first application
                  </span>
                </div>
                {!step3Done && (
                  <button
                    type="button"
                    onClick={() => onNavigate('apply')}
                    className="px-2 py-0.5 text-[11px] font-bold bg-[#0B4A52] hover:bg-[#08383e] text-white rounded-md transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                )}
              </div>

              {/* Step D */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50/60 border border-stone-100">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${
                      step4Done ? 'bg-[#45B5A5]' : 'border border-stone-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span
                    className={
                      step4Done
                        ? 'line-through text-stone-400'
                        : 'text-stone-800 font-medium'
                    }
                  >
                    Respond to offers
                  </span>
                </div>
                {!step4Done && (
                  <button
                    type="button"
                    onClick={() => onNavigate('track')}
                    className="px-2 py-0.5 text-[11px] font-bold bg-[#F9BE2F] hover:bg-[#e0a31a] text-[#451A03] rounded-md transition-colors cursor-pointer"
                  >
                    Offers
                  </button>
                )}
              </div>
            </div>

            {/* Footer line */}
            <p className="text-[11px] text-stone-400 text-center pt-1 border-t border-stone-100">
              At your pace. One step at a time.
            </p>
          </div>

          {/* CARD 2: At a glance */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 tracking-tight">
              At a glance
            </h2>

            {/* Three small numbers */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                <div className="text-lg font-bold text-[#0B4A52]">
                  {applicationsSentCount}
                </div>
                <div className="text-[10px] text-stone-500 font-medium leading-tight mt-0.5">
                  Applications sent
                </div>
              </div>

              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                <div className="text-lg font-bold text-[#0B4A52]">
                  {onWaitlistCount}
                </div>
                <div className="text-[10px] text-stone-500 font-medium leading-tight mt-0.5">
                  On a waitlist
                </div>
              </div>

              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                <div className="text-lg font-bold text-[#451A03]">
                  {offersCount}
                </div>
                <div className="text-[10px] text-stone-500 font-medium leading-tight mt-0.5">
                  Offers
                </div>
              </div>
            </div>

            {/* Best position info */}
            <div className="p-2.5 rounded-lg bg-teal-50/60 border border-[#45B5A5]/30 text-xs">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-0.5">
                Current Best Position
              </span>
              {bestWaitlistApp && bestWaitlistApp.waitlistPosition ? (
                <p className="text-stone-800 font-medium leading-tight">
                  #{bestWaitlistApp.waitlistPosition} at {bestCentreName} · reported by{' '}
                  {bestWaitlistApp.waitlistReportedBy || bestCentreName} on{' '}
                  {bestWaitlistApp.waitlistReportedDate || 'recently'}
                </p>
              ) : (
                <p className="text-stone-500 italic">
                  Position not provided by the centre
                </p>
              )}
            </div>

            {/* Link to Track */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => onNavigate('track')}
                className="text-xs font-semibold text-[#0B4A52] hover:text-[#45B5A5] inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>See all in Track</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD 3: My reminders */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-3.5">
            <h2 className="text-sm font-bold text-stone-900 tracking-tight">
              My reminders
            </h2>

            {/* Reminders List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
              {reminders.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2 text-center">
                  No reminders added yet.
                </p>
              ) : (
                reminders.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100 text-xs group"
                  >
                    <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={r.completed}
                        onChange={() => handleToggleReminder(r.id)}
                        className="mt-0.5 w-3.5 h-3.5 rounded text-[#0B4A52] focus:ring-[#45B5A5] border-stone-300 shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          className={`block leading-snug break-words ${
                            r.completed
                              ? 'line-through text-stone-400'
                              : 'text-stone-800 font-medium'
                          }`}
                        >
                          {r.text}
                        </span>
                        {r.date && (
                          <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {r.date}
                          </span>
                        )}
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveReminder(r.id)}
                      className="text-stone-300 hover:text-rose-600 transition-colors p-0.5 shrink-0"
                      title="Remove reminder"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Reminder Form */}
            <form onSubmit={handleAddReminder} className="space-y-2 pt-1 border-t border-stone-100">
              <input
                type="text"
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                placeholder="Add a quick reminder..."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 focus:outline-hidden focus:ring-1 focus:ring-[#45B5A5] focus:border-[#45B5A5]"
              />

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  placeholder="Date (e.g. Nov 15)"
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 focus:outline-hidden focus:ring-1 focus:ring-[#45B5A5] focus:border-[#45B5A5]"
                />

                <button
                  type="submit"
                  disabled={!newReminderText.trim()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    newReminderText.trim()
                      ? 'bg-[#0B4A52] hover:bg-[#08383e] text-white cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            {/* Note */}
            <p className="text-[10px] text-stone-400 italic text-center">
              Only on this page · no notifications sent
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
