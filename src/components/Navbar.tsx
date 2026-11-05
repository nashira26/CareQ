import { User, Building2, LogOut } from 'lucide-react';
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
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">

      {/* Main Navbar Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            {/* Header: <LogoFull /> (~36px tall) on desktop, <LogoMark /> (~32px tall) on small screens */}
            <div className="flex items-center lg:hidden">
              <LogoFull size={36} className="hidden sm:inline-flex" />
              <LogoMark size={32} className="inline-flex sm:hidden" />
            </div>

            <div className="border-l border-stone-200 pl-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase bg-[#0B4A52]/10 text-[#0B4A52] rounded border border-[#0B4A52]/20">
                  {currentRole === 'parent' ? 'Parent Portal' : 'Centre Portal'}
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden md:block">
                Ontario Licensed Child Care Queue & Communication System
              </p>
            </div>
          </div>

          {/* Notification Bell & Active Persona Badge */}
          <div className="flex items-center gap-3">
            <NotificationBell
              notifications={notifications}
              currentRole={currentRole}
              onMarkAsRead={onMarkAsRead}
              onMarkAllAsRead={onMarkAllAsRead}
            />

            {currentRole === 'parent' ? (
              <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-[#45B5A5]/20 text-[#0B4A52] flex items-center justify-center font-bold text-xs">
                  {parentProfile.name[0]}
                </div>
                <div className="text-left text-xs">
                  <div className="font-semibold text-stone-900 leading-tight">
                    {parentProfile.name}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Child: {parentProfile.childName} ({parentProfile.childAgeMonths} mos)
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-[#45B5A5]/20 text-[#0B4A52] flex items-center justify-center font-bold text-xs">
                  <Building2 className="w-4 h-4 text-[#0B4A52]" />
                </div>
                <div className="text-left text-xs">
                  <div className="font-semibold text-stone-900 leading-tight">
                    {singleCentre.name}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    CWELCC Licensed Administration
                  </div>
                </div>
              </div>
            )}

            {/* Log Out Button */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors cursor-pointer"
              title="Log out of session"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
