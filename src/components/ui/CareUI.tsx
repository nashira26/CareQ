import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export const Eyebrow: React.FC<EyebrowProps> = ({ children, className = '' }) => (
  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5B6B66] ${className}`}>
    {children}
  </p>
);

export interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  action,
}) => (
  <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-8">
    <div>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="mt-2 text-[34px] sm:text-[40px] font-bold leading-tight tracking-[-0.03em] text-[#173F42]">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-sm text-[#5B6B66]">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ className = '', children, ...props }) => (
  <div className={`bg-white rounded-2xl border border-[#E7E4DA] p-6 ${className}`} {...props}>
    {children}
  </div>
);

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  noArrow?: boolean;
  className?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  noArrow = false,
  className = '',
  ...props
}) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#0B4A52] hover:bg-[#08383E] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
    {...props}
  >
    <span>{children}</span>
    {!noArrow && <ArrowRight className="w-4 h-4 shrink-0" />}
  </button>
);

export interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const GhostButton: React.FC<GhostButtonProps> = ({
  children,
  className = '',
  ...props
}) => (
  <button
    type="button"
    className={`h-10 px-4 rounded-xl border border-[#E7E4DA] bg-white text-sm font-semibold text-[#173F42] hover:bg-[#FAF9F4] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer ${className}`}
    {...props}
  >
    {children}
  </button>
);

export type IconTileTone = 'sage' | 'peach' | 'lilac' | 'sand';

export interface IconTileProps {
  icon: React.ComponentType<{ className?: string }>;
  tone?: IconTileTone;
  className?: string;
}

export const IconTile: React.FC<IconTileProps> = ({
  icon: Icon,
  tone = 'sage',
  className = '',
}) => {
  const tones: Record<IconTileTone, { bg: string; text: string }> = {
    sage: { bg: 'bg-[#E4ECE1]', text: 'text-[#4E7A5A]' },
    peach: { bg: 'bg-[#FBE9E1]', text: 'text-[#C46E4E]' },
    lilac: { bg: 'bg-[#ECE8F5]', text: 'text-[#6B5B95]' },
    sand: { bg: 'bg-[#F3EEE3]', text: 'text-[#8A6A3B]' },
  };

  const current = tones[tone] || tones.sage;

  return (
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${current.bg} ${current.text} ${className}`}
    >
      <Icon className="w-5 h-5" />
    </div>
  );
};

export interface SimNoteProps {
  children: React.ReactNode;
  className?: string;
}

export const SimNote: React.FC<SimNoteProps> = ({ children, className = '' }) => (
  <div className={`text-[11px] text-[#7A8A84] flex items-center gap-1.5 ${className}`}>
    <Sparkles className="w-3 h-3 text-[#7A8A84] shrink-0" />
    <span>{children}</span>
  </div>
);

export type AiMode = 'gemini' | 'fallback';

/** Small grey note shown when an AI endpoint answered with its non-AI fallback. */
export const AiFallbackNote: React.FC<{ aiMode?: AiMode | null; className?: string }> = ({
  aiMode,
  className = '',
}) =>
  aiMode === 'fallback' ? (
    <p className={`text-[11px] text-[#7A8A84] ${className}`}>AI unavailable: basic mode used</p>
  ) : null;

export interface DemoBannerProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  title,
  children,
  className = '',
}) => (
  <div
    className={`rounded-2xl bg-[#EEF3EA] border border-[#D9E4D3] px-5 py-4 text-sm text-[#3F5250] flex items-start gap-3 ${className}`}
  >
    <Sparkles className="w-4 h-4 text-[#4E7A5A] shrink-0 mt-0.5" />
    <div>
      <span className="font-bold">{title} </span>
      <span>{children}</span>
    </div>
  </div>
);

export type HouseIllustrationTone = 'sage' | 'lilac' | 'sky';

export interface HouseIllustrationProps {
  tone?: HouseIllustrationTone;
  className?: string;
}

