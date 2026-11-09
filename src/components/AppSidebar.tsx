import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogoFull } from './Logo';
import { Sparkles, Clover, ArrowLeftRight } from 'lucide-react';

import { ResetDemo } from './ResetDemo';

export interface SidebarItem {
  id: string;
  label: string;
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

export const AppSidebar: React.FC<AppSidebarProps> = ({
  role,
  items,
  activeId,
  onSelect,
  onLogout,
}) => {
  const [mobileMount, setMobileMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el =
      document.getElementById('app-sidebar-mobile-mount') ||
      document.querySelector('main');
    setMobileMount(el as HTMLElement | null);
  }, []);

  const mobilePillRow = (
    <div className="lg:hidden w-full overflow-x-auto flex gap-2 pb-3 mb-4 sm:mb-6 no-scrollbar">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeId;
        const isNum = item.badge && !isNaN(Number(item.badge));
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              isActive
                ? 'bg-cq-brand text-white font-semibold shadow-2xs'
                : 'text-cq-ink-2 bg-white border border-cq-line hover:bg-cq-page'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-cq-muted'}`} />
            <span>{item.label}</span>
            {item.badge && (
              <span
                className={`text-[10px] ${
                  isActive
                    ? 'bg-white/20 rounded-md px-1.5 py-0.2 text-white font-medium'
                    : isNum
                    ? 'text-cq-soft'
                    : 'text-cq-muted bg-cq-surface-sage border border-cq-line rounded-md px-1.5 py-0.2'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop aside: w-[220px] bg-white border-r border-cq-line h-screen sticky top-0 flex flex-col px-4 py-6 */}
      <aside className="hidden lg:flex w-[220px] bg-white border-r border-cq-line h-screen sticky top-0 flex-col px-4 py-6 shrink-0 select-none">
        {/* Top: LogoFull size 36; tagline "A little care, every step." text-xs text-cq-soft mt-1 pl-1 */}
        <div>
          <LogoFull size={36} />
          <p className="text-xs text-cq-soft mt-1 pl-1">A little care, every step.</p>
        </div>

        {/* Section Label mt-10 mb-3 pl-2: Eyebrow "Your family space" (parent) / "Your centre space" (centre) */}
        <div className="mt-10 mb-3 pl-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cq-muted">
            {role === 'parent' ? 'Your family space' : 'Your centre space'}
          </p>
        </div>

        {/* Vertical nav items */}
        <nav className="space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeId;
            const isNum = item.badge && !isNaN(Number(item.badge));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`h-11 w-full flex items-center gap-3 px-3.5 rounded-xl text-sm transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-cq-brand text-white font-semibold'
                    : 'text-cq-ink-2 hover:bg-cq-page'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-cq-muted'}`}
                />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-auto shrink-0 text-xs ${
                      isActive
                        ? 'bg-white/20 rounded-md px-1.5 py-0.5 text-white font-medium'
                        : isNum
                        ? 'text-cq-soft'
                        : 'text-cq-soft bg-cq-stone-100 rounded-md px-1.5 py-0.5'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom (mt-auto) card */}
        <div className="mt-auto pt-4">
          <div className="rounded-2xl bg-cq-surface-sage border border-cq-line p-5 relative overflow-hidden">
            <Sparkles className="w-5 h-5 text-cq-sage-accent" />
            <h4 className="text-sm font-bold text-cq-ink mt-3">
              {role === 'parent' ? 'Big steps. Little humans.' : 'Every family, a clear answer.'}
            </h4>
            <p className="text-xs text-cq-muted leading-relaxed mt-1">
              {role === 'parent'
                ? "You don't have to figure it all out at once."
                : 'A quick update today saves a parent a week of wondering.'}
            </p>
            <Clover className="w-14 h-14 text-cq-sage-200 stroke-[1.25] absolute bottom-2 right-2 pointer-events-none" />
          </div>

          {/* Log out text button under the card */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 text-xs text-cq-muted hover:text-cq-ink mt-4 pl-2 transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          )}
          <ResetDemo className="mt-3" />
        </div>
      </aside>

      {/* Below lg: render the same items as a horizontal scrollable pill row at the top of the main content */}
      {mobileMount && createPortal(mobilePillRow, mobileMount)}
    </>
  );
};
