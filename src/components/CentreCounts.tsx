import React from 'react';
import meta from '../data/ontarioCentres.meta.json';

/** Toronto centres in CareQ's open-data list (City of Toronto filter of the Ontario data). */
export const TORONTO_CENTRE_COUNT = (meta as { centreCount: number }).centreCount;
const TORONTO_DATA_DATE = (meta as { sources: { ontario: { dataDate: string } } }).sources.ontario.dataDate;
const fmt = (n: number) => n.toLocaleString('en-CA');

/** "5,989 licensed centres in Ontario" next to "1,102 licensed Toronto centres in CareQ", with sources. */
export const CentreCounts: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact = false }) => {
  const stats = [
    { n: '5,989', label: 'licensed centres in Ontario', source: 'Ontario Early Years and Child Care Annual Report 2025 · as of Mar 31, 2025' },
    { n: fmt(TORONTO_CENTRE_COUNT), label: 'licensed Toronto centres in CareQ', source: `Ontario open data · as of ${TORONTO_DATA_DATE}` },
  ];
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 ${className}`}>
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-4">
          <span className={`${compact ? 'text-2xl' : 'text-4xl'} font-extrabold text-brand shrink-0`}>{s.n}</span>
          <div className="h-12 w-px bg-cq-stone-300 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-cq-ink-2">{s.label.charAt(0).toUpperCase() + s.label.slice(1)}</p>
            <p className="text-xs text-cq-grey-sage mt-0.5">{s.source}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