export const HouseIllustration: React.FC<HouseIllustrationProps> = ({
  tone = 'sage',
  className = '',
}) => {
  const palettes = {
    sage: {
      bg: '#DCE7DA',
      hill1: '#C9DCC2',
      hill2: '#BFD4B7',
      dark: '#4A7A62',
      accent: '#9DBB86',
    },
    lilac: {
      bg: '#E6E2F0',
      hill1: '#D6D0E8',
      hill2: '#CCC4E2',
      dark: '#8A7FB0',
      accent: '#B7AED3',
    },
    sky: {
      bg: '#DCE6EA',
      hill1: '#C8D8DE',
      hill2: '#BCD0D8',
      dark: '#5F8A9A',
      accent: '#9DB9C3',
    },
  };

  const p = palettes[tone] || palettes.sage;

  return (
    <svg
      viewBox="0 0 520 280"
      className={`w-full h-auto select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background base */}
      <rect width="520" height="280" fill={p.bg} />

      {/* Pale sun circle top-right r=28 #FBF3C4 */}
      <circle cx="430" cy="62" r="28" fill="#FBF3C4" />

      {/* 4-point sparkle top-left */}
      <path
        d="M 68 40 Q 68 54 54 54 Q 68 54 68 68 Q 68 54 82 54 Q 68 54 68 40 Z"
        fill={p.accent}
      />

      {/* Small bird "︶︶" stroke */}
      <path
        d="M 364 96 Q 370 88 376 96 Q 382 88 388 96"
        fill="none"
        stroke={p.dark}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M 396 108 Q 401 101 406 108 Q 411 101 416 108"
        fill="none"
        stroke={p.dark}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Soft hills along the bottom */}
      <path
        d="M 0 195 Q 160 145 320 180 T 520 165 L 520 280 L 0 280 Z"
        fill={p.hill2}
      />
      <path
        d="M 0 230 Q 180 170 360 200 T 520 195 L 520 280 L 0 280 Z"
        fill={p.hill1}
      />

      {/* Thin path line from door to the right */}
      <path
        d="M 265 255 Q 315 258 370 264 T 520 268"
        fill="none"
        stroke={p.dark}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Round sage tree on the left: two overlapping circles on a thin trunk */}
      <rect x="98" y="168" width="6" height="74" rx="2" fill={p.dark} />
      <circle cx="88" cy="158" r="32" fill={p.accent} />
      <circle cx="112" cy="146" r="28" fill={p.accent} />

      {/* House in the centre: cream body #FBF8EC (~190x130), triangular roof, arched door, two square windows with cream cross */}
      <rect x="175" y="132" width="180" height="123" rx="3" fill="#FBF8EC" />
      <polygon points="158,132 265,70 372,132" fill={p.dark} />

      {/* Left window */}
      <rect x="198" y="152" width="30" height="30" rx="3" fill={p.accent} />
      <line x1="213" y1="152" x2="213" y2="182" stroke="#FBF8EC" strokeWidth="2.5" />
      <line x1="198" y1="167" x2="228" y2="167" stroke="#FBF8EC" strokeWidth="2.5" />

      {/* Right window */}
      <rect x="302" y="152" width="30" height="30" rx="3" fill={p.accent} />
      <line x1="317" y1="152" x2="317" y2="182" stroke="#FBF8EC" strokeWidth="2.5" />
      <line x1="302" y1="167" x2="332" y2="167" stroke="#FBF8EC" strokeWidth="2.5" />

      {/* Arched door */}
      <path
        d="M 248 255 L 248 214 A 17 17 0 0 1 282 214 L 282 255 Z"
        fill={p.dark}
      />
      <circle cx="276" cy="235" r="2" fill="#FBF8EC" />

      {/* Two tiny flowers (#E9A27A, #F2C14E) by the door */}
      <line x1="238" y1="255" x2="238" y2="242" stroke={p.dark} strokeWidth="1.5" />
      <circle cx="238" cy="240" r="4.5" fill="#E9A27A" />

      <line x1="292" y1="255" x2="292" y2="244" stroke={p.dark} strokeWidth="1.5" />
      <circle cx="292" cy="242" r="4" fill="#F2C14E" />

      {/* Pine tree on the right: stacked triangles with trunk */}
      <rect x="424" y="196" width="7" height="46" rx="2" fill={p.dark} />
      <polygon points="400,212 427.5,172 455,212" fill={p.dark} />
      <polygon points="405,188 427.5,152 450,188" fill={p.dark} />
      <polygon points="410,164 427.5,134 445,164" fill={p.dark} />
    </svg>
  );
};
