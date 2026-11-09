import React from 'react';
import { preload } from 'react-dom';

/**
 * AI-generated photos (labelled as such under each): WebP with a JPEG fallback, 1600×900, object-fit
 * cover with the focal point on the faces, 20px corners, caption "Illustrative image, generated with AI."
 */
export interface PhotoSource {
  webp: string;
  jpg: string;
  alt: string;
  /** CSS object-position: where the faces are. */
  focus: string;
}

export const PHOTOS = {
  hero: {
    webp: '/landing/hero-1600.webp',
    jpg: '/landing/hero-1600.jpg',
    alt: 'An educator and four young children building with wooden blocks on the grass outside a child-care centre.',
    focus: '50% 35%',
  },
  parent: {
    webp: '/overview/parent-1600.webp',
    jpg: '/overview/parent-1600.jpg',
    alt: 'A mother and her toddler looking at a laptop together at home.',
    focus: '58% 35%',
  },
  centre: {
    webp: '/overview/centre-1600.webp',
    jpg: '/overview/centre-1600.jpg',
    alt: 'An educator checking a tablet in a bright child-care classroom while children play in the background.',
    focus: '60% 30%',
  },
} satisfies Record<string, PhotoSource>;

export const HERO_WEBP = PHOTOS.hero.webp;

/** Ask the browser to fetch the landing photo early. React adds the <link rel="preload"> to <head>. */
export const preloadHeroPhoto = () => preload(HERO_WEBP, { as: 'image', type: 'image/webp', fetchPriority: 'high' });

export const HeroPhoto: React.FC<{
  photo?: PhotoSource;
  /** 'priority': eager, high fetch priority (landing). 'eager': above the fold, normal priority. 'lazy': below or optional. */
  load?: 'priority' | 'eager' | 'lazy';
  /** @deprecated use load="priority" */
  priority?: boolean;
  className?: string;
  /**
   * Fill mode: the photo fills a frame sized by these classes (e.g. "h-[160px] sm:h-auto sm:flex-1").
   * Without it the photo keeps its own 16:10 shape (220px tall on phones).
   */
  frameClassName?: string;
  /** Overlays inside the photo frame (e.g. a small badge). */
  children?: React.ReactNode;
}> = ({ photo = PHOTOS.hero, load, priority = false, className = '', frameClassName, children }) => {
  const mode = load ?? (priority ? 'priority' : 'lazy');
  const fill = Boolean(frameClassName);
  return (
    <figure className={`${fill ? 'flex flex-col' : ''} ${className}`}>
      <div className={`relative ${fill ? frameClassName : ''}`}>
        <picture className={fill ? 'absolute inset-0' : undefined}>
          <source type="image/webp" srcSet={photo.webp} />
          <img
            src={photo.jpg}
            width={1600}
            height={900}
            alt={photo.alt}
            loading={mode === 'lazy' ? 'lazy' : 'eager'}
            decoding="async"
            fetchPriority={mode === 'priority' ? 'high' : 'auto'}
            className={`block w-full object-cover rounded-[20px] bg-mint ${fill ? 'h-full' : 'h-[220px] sm:h-auto sm:aspect-[16/10]'}`}
            style={{ objectPosition: photo.focus }}
          />
        </picture>
        {children}
      </div>
      <figcaption className="mt-2 text-xs text-ink-muted">Illustrative image, generated with AI.</figcaption>
    </figure>
  );
};
