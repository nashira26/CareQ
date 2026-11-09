import React from 'react';
import { isAiOffline } from '../../lib/aiFetch';
import { ArrowRight, Info } from 'lucide-react';
import type { ApplicationStatus } from '../../data/mockData';

/* ---------------------------------------------------------------------------
   Text
   ------------------------------------------------------------------------ */

export interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

/** Small section label. Sentence case, no letter spacing. */
export const Eyebrow: React.FC<EyebrowProps> = ({ children, className = '' }) => (
  <p className={`text-sm font-semibold text-ink-muted ${className}`}>{children}</p>
);

export interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 sm:gap-6 mb-6 sm:mb-8">
    <div className="min-w-0">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="mt-1 text-2xl sm:text-[30px] sm:leading-[38px] font-extrabold leading-tight text-brand">{title}</h1>
      {subtitle && <p className="mt-1.5 text-base text-ink-muted max-w-2xl">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/* ---------------------------------------------------------------------------
   Surfaces
   ------------------------------------------------------------------------ */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ className = '', children, ...props }) => (
  <div className={`bg-white rounded-2xl border border-cq-line p-5 sm:p-6 ${className}`} {...props}>
    {children}
  </div>
);

/* ---------------------------------------------------------------------------
   Buttons: primary (solid teal), secondary (outlined), tertiary (link), danger.
   Arrows only on buttons that take you to another screen (`arrow`).
   ------------------------------------------------------------------------ */

const pressable =
  'cursor-pointer select-none transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100';

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /** Show a forward arrow: use for buttons that move to another screen. */
  arrow?: boolean;
  /** @deprecated arrows are now opt-in via `arrow`; kept so existing calls compile. */
  noArrow?: boolean;
  className?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  arrow = false,
  noArrow: _noArrow,
  className = '',
  ...props
}) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-cq-brand hover:bg-cq-brand-hover active:bg-brand-press text-white text-sm font-bold disabled:bg-stone disabled:text-ink-faint ${pressable} ${className}`}
    {...props}
  >
    <span>{children}</span>
    {arrow && <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />}
  </button>
);

export interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

/** Secondary button: white, strong outline, teal text. */
export const GhostButton: React.FC<GhostButtonProps> = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`h-10 px-4 rounded-xl border border-line-strong bg-white text-sm font-bold text-brand hover:bg-mint inline-flex items-center justify-center gap-2 disabled:bg-stone disabled:text-ink-faint disabled:border-cq-line ${pressable} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const SecondaryButton = GhostButton;

/** Tertiary: a link-style button for low-emphasis actions (History, View details). */
export const TertiaryButton: React.FC<GhostButtonProps> = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`inline-flex items-center gap-1.5 h-10 px-2 rounded-lg text-sm font-bold text-brand underline decoration-brand/35 underline-offset-4 hover:decoration-brand disabled:text-ink-faint disabled:no-underline ${pressable} ${className}`}
    {...props}
  >
    {children}
  </button>
);

/** Destructive action (Withdraw, Remove). Outlined so it never competes with the primary action. */
export const DangerButton: React.FC<GhostButtonProps> = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`h-10 px-4 rounded-xl border border-[#E2B4AF] bg-white text-sm font-bold text-error hover:bg-error-bg inline-flex items-center justify-center gap-2 disabled:text-ink-faint disabled:border-cq-line ${pressable} ${className}`}
    {...props}
  >
    {children}
  </button>
);

/* ---------------------------------------------------------------------------
   Icon tiles and centre avatars
   ------------------------------------------------------------------------ */

export type IconTileTone = 'sage' | 'peach' | 'lilac' | 'sand';

export interface IconTileProps {
  icon: React.ComponentType<{ className?: string }>;
  tone?: IconTileTone;
  className?: string;
}

export const IconTile: React.FC<IconTileProps> = ({ icon: Icon, tone = 'sage', className = '' }) => {
  const tones: Record<IconTileTone, string> = {
    sage: 'bg-mint text-leaf-ink',
    peach: 'bg-peach text-coral-ink',
    lilac: 'bg-status-wait-bg text-status-wait',
    sand: 'bg-butter text-sun-ink',
  };
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone] || tones.sage} ${className}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
};

