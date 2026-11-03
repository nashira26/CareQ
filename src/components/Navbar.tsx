import React from 'react';
import { User, Building2 } from 'lucide-react';
import { ParentProfile, Centre } from '../data/mockData';
import { LogoFull, LogoMark } from './Logo';

interface NavbarProps {
  currentRole: 'parent' | 'centre';
  onRoleChange: (role: 'parent' | 'centre') => void;
  parentProfile: ParentProfile;
  singleCentre: Centre;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  parentProfile,
  singleCentre,
}) => {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">
      {/* Top Demo Mode Notice Strip (The ONLY place allowed to change role for demo presentation) */}
      <div className="bg-stone-900 text-stone-200 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-stone-400 text-[11px] font-semibold uppercase tracking-wider">
            Demo Persona Switcher:
          </span>
          <span className="text-[11px] text-stone-300 hidden sm:inline">
            (The portal is locked to a single role in production; switch here for demo testing)
          </span>
        </div>

        {/* Demo role switch pills */}
        <div className="flex items-center gap-1 bg-stone-800 p-0.5 rounded-lg border border-stone-700">
          <button
            type="button"
            onClick={() => onRoleChange('parent')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentRole === 'parent'
                ? 'bg-[#0B4A52] text-white font-bold shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Parent (Priya)</span>
          </button>

          <button
            type="button"
            onClick={() => onRoleChange('centre')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentRole === 'centre'
                ? 'bg-[#0B4A52] text-white font-bold shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Single Centre ({singleCentre.name.split(' ')[0]})</span>
          </button>
        </div>
      </div>

      {/* Main Navbar Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            {/* Header: <LogoFull /> (~36px tall) on desktop, <LogoMark /> (~32px tall) on small screens */}
            <div className="flex items-center">
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

          {/* Active Persona Badge */}
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </div>
    </header>
  );
};
