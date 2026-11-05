import React, { useState } from 'react';
import {
  ParentProfile,
  Application,
  Centre,
  InAppNotification,
} from '../../data/mockData';
import { StatusBadge } from '../StatusBadge';
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
} from 'lucide-react';

interface ParentHomeProps {
  parentProfile: ParentProfile;
  applications: Application[];
  centres: Centre[];
  notifications: InAppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (tab: 'home' | 'find' | 'apply' | 'track' | 'help') => void;
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

  // 1. "Needs you" strip determination
  const offerApp = applications.find((a) => a.status === 'Offer');
  const offerCentre = offerApp
    ? centres.find((c) => c.id === offerApp.centreId)?.name || 'Centre'
    : '';

  const draftApps = applications.filter((a) => a.status === 'Draft');
  const draftCount = draftApps.length;

  // 2. Stat counts
  const sentCount = applications.filter(
    (a) => a.status !== 'Draft' && a.status !== 'Withdrawn'
  ).length;
  const waitlistCount = applications.filter((a) => a.status === 'Waitlisted').length;
  const offersCount = applications.filter((a) => a.status === 'Offer').length;

  // 3. Filtered notifications (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => b.createdAt - a.createdAt);
  const filteredNotifications = sortedNotifications.filter((n) => {
    if (activeFilter === 'waitlist') return n.type === 'position' || n.type === 'status';
    if (activeFilter === 'offers') return n.type === 'offer';
    if (activeFilter === 'applications') return n.type === 'application';
    return true;
  });

  // 4. "Where you stand" list (applications not Draft / Withdrawn)
  const activeStandingApps = applications.filter(
    (a) => a.status !== 'Draft' && a.status !== 'Withdrawn'
  );