const AVATAR_FILLS = ['bg-mint', 'bg-peach', 'bg-butter', 'bg-stone'] as const;
const AVATAR_DOORS = ['fill-leaf', 'fill-coral', 'fill-sun', 'fill-leaf'] as const;

/** Stable index 0-3 from a centre id, so a centre always gets the same tile colour. */
export const centreTone = (centreId: string): number => {
  let h = 0;
  for (let i = 0; i < centreId.length; i++) h = (h * 31 + centreId.charCodeAt(i)) >>> 0;
  return h % AVATAR_FILLS.length;
};

/** Small house tile that gives each centre a recognisable mark in lists. Decorative. */
export const CentreAvatar: React.FC<{ centreId: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  centreId,
  size = 'md',
  className = '',
}) => {
  const t = centreTone(centreId);
  const box = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';
  const icon = size === 'sm' ? 22 : size === 'lg' ? 34 : 26;
  return (
    <span aria-hidden="true" className={`${box} ${AVATAR_FILLS[t]} rounded-xl inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg width={icon} height={icon} viewBox="0 0 48 48" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand">
        <path d="M8 22 24 9l16 13" />
        <path d="M12 19v20h24V19" className="fill-white" />
        <path d="M20.5 39v-8a3.5 3.5 0 0 1 7 0v8" className={AVATAR_DOORS[t]} />
      </svg>
    </span>
  );
};

/* ---------------------------------------------------------------------------
   Progress strip: Sent -> Reviewed -> Waitlist -> Offer.
   Shows how far the application has got by its current (centre-reported)
   status. Never predicts the next step.
   ------------------------------------------------------------------------ */

const STEPS = ['Sent', 'Reviewed', 'Waitlist', 'Offer'] as const;
const STEP_INDEX: Partial<Record<ApplicationStatus, number>> = {
  Submitted: 0,
  'Under review': 1,
  Waitlisted: 2,
  Offer: 3,
  Accepted: 4,
};

export const ProgressStrip: React.FC<{ status: ApplicationStatus; compact?: boolean; className?: string }> = ({
  status,
  compact = false,
  className = '',
}) => {
  const current = STEP_INDEX[status];
  if (current === undefined) return null; // Draft and Withdrawn have no progress
  const label = current >= 4 ? 'Offer accepted' : `${STEPS[current]} (step ${current + 1} of 4)`;
  return (
    <ol aria-label={`Application progress: ${label}`} className={`grid grid-cols-4 gap-1 ${className}`}>
      {STEPS.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'todo';
        return (
          <li key={s} className="flex flex-col gap-1 min-w-0" aria-current={state === 'now' ? 'step' : undefined}>
            <span
              className={`block h-1.5 rounded-full transition-colors duration-500 ${
                state === 'done' ? 'bg-leaf' : state === 'now' ? 'bg-coral' : 'bg-stone'
              }`}
            />
            {!compact && (
              <span className={`text-xs truncate ${state === 'todo' ? 'text-ink-faint' : 'font-bold text-ink'}`}>{s}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
};

/* ---------------------------------------------------------------------------
   Trust and simulation labels (wording unchanged)
   ------------------------------------------------------------------------ */

export interface SimNoteProps {
  children: React.ReactNode;
  className?: string;
}

export const SimNote: React.FC<SimNoteProps> = ({ children, className = '' }) => (
  <div className={`text-xs text-ink-soft flex items-start gap-1.5 ${className}`}>
    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

/**
 * "Simulated" chip for every simulated item (status, position, estimate, offer, centre message,
 * notification). Never used on real data (open-data details, handbook content).
 */
export const SimTag: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center rounded-md px-1.5 h-5 bg-butter text-sim border border-butter-line text-xs font-bold leading-none align-middle whitespace-nowrap ${className}`}
  >
    Simulated
  </span>
);

/** Banner on every centre-portal page: the account is a simulated demo account. */
export const CentreDemoBanner: React.FC<{ centreName: string; realCentre: boolean; className?: string }> = ({
  centreName,
  realCentre,
  className = '',
}) => (
  <div
    role="note"
    className={`rounded-xl border border-butter-line bg-butter px-4 py-2.5 text-sm text-cq-sand-ink flex items-start gap-2 ${className}`}
  >
    <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
    <span>
      {realCentre ? (
        <>
          <span className="font-bold">Simulated demo account.</span> Not operated by or affiliated with {centreName}.
        </>
      ) : (
        <>
          <span className="font-bold">Simulated demo account.</span> {centreName} is a fictional centre.
        </>
      )}
    </span>
  </div>
);

export type AiMode = 'gemini' | 'fallback';

/** Small grey note shown when an AI endpoint answered with its non-AI fallback. */
export const AiFallbackNote: React.FC<{ aiMode?: AiMode | null; className?: string }> = ({ aiMode, className = '' }) =>
  aiMode === 'fallback' ? (
    <p className={`text-xs text-ink-soft flex items-center gap-1.5 ${className}`}>
      <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {isAiOffline() ? 'Offline demo: AI unavailable, basic mode used' : 'AI unavailable: basic mode used'}
    </p>
  ) : null;

/** Plain-language notice when an AI feature can't run (rate limit, signed out, server unreachable). */
export const AiNotice: React.FC<{ message?: string | null; className?: string }> = ({ message, className = '' }) =>
  message ? (
    // Offline demo: the only notices are basic-mode notes, so they're grey like AiFallbackNote, not error-red
    <p role="status" className={`text-xs ${isAiOffline() ? 'text-ink-soft' : 'font-semibold text-error'} ${className}`}>
      {message}
    </p>
  ) : null;

export interface DemoBannerProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ title, children, className = '' }) => (
  <div className={`rounded-xl bg-butter border border-butter-line px-4 py-3 text-sm text-cq-sand-ink flex items-start gap-2.5 ${className}`}>
    <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
    <div>
      <span className="font-bold">{title} </span>
      <span>{children}</span>
    </div>
  </div>
);

