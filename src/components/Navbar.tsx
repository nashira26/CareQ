import React from 'react';
import { Lock, LogOut } from 'lucide-react';
import { ParentProfile, Centre, InAppNotification } from '../data/mockData';
import { LogoFull, LogoMark } from './Logo';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  currentRole: 'parent' | 'centre';
  parentProfile: ParentProfile;
  singleCentre: Centre;
  notifications: InAppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: (role: 'parent' | 'centre') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  parentProfile,
  singleCentre,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onLogout,
}) => {
  const parentInitials =
    parentProfile.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'P';

  const centreInitials =
    singleCentre.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'C';

  return (
    <header className="bg-white border-b border-[#E7E4DA] sticky top-0 z-40 h-[72px] flex items-center">
      <div className="max-w-[1180px] w-full mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
        {/* Left: Logo (mobile/tablet only) + Portal Tag & subtitle */}
        <div className="flex items-center gap-3">
          {/* Header logo hidden on lg */}
          <div className="flex items-center lg:hidden mr-1">
            <LogoFull size={34} className="hidden sm:inline-flex" />
            <LogoMark size={30} className="inline-flex sm:hidden" />
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-[#CFE0E6] bg-[#E8F1F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3F6E7E]">
                {currentRole === 'parent' ? 'Parent portal' : 'Centre portal'}
              </span>
            </div>
            <p className="text-[11px] text-[#7A8A84] mt-0.5 hidden sm:block">
              Ontario Licensed Child Care Queue &amp; Communication System
            </p>
          </div>
        </div>

        {/* Right side order:
            1. Lock icon + "Prototype"
            2. NotificationBell
            3. 1px divider h-8
            4. Avatar circle w-9 h-9 with initials
            5. Name text-xs font-bold + sub-line
            6. Log out as GhostButton size h-9 text-xs */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* 1. Lock icon + Prototype */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#7A8A84] font-medium">
            <Lock className="w-3.5 h-3.5 text-[#7A8A84]" />
            <span>Prototype</span>
          </div>

          {/* 2. Notification Bell */}
          <NotificationBell
            notifications={notifications}
            currentRole={currentRole}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
          />

          {/* 3. 1px divider h-8 */}
          <div className="h-8 w-px bg-[#E7E4DA]" />

          {/* 4 & 5. Avatar and Name/Sub-line */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#E4ECE1] text-[#4E7A5A] text-xs font-bold flex items-center justify-center shrink-0">
              {currentRole === 'parent' ? parentInitials : centreInitials}
            </div>

            <div className="text-left text-xs hidden sm:block">
              <div className="font-bold text-[#173F42] leading-tight">
                {currentRole === 'parent' ? parentProfile.name : singleCentre.name}
              </div>
              <div className="text-[11px] text-[#7A8A84]">
                {currentRole === 'parent'
                  ? `Parent demo · ${parentProfile.childName}`
                  : singleCentre.demoKind === 'open-data'
                  ? 'Simulated demo account'
                  : 'Centre demo · Simulated staff account'}
              </div>
            </div>
          </div>

          {/* 6. Log out as GhostButton size h-9 text-xs */}
          <button
            type="button"
            onClick={onLogout}
            className="h-9 px-3 rounded-xl border border-[#E7E4DA] bg-white text-xs font-semibold text-[#173F42] hover:bg-[#FAF9F4] transition-colors inline-flex items-center gap-1.5 cursor-pointer ml-1"
            title="Log out of session"
          >
            <LogOut className="w-3.5 h-3.5 text-[#5B6B66]" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