  // 5. Next steps calculation
  const step1Done = applications.length > 0;
  const step2Done = !applications.some((a) => a.status === 'Draft');
  const step3Done = applications.some((a) => a.status !== 'Draft' && a.status !== 'Withdrawn');
  const step4Done = !applications.some((a) => a.status === 'Offer');
  const stepsDoneCount = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* 1. Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <p className="text-[11px] tracking-[0.18em] font-semibold text-stone-500 uppercase">
            A LITTLE SUPPORT, EVERY DAY
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0B4A52] mt-1">
            You've got a companion.
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            A calm home for updates, reminders, and your next little steps.
          </p>
        </div>

        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="self-start sm:self-auto px-4 py-2 text-xs font-semibold text-[#0B4A52] bg-white border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
        >
          ✓ Mark all as read
        </button>
      </div>

      {/* 2. "Needs you" strip */}
      {offerApp ? (
        <div className="rounded-2xl border border-[#F9BE2F]/40 border-l-4 border-l-[#F9BE2F] bg-[#F9BE2F]/15 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F9BE2F] animate-pulse shrink-0" />
            <p className="text-sm font-medium text-stone-900">
              <span className="font-semibold text-[#0B4A52]">{offerCentre}</span> has offered{' '}
              <span className="font-semibold">{parentProfile.childName}</span> a spot.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('track')}
            className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-[#451A03] bg-[#F9BE2F] hover:bg-[#eab327] rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            Review offer
          </button>
        </div>
      ) : draftCount > 0 ? (
        <div className="rounded-2xl border border-[#F9BE2F]/40 border-l-4 border-l-[#F9BE2F] bg-[#F9BE2F]/15 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F9BE2F] shrink-0" />
            <p className="text-sm font-medium text-stone-900">
              <span className="font-semibold">{draftCount}</span> application
              {draftCount === 1 ? '' : 's'} waiting for you to finish.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('apply')}
            className="self-start sm:self-auto px-4 py-2 text-xs font-semibold text-[#0B4A52] bg-white border border-stone-300 hover:bg-stone-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-stone-100/70 p-5">
          <p className="text-sm text-stone-600">
            Nothing needs you today. We'll let you know when a centre updates you.
          </p>
        </div>
      )}

      {/* 3. Four small stat tiles in one row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
          <div className="text-2xl font-semibold text-[#0B4A52]">{sentCount}</div>
          <div className="text-xs text-stone-500 mt-1">Applications sent</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
          <div className="text-2xl font-semibold text-[#0B4A52]">{waitlistCount}</div>
          <div className="text-xs text-stone-500 mt-1">On a waitlist</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
          <div className="text-2xl font-semibold text-[#0B4A52]">{offersCount}</div>
          <div className="text-xs text-stone-500 mt-1">Offers</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
          <div className="text-2xl font-semibold text-[#0B4A52]">{draftCount}</div>
          <div className="text-xs text-stone-500 mt-1">Drafts</div>
        </div>
      </div>

      {/* 4. Two columns on lg (left lg:col-span-2, right 1), stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Latest updates */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h2 className="text-base font-semibold text-[#0B4A52]">Latest updates</h2>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
                Simulated data
              </span>
            </div>

            {/* Filter text-tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#0B4A52] text-white font-medium'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                All updates
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('waitlist')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'waitlist'
                    ? 'bg-[#0B4A52] text-white font-medium'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Waitlist
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('offers')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'offers'
                    ? 'bg-[#0B4A52] text-white font-medium'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Offers
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('applications')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'applications'
                    ? 'bg-[#0B4A52] text-white font-medium'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Applications
              </button>
            </div>

            {/* Notification items */}
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-stone-500">
                No updates yet. When a centre changes your status, it shows up here.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredNotifications.map((notif) => {
                  const isUnread = !notif.read;
                  return (
                    <div
                      key={notif.id}
                      className={`py-3.5 px-3 transition-colors rounded-xl flex items-start gap-3.5 ${
                        isUnread
                          ? 'border-l-[3px] border-[#45B5A5] bg-[#45B5A5]/5'
                          : 'hover:bg-stone-50'
                      }`}
                    >
                      {/* Soft round icon */}
                      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 mt-0.5 text-stone-600">
                        {notif.type === 'position' ? (
                          <TrendingUp className="w-4 h-4 text-[#45B5A5]" />
                        ) : notif.type === 'offer' ? (
                          <Gift className="w-4 h-4 text-[#F9BE2F]" />
                        ) : notif.type === 'application' ? (
                          <FileText className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Bell className="w-4 h-4 text-stone-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-stone-400 capitalize">
                            {notif.type} · {notif.timestamp}
                          </span>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#45B5A5] inline-block shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-stone-800 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => onMarkAsRead(notif.id)}
                          className="shrink-0 text-xs font-medium text-[#45B5A5] hover:text-[#0B4A52] hover:underline transition-colors cursor-pointer"
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

          {/* Card: Where you stand */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h2 className="text-base font-semibold text-[#0B4A52]">Where you stand</h2>
              <button
                type="button"
                onClick={() => onNavigate('track')}
                className="text-xs font-semibold text-[#45B5A5] hover:text-[#0B4A52] flex items-center gap-1 transition-colors cursor-pointer"
              >
                Open in Track <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeStandingApps.length === 0 ? (
              <p className="text-sm text-stone-500 py-4">
                No submitted applications yet. Look through verified centres to submit an application.
              </p>
            ) : (
              <div className="space-y-3.5">
                {activeStandingApps.map((app) => {
                  const centre = centres.find((c) => c.id === app.centreId);
                  const centreName = centre?.name || 'Child Care Centre';

                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-stone-900">{centreName}</h3>
                          <StatusBadge
                            status={app.status}
                            waitlistPosition={app.waitlistPosition}
                            size="sm"
                          />
                        </div>

                        {/* Position & Estimate text */}
                        <div className="text-xs text-stone-600 space-y-0.5">
                          {app.waitlistPosition ? (
                            <p className="font-medium text-stone-800">
                              #{app.waitlistPosition} · reported by{' '}
                              {app.waitlistReportedBy || centreName} on{' '}
                              {app.waitlistReportedDate || 'recently'}
                            </p>
                          ) : (
                            <p className="text-stone-500">
                              Position not provided by the centre
                            </p>
                          )}

                          {app.waitlistEstimate ? (
                            <p className="text-stone-500 italic">
                              Centre's estimate: {app.waitlistEstimate} (not a guarantee)
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate('track')}
                        className="self-start sm:self-auto text-xs font-medium text-[#0B4A52] hover:text-[#45B5A5] underline transition-colors cursor-pointer shrink-0"
                      >
                        Open in Track →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (lg:col-span-1) */}
        <div className="space-y-6">
          {/* Card: Your next little steps */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0B4A52]">Your next little steps</h2>
              <span className="text-xs font-semibold text-stone-500">{stepsDoneCount}/4</span>
            </div>

            {/* Thin #45B5A5 progress bar */}
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#45B5A5] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(stepsDoneCount / 4) * 100}%` }}
              />
            </div>

            {/* Four automatic steps */}
            <div className="space-y-2.5 pt-1">
              {/* Step A */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      step1Done ? 'bg-[#45B5A5] text-white' : 'border border-stone-300'
                    }`}
                  >
                    {step1Done && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      step1Done ? 'line-through text-stone-400' : 'text-stone-700 font-medium'
                    }`}
                  >
                    Find a few places you love
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('find')}
                  className="text-xs text-[#0B4A52] hover:text-[#45B5A5] font-semibold underline shrink-0 cursor-pointer"
                >
                  Find
                </button>
              </div>

              {/* Step B */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      step2Done ? 'bg-[#45B5A5] text-white' : 'border border-stone-300'
                    }`}
                  >
                    {step2Done && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      step2Done ? 'line-through text-stone-400' : 'text-stone-700 font-medium'
                    }`}
                  >
                    Finish your drafts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('apply')}
                  className="text-xs text-[#0B4A52] hover:text-[#45B5A5] font-semibold underline shrink-0 cursor-pointer"
                >
                  Drafts
                </button>
              </div>

              {/* Step C */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      step3Done ? 'bg-[#45B5A5] text-white' : 'border border-stone-300'
                    }`}
                  >
                    {step3Done && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      step3Done ? 'line-through text-stone-400' : 'text-stone-700 font-medium'
                    }`}
                  >
                    Send your first application
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('apply')}
                  className="text-xs text-[#0B4A52] hover:text-[#45B5A5] font-semibold underline shrink-0 cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {/* Step D */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      step4Done ? 'bg-[#45B5A5] text-white' : 'border border-stone-300'
                    }`}
                  >
                    {step4Done && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      step4Done ? 'line-through text-stone-400' : 'text-stone-700 font-medium'
                    }`}
                  >
                    Answer your offers
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('track')}
                  className="text-xs text-[#0B4A52] hover:text-[#45B5A5] font-semibold underline shrink-0 cursor-pointer"
                >
                  Offers
                </button>
              </div>
            </div>

            <p className="text-xs text-stone-400 pt-1">At your pace. One step at a time.</p>
          </div>

          {/* Card: Gentle reminders */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-stone-100">
              <CalendarDays className="w-4 h-4 text-[#45B5A5]" />
              <h2 className="text-base font-semibold text-[#0B4A52]">Gentle reminders</h2>
            </div>

            {/* Input + optional date + button */}
            <form onSubmit={handleAddReminder} className="space-y-2.5">
              <input
                type="text"
                placeholder="What would you like to remember?"
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5] bg-stone-50/50"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Optional date (e.g., Nov 15)"
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5] bg-stone-50/50"
                />
                <button
                  type="submit"
                  disabled={!newReminderText.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#0B4A52] text-white rounded-xl hover:bg-[#08353b] disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </form>

            {/* Reminders list */}
            {reminders.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No active reminders.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className={`flex items-start justify-between gap-2 p-2.5 rounded-xl border transition-colors ${
                      rem.completed
                        ? 'bg-stone-50/60 border-stone-100 text-stone-400'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 min-w-0 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rem.completed}
                        onChange={() => handleToggleReminder(rem.id)}
                        className="mt-0.5 rounded border-stone-300 text-[#45B5A5] focus:ring-[#45B5A5] cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-xs leading-snug ${
                            rem.completed ? 'line-through text-stone-400' : 'text-stone-800'
                          }`}
                        >
                          {rem.text}
                        </p>
                        {rem.date && (
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            Due {rem.date}
                          </span>
                        )}
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveReminder(rem.id)}
                      className="text-stone-400 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                      title="Remove reminder"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-stone-400 pt-1">Only on this page · No notifications sent</p>
          </div>
        </div>
      </div>
    </div>
  );
};