/* ---------------------------------------------------------------------------
   House scene (landing, auth, centre without a photo). Same line style as the
   spot illustrations in ./Illustrations.
   ------------------------------------------------------------------------ */

export type HouseIllustrationTone = 'sage' | 'lilac' | 'sky';

export interface HouseIllustrationProps {
  tone?: HouseIllustrationTone;
  className?: string;
}

const HOUSE_BG: Record<HouseIllustrationTone, string> = {
  sage: 'fill-mint',
  lilac: 'fill-status-wait-bg',
  sky: 'fill-info-bg',
};

export const HouseIllustration: React.FC<HouseIllustrationProps> = ({ tone = 'sage', className = '' }) => (
  <svg
    viewBox="0 0 520 280"
    className={`w-full h-auto select-none ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="520" height="280" className={HOUSE_BG[tone] || HOUSE_BG.sage} />
    <circle cx="420" cy="70" r="30" className="fill-sun" />
    <path d="M0 236 H520" className="stroke-brand" strokeWidth="3" />
    <path d="M300 236 c40 0 70 -8 120 -8 s60 8 100 8" className="stroke-leaf" strokeWidth="3" />
    {/* tree */}
    <path d="M96 236 V178" className="stroke-brand" strokeWidth="3" />
    <path d="M66 182 c0 -34 16 -54 30 -54 s30 20 30 54 z" className="fill-leaf stroke-brand" strokeWidth="3" />
    {/* house */}
    <path d="M168 126 260 62 352 126" className="stroke-brand" strokeWidth="3.5" />
    <path d="M186 114 V236 H334 V114" className="fill-white stroke-brand" strokeWidth="3.5" />
    <rect x="206" y="140" width="34" height="30" rx="5" className="fill-peach stroke-brand" strokeWidth="3" />
    <rect x="280" y="140" width="34" height="30" rx="5" className="fill-peach stroke-brand" strokeWidth="3" />
    <path d="M242 236 V204 a18 18 0 0 1 36 0 V236" className="fill-sun stroke-brand" strokeWidth="3" />
    {/* Q-ring path echoing the logo */}
    <path d="M430 196 a22 22 0 1 1 10 -18" className="stroke-coral" strokeWidth="3.5" />
    <path d="M436 188 l10 10" className="stroke-coral" strokeWidth="3.5" />
  </svg>
);
