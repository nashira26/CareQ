import React from 'react';
import { LogOut } from 'lucide-react';
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
    <header className="bg-white border-b border-cq-line sticky top-0 z-40 h-16 lg:h-[68px] flex items-center">
      <div className="max-w-[1180px] w-full mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
        {/* Left: Logo (below lg, where the sidebar is hidden) + portal name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center lg:hidden">
            <LogoFull size={32} className="hidden sm:inline-flex" />
            <LogoMark size={34} className="inline-flex sm:hidden" />
          </div>

          <div className="hidden sm:flex flex-col justify-center min-w-0 sm:pl-3 sm:border-l sm:border-cq-line lg:pl-0 lg:border-0">
            <span className="text-sm font-extrabold text-brand">
              {currentRole === 'parent' ? 'Parent portal' : 'Centre portal'}
            </span>
            <p className="text-xs text-ink-soft hidden md:block truncate">
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
        <div className="flex items-center gap-2 sm:gap-4">
          {/* "Prototype" is already stated in the band above the header */}
          {/* Notification Bell */}
          <NotificationBell
            notifications={notifications}
            currentRole={currentRole}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
          />

          <div className="hidden sm:block h-8 w-px bg-cq-line" />

          {/* Avatar and name */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-mint text-brand text-sm font-extrabold flex items-center justify-center shrink-0">
              {currentRole === 'parent' ? parentInitials : centreInitials}
            </div>

            <div className="text-left text-xs hidden sm:block">
              <div className="font-bold text-cq-ink leading-tight">
                {currentRole === 'parent' ? parentProfile.name : singleCentre.name}
              </div>
              <div className="text-xs text-cq-soft">
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
            className="h-10 w-10 sm:w-auto sm:px-3 rounded-xl border border-line-strong bg-white text-sm font-bold text-brand hover:bg-mint transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer lg:hidden"
            title="Log out of session"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
