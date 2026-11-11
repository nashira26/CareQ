import React from 'react';
import { isAiOffline } from '../../lib/aiFetch';
import { ArrowRight, Check, Info } from 'lucide-react';
import { HeroPhoto, PHOTOS } from './HeroPhoto';
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
    <span className="inline-flex items-center gap-1.5">{children}</span>
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
              <span className={`text-[12px] leading-tight whitespace-nowrap ${state === 'todo' ? 'text-ink-faint' : 'font-bold text-ink'}`}>{s}</span>
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
 * Small "Simulated" chip. Used sparingly: only next to the waitlist position and the offer in the
 * parent Track view, for demo accounts. Everything else is covered by DemoAccountBanner.
 */
export const SimTag: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center rounded-md px-1.5 h-5 bg-butter text-sim border border-butter-line text-xs font-bold leading-none align-middle whitespace-nowrap ${className}`}
  >
    Simulated
  </span>
);

/**
 * The one simulation notice for demo accounts, at the top of every portal screen (parent and centre).
 * A real centre's demo account also says it isn't operated by or affiliated with that centre.
 * Newly signed-up accounts never see it.
 */
export const DemoAccountBanner: React.FC<{ realCentreName?: string; className?: string }> = ({ realCentreName, className = '' }) => (
  <div
    role="note"
    className={`bg-butter border-b border-butter-line px-4 py-1.5 text-xs text-cq-sand-ink flex items-start sm:items-center justify-center gap-2 shrink-0 ${className}`}
  >
    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
    <span>
      <span className="font-bold">Demo account:</span> applications, waitlist positions, offers and messages are simulated.
      {realCentreName && <> Not operated by or affiliated with {realCentreName}.</>}
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
   House scene for the landing hero, the login page and the Overview greetings:
   sky, sun, cloud, birds, rolling hills, a round tree, a pine, the house with a
   path and flowers. Same 2px teal line as the spot illustrations in
   ./Illustrations. `centre` swaps in a sky-blue sky and an "Open" sign.
   It fills its box (cropping the edges if the box is a different shape), so
   pass a size; the default is full width at its natural height.
   ------------------------------------------------------------------------ */

export type HouseScene = 'home' | 'centre';

export interface HouseIllustrationProps {
  scene?: HouseScene;
  className?: string;
}

export const HouseIllustration: React.FC<HouseIllustrationProps> = ({ scene = 'home', className = '' }) => (
  <svg
    viewBox="0 0 520 280"
    preserveAspectRatio="xMidYMid slice"
    className={`block select-none ${className || 'w-full h-auto'}`}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    fill="none"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* sky */}
    <rect width="520" height="280" className={scene === 'centre' ? 'fill-info-bg' : 'fill-butter'} />

    {/* sun with a soft glow */}
    <circle cx="430" cy="62" r="40" className="fill-sun/25" />
    <circle cx="430" cy="62" r="28" className="fill-sun" />

    {/* cloud, top left */}
    <path
      d="M44 86 h62 a12 12 0 0 0 0 -24 a14 14 0 0 0 -22 -12 a17 17 0 0 0 -31 6 a15 15 0 0 0 -9 30 z"
      className="fill-white stroke-brand"
    />

    {/* birds */}
    <path d="M364 96 q6 -8 12 0 q6 -8 12 0" className="stroke-brand" />
    <path d="M396 108 q5 -7 10 0 q5 -7 10 0" className="stroke-brand" strokeWidth="1.75" />

    {/* rolling hills: the near one stacks on the far one, so it reads deeper */}
    <path d="M0 195 Q160 145 320 180 T520 165 V280 H0 Z" className="fill-leaf/40" />
    <path d="M0 230 Q180 170 360 200 T520 195 V280 H0 Z" className="fill-leaf/40" />

    {/* path from the door */}
    <path d="M265 255 Q315 258 370 264 T520 268" className="stroke-brand" />

    {/* round tree */}
    <rect x="98" y="168" width="6" height="74" rx="2" className="fill-brand" />
    <circle cx="112" cy="146" r="28" className="fill-leaf-ink/80 stroke-brand" />
    <circle cx="88" cy="158" r="32" className="fill-leaf stroke-brand" />

    {/* house: chimney, body, roof */}
    <rect x="312" y="84" width="16" height="30" rx="2" className="fill-coral stroke-brand" />
    <rect x="175" y="132" width="180" height="123" rx="3" className="fill-page stroke-brand" />
    <path d="M158 132 265 70 372 132 Z" className="fill-brand stroke-brand" />

    {/* windows with warm light */}
    <rect x="198" y="152" width="30" height="30" rx="3" className="fill-sun stroke-brand" />
    <path d="M213 152 V182 M198 167 H228" className="stroke-brand" />
    <rect x="302" y="152" width="30" height="30" rx="3" className="fill-sun stroke-brand" />
    <path d="M317 152 V182 M302 167 H332" className="stroke-brand" />

    {/* arched door */}
    <path d="M248 255 V214 a17 17 0 0 1 34 0 V255 Z" className="fill-brand stroke-brand" />
    <circle cx="276" cy="235" r="2" className="fill-sun" />

    {/* flowers by the door */}
    <path d="M238 255 V243 M292 255 V245" className="stroke-brand" strokeWidth="1.5" />
    <circle cx="238" cy="240" r="4.5" className="fill-coral" />
    <circle cx="292" cy="242" r="4" className="fill-coral" />

    {scene === 'centre' && (
      <>
        {/* "Open" sign on the wall by the door */}
        <path d="M306 206 l6 -8 l6 8" className="stroke-brand" strokeWidth="1.5" />
        <rect x="292" y="206" width="40" height="18" rx="3" className="fill-white stroke-brand" />
        <text x="312" y="219.5" textAnchor="middle" fontSize="11" fontWeight="800" className="fill-brand">
          Open
        </text>
      </>
    )}

    {/* pine */}
    <rect x="424" y="196" width="7" height="46" rx="2" className="fill-brand" />
    <path
      d="M400 212 427.5 172 455 212 Z M405 188 427.5 152 450 188 Z M410 164 427.5 134 445 164 Z"
      className="fill-brand stroke-brand"
    />
  </svg>
);

/* ---------------------------------------------------------------------------
   Greeting band at the top of the parent and centre Overviews: text on the
   left, the house scene on the right in a soft panel that runs to the band's
   right and bottom edges, with a tilted note over its lower-left corner.
   Overview greetings now use AI-generated photos (HeroPhoto); the house scene stays available.
   Phones: the photo sits on top at 160px, text below, no note.
   ------------------------------------------------------------------------ */

export interface GreetingBandProps {
  tone: 'butter' | 'mint';
  /** AI-generated photo on the right (parent: mother and toddler; centre: two staff at a laptop). */
  photo: 'parent' | 'centre';
  note: { title: string; detail: string };
  children: React.ReactNode;
  className?: string;
}

export const GreetingBand: React.FC<GreetingBandProps> = ({ tone, photo, note, children, className = '' }) => (
  <section
    className={`rounded-[20px] overflow-hidden flex flex-col sm:flex-row sm:min-h-[272px] ${
      tone === 'mint' ? 'bg-mint' : 'bg-butter'
    } ${className}`}
  >
    <div className="order-2 sm:order-1 min-w-0 flex-1 px-5 pt-3 pb-5 sm:px-8 sm:py-7 flex flex-col justify-center">
      {children}
    </div>
    <div className="order-1 sm:order-2 relative shrink-0 sm:w-[46%] px-4 pt-4 sm:pt-5 sm:pb-4 sm:pr-5 sm:pl-7 flex flex-col">
      <HeroPhoto photo={PHOTOS[photo]} className="sm:flex-1" frameClassName="h-[160px] sm:h-auto sm:flex-1 sm:min-h-[210px]" />
      <div className="hidden sm:flex absolute left-0 bottom-12 -rotate-3 items-center gap-2.5 rounded-xl bg-white shadow-md px-3.5 py-2.5 max-w-[240px]">
        <span className="w-7 h-7 rounded-full bg-mint text-leaf-ink flex items-center justify-center shrink-0">
          <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-brand leading-tight">{note.title}</span>
          <span className="block text-xs text-ink-muted">{note.detail}</span>
        </span>
      </div>
    </div>
  </section>
);
