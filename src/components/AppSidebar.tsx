import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogoFull } from './Logo';
import { LogOut } from 'lucide-react';
import { SpotJourney } from './ui/Illustrations';

import { ResetDemo } from './ResetDemo';

export interface SidebarItem {
  id: string;
  label: string;
  /** Label for the phone bottom tab bar (falls back to `label`). */
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface AppSidebarProps {
  role: 'parent' | 'centre';
  items: SidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onLogout?: () => void;
}

/**
 * Navigation. Desktop (lg+): a sidebar. Phones and tablets: a bottom tab bar with the same
 * items, the same order and the same state.
 */
export const AppSidebar: React.FC<AppSidebarProps> = ({ role, items, activeId, onSelect, onLogout }) => {
  // Lets floating elements (Ask CareQ) move above the tab bar while it is on screen
  useEffect(() => {
    document.body.dataset.tabbar = '1';
    return () => {
      delete document.body.dataset.tabbar;
    };
  }, []);

  const tabBar = (
    <nav
      aria-label={role === 'parent' ? 'Family navigation' : 'Centre navigation'}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-cq-line pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            // Sized to each label, so a longer one ("Applications") isn't cut off at phone width
            <li key={item.id} className="flex-auto min-w-0">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.badge ? `${item.label} (${item.badge})` : item.label}
                className={`relative w-full h-16 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                  isActive ? 'text-brand' : 'text-ink-muted hover:text-brand'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-0 inset-x-3 h-[3px] rounded-b-full transition-colors ${isActive ? 'bg-coral' : 'bg-transparent'}`}
                />
                <span
                  className={`relative inline-flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                    isActive ? 'bg-mint' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.badge &&
                    (/^\d+$/.test(item.badge) ? (
                      // A count (e.g. unread updates): the same number as the desktop sidebar and the bell
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[11px] font-bold leading-none inline-flex items-center justify-center ring-2 ring-white"
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`absolute -top-0.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          item.badge === 'Offer' ? 'bg-sun' : 'bg-coral'
                        }`}
                      />
                    ))}
                </span>
                <span className={`text-[12px] leading-tight truncate max-w-full ${isActive ? 'font-extrabold' : 'font-semibold'}`}>
                  {item.shortLabel ?? item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <>
      <aside className="hidden lg:flex w-[264px] bg-white border-r border-cq-line h-screen sticky top-0 flex-col px-4 py-6 shrink-0 select-none">
        <div className="px-2">
          <LogoFull size={36} />
          <p className="text-sm text-ink-soft mt-1.5">A little care, every step.</p>
        </div>

        <p className="mt-8 mb-2 px-3 text-sm font-semibold text-ink-muted">
          {role === 'parent' ? 'Your family space' : 'Your centre space'}
        </p>

        <nav aria-label={role === 'parent' ? 'Family navigation' : 'Centre navigation'} className="space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeId;
            const isNum = item.badge && !isNaN(Number(item.badge));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative min-h-11 py-2 w-full flex items-center gap-3 pl-4 pr-3 rounded-xl text-sm transition-colors cursor-pointer text-left ${
                  isActive ? 'bg-mint text-brand font-extrabold' : 'text-ink-muted font-semibold hover:bg-page hover:text-brand'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${isActive ? 'bg-coral' : 'bg-transparent'}`}
                />
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="leading-tight">{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-auto shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${
                      item.badge === 'Offer'
                        ? 'bg-sun text-status-offer'
                        : isNum
                        ? 'bg-coral text-white'
                        : 'bg-stone text-ink-muted'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
          <div className="rounded-2xl bg-page border border-cq-line p-4">
            <SpotJourney className="w-24 -ml-1" />
            <p className="text-sm font-bold text-ink mt-2">
              {role === 'parent' ? 'Big steps. Little humans.' : 'Every family, a clear answer.'}
            </p>
            <p className="text-xs text-ink-muted leading-relaxed mt-0.5">
              {role === 'parent'
                ? "You don't have to figure it all out at once."
                : 'A quick update today saves a parent a week of wondering.'}
            </p>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 h-10 px-3 mt-3 rounded-lg text-sm font-semibold text-ink-muted hover:text-brand hover:bg-page transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          )}
          <ResetDemo className="mt-1 px-3" />
        </div>
      </aside>

      {typeof document !== 'undefined' && createPortal(tabBar, document.body)}
    </>
  );
};
