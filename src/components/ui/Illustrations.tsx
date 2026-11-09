import React from 'react';

/**
 * CareQ spot illustrations: one set, one style. 2px teal line, flat fills from
 * the surface colours, one warm accent each. Decorative (aria-hidden).
 * Colours come from theme tokens via Tailwind fill-/stroke- classes.
 */

interface SpotProps {
  className?: string;
}

const Svg: React.FC<React.PropsWithChildren<SpotProps>> = ({ className = '', children }) => (
  <svg
    viewBox="0 0 160 110"
    fill="none"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`stroke-brand select-none ${className}`}
  >
    {children}
  </svg>
);

/** 1. Centre / home */
export const SpotCentre: React.FC<SpotProps> = ({ className }) => (
  <Svg className={className}>
    <circle cx="122" cy="28" r="12" className="fill-sun stroke-none" />
    <path d="M20 96h120" />
    <path d="M44 54 80 26l36 28" />
    <path d="M52 48v48h56V48" className="fill-white" />
    <path d="M72 96V78a8 8 0 0 1 16 0v18" className="fill-mint" />
    <rect x="58" y="58" width="12" height="12" rx="2" className="fill-peach" />
    <rect x="90" y="58" width="12" height="12" rx="2" className="fill-peach" />
    <path d="M30 96c0-12 4-20 10-20s10 8 10 20" className="fill-leaf" />
  </Svg>
);

/** 2. Neighbourhood / location (pin + Q-ring) */
export const SpotNeighbourhood: React.FC<SpotProps> = ({ className }) => (
  <Svg className={className}>
    <rect x="18" y="16" width="124" height="80" rx="10" className="fill-mint" />
    <path d="M18 56c30-8 50 10 80 0s34-6 44-4" className="stroke-white" strokeWidth="6" />
    <path d="M60 16v80M112 16v80" className="stroke-white" strokeWidth="4" />
    <path d="M86 70c-12-12-16-20-16-28a16 16 0 0 1 32 0c0 8-4 16-16 28z" className="fill-white" />
    <circle cx="86" cy="42" r="6" className="fill-coral stroke-none" />
    <path d="M96 80a14 14 0 1 1 4-10" />
    <path d="M98 76l6 6" />
  </Svg>
);

/** 3. Documents & checklist */
export const SpotChecklist: React.FC<SpotProps> = ({ className }) => (
  <Svg className={className}>
    <rect x="52" y="14" width="60" height="84" rx="8" className="fill-white" />
    <rect x="68" y="8" width="28" height="12" rx="4" className="fill-butter" />
    <path d="m62 38 5 5 8-9" className="stroke-leaf-ink" />
    <path d="M82 40h20" />
    <path d="m62 58 5 5 8-9" className="stroke-leaf-ink" />
    <path d="M82 60h20" />
    <rect x="62" y="74" width="12" height="12" rx="3" className="fill-sun" />
    <path d="M82 80h14" />
    <path d="M120 70l14-14 6 6-14 14-8 2z" className="fill-peach" />
  </Svg>
);

/** 4. Progress / journey. `animate` draws the path once (respects reduced motion). */
export const SpotJourney: React.FC<SpotProps & { animate?: boolean }> = ({ className, animate = false }) => (
  <Svg className={className}>
    <path
      d="M18 88c22 0 22-26 46-26s22 22 44-4 20-30 34-30"
      strokeDasharray="2 6"
      style={animate ? { strokeDashoffset: 160, animation: 'cq-draw 0.9s ease-out forwards' } : undefined}
    />
    <circle cx="22" cy="88" r="7" className="fill-leaf" />
    <circle cx="64" cy="62" r="7" className="fill-leaf" />
    <circle cx="102" cy="60" r="7" className="fill-sun" />
    <path d="M136 30V10l14 6-14 6" className="fill-coral" />
    <path d="M19 88l2 2 4-4M61 62l2 2 4-4" className="stroke-white" />
  </Svg>
);

/** 5. Messages */
export const SpotMessages: React.FC<SpotProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M22 26h68a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8H48l-14 12V70h-12a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8z" className="fill-mint" />
    <path d="M70 48h68a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8h-8v12l-14-12H70a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8z" className="fill-peach" />
    <path d="M30 42h40M30 54h26M80 64h50M80 74h32" />
  </Svg>
);

/** 6. Empty state: a quiet window with a plant */
export const SpotEmpty: React.FC<SpotProps> = ({ className }) => (
  <Svg className={className}>
    <rect x="34" y="12" width="92" height="70" rx="10" className="fill-butter" />
    <path d="M80 12v70M34 47h92" className="stroke-white" strokeWidth="3" />
    <circle cx="104" cy="32" r="9" className="fill-sun stroke-none" />
    <path d="M24 82h112" />
    <path d="M60 82V70h20v12" className="fill-peach" />
    <path d="M70 70c0-10-8-14-12-22M70 70c0-8 6-14 12-18M70 70V52" className="stroke-leaf-ink" />
  </Svg>
);

/** Empty state block: illustration, title, one line, optional actions. */
export const EmptyState: React.FC<{
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  spot?: React.ReactNode;
  className?: string;
}> = ({ title, children, actions, spot, className = '' }) => (
  <div className={`flex flex-col items-center text-center py-8 px-4 ${className}`}>
    <div className="w-32">{spot ?? <SpotEmpty />}</div>
    <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
    {children && <p className="mt-1 text-sm text-ink-muted max-w-md">{children}</p>}
    {actions && <div className="mt-5 flex flex-wrap justify-center gap-3">{actions}</div>}
  </div>
);
