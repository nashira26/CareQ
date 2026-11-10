import React from 'react';
import { preload } from 'react-dom';

/**
 * AI-generated photos, all in /public/images: WebP with a JPEG fallback (max 1600px wide, under ~250 KB),
 * object-fit cover with the focal point on the faces, 20px corners, and one
 * "Illustrative images, generated with AI." caption per section.
 */
export interface PhotoSource {
  webp: string;
  jpg: string;
  /** Intrinsic size, so the browser reserves the right space before the file arrives. */
  width: number;
  height: number;
  alt: string;
  /** CSS object-position: where the faces are. */
  focus: string;
}

export const AI_CAPTION = 'Illustrative images, generated with AI.';

export const PHOTOS = {
  hero: {
    webp: '/images/hero-garden.webp',
    jpg: '/images/hero-garden.jpg',
    width: 1600,
    height: 800,
    alt: 'An educator and three young children building a bridge out of wooden blocks in a garden.',
    focus: '62% 35%',
  },
  parent: {
    webp: '/images/parent.webp',
    jpg: '/images/parent.jpg',
    width: 1600,
    height: 900,
    alt: 'A mother and her toddler looking at a laptop together at home.',
    focus: '58% 35%',
  },
  centre: {
    webp: '/images/centre-laptop.webp',
    jpg: '/images/centre-laptop.jpg',
    width: 1600,
    height: 900,
    alt: 'Two child-care staff looking at a laptop together at the front desk of a bright classroom.',
    focus: '52% 32%',
  },
  login: {
    webp: '/images/login-welcome.webp',
    jpg: '/images/login-welcome.jpg',
    width: 1600,
    height: 900,
    alt: 'A father and his smiling toddler being welcomed by an educator at the door of a child-care centre.',
    focus: '45% 28%',
  },
  painting: {
    webp: '/images/painting.webp',
    jpg: '/images/painting.jpg',
    width: 1600,
    height: 856,
    alt: 'A girl shows her rainbow painting to her mother and an educator in a child-care classroom.',
    focus: '52% 28%',
  },
  sensory: {
    webp: '/images/sensory.webp',
    jpg: '/images/sensory.jpg',
    width: 1536,
    height: 1024,
    alt: 'An educator and three children, one in a wheelchair, building with wooden blocks at a sensory table.',
    focus: '55% 32%',
  },
} satisfies Record<string, PhotoSource>;

export const HERO_WEBP = PHOTOS.hero.webp;

/** Ask the browser to fetch the landing photo early. React adds the <link rel="preload"> to <head>. */
export const preloadHeroPhoto = () => preload(HERO_WEBP, { as: 'image', type: 'image/webp', fetchPriority: 'high' });

/** The small AI label; use it directly when one caption sits under a group of photos. */
export const AiCaption: React.FC<{ className?: string }> = ({ className = '' }) => (
  <p className={`text-xs text-ink-muted ${className}`}>{AI_CAPTION}</p>
);

export const HeroPhoto: React.FC<{
  photo?: PhotoSource;
  /** 'priority': eager, high fetch priority (landing hero only). 'eager': above the fold, normal priority. 'lazy' (default). */
  load?: 'priority' | 'eager' | 'lazy';
  /** @deprecated use load="priority" */
  priority?: boolean;
  className?: string;
  /**
   * Fill mode: the photo fills a frame sized by these classes (e.g. "h-[160px] sm:h-auto sm:flex-1").
   * Without it the photo keeps a 16:10 shape (220px tall on phones).
   */
  frameClassName?: string;
  /** Overlays inside the photo frame (e.g. a small badge). */
  children?: React.ReactNode;
  /** false when one shared caption sits under a group of photos, or the section has its own. */
  caption?: boolean;
  /** Corner rounding of the image (default 20px); e.g. "rounded-none" inside a card that clips its own corners. */
  roundedClassName?: string;
}> = ({ photo = PHOTOS.hero, load, priority = false, className = '', frameClassName, children, caption = true, roundedClassName = 'rounded-[20px]' }) => {
  const mode = load ?? (priority ? 'priority' : 'lazy');
  const fill = Boolean(frameClassName);
  return (
    <figure className={`${fill ? 'flex flex-col' : ''} ${className}`}>
      <div className={`relative ${fill ? frameClassName : ''}`}>
        <picture className={fill ? 'absolute inset-0' : undefined}>
          <source type="image/webp" srcSet={photo.webp} />
          <img
            src={photo.jpg}
            width={photo.width}
            height={photo.height}
            alt={photo.alt}
            loading={mode === 'lazy' ? 'lazy' : 'eager'}
            decoding="async"
            fetchPriority={mode === 'priority' ? 'high' : 'auto'}
            className={`block w-full object-cover ${roundedClassName} bg-mint ${fill ? 'h-full' : 'h-[220px] sm:h-auto sm:aspect-[16/10]'}`}
            style={{ objectPosition: photo.focus }}
          />
        </picture>
        {children}
      </div>
      {caption && <figcaption className="mt-2 text-xs text-ink-muted">{AI_CAPTION}</figcaption>}
    </figure>
  );
};
