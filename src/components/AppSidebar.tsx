import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogoFull } from './Logo';
import { Sparkles } from 'lucide-react';

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
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  role,
  items,
  activeId,
  onSelect,
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
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#0B4A52] text-white font-semibold shadow-2xs'
                : 'text-stone-600 bg-white border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-stone-500'}`} />
            <span>{item.label}</span>
            {item.badge && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 text-[#0B4A52] border border-stone-200'
                }`}
              >
                {item.badge}
              </span>
            )}
            {isActive && (
              <span
                className="rounded-full bg-[#F9BE2F] shrink-0"
                style={{ width: '6px', height: '6px' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop aside */}
      <aside className="hidden lg:flex w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-stone-200 flex-col px-5 py-6">
        {/* Top: Logo and tagline */}
        <div>
          <LogoFull size={34} />
          <p className="text-xs text-stone-500 mt-1">A little care, every step.</p>
        </div>

        {/* Section Label */}
        <div className="mt-10 flex-1 flex flex-col min-h-0">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-stone-400 mb-3">
            {role === 'parent' ? 'YOUR FAMILY SPACE' : 'YOUR CENTRE SPACE'}
          </div>

          {/* Vertical nav */}
          <nav className="space-y-1.5 overflow-y-auto">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#0B4A52] text-white font-semibold'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-100 text-[#0B4A52] border border-stone-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="rounded-full bg-[#F9BE2F] shrink-0 ml-auto"
                      style={{ width: '6px', height: '6px' }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom card (mt-auto) */}
          <div className="mt-auto pt-6">
            <div className="rounded-2xl bg-[#45B5A5]/10 border border-[#45B5A5]/25 p-5">
              <Sparkles className="w-5 h-5 text-[#F9BE2F] mb-2" />
              <h4 className="text-sm font-semibold text-[#0B4A52]">
                {role === 'parent' ? 'Big steps. Little humans.' : 'Every family, a clear answer.'}
              </h4>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                {role === 'parent'
                  ? "You don't have to figure it all out at once. We'll keep track, so you can stay close."
                  : 'A quick update today saves a parent a week of wondering.'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Below lg: render the same items as a horizontal scrollable pill row at the top of the main content */}
      {mobileMount && createPortal(mobilePillRow, mobileMount)}
    </>
  );
};
