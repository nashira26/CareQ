import React from 'react';
import { preload } from 'react-dom';

/**
 * The landing / login hero photo (AI-generated, labelled as such). WebP with a JPEG fallback,
 * 1600×900, object-fit cover with the focal point on the faces. On phones it sits above the text
 * at 220px tall (callers put it first with `order-first`).
 */
export const HERO_WEBP = '/landing/hero-1600.webp';
const HERO_JPG = '/landing/hero-1600.jpg';
const HERO_ALT = 'An educator and four young children building with wooden blocks on the grass outside a child-care centre.';

/** Ask the browser to fetch the photo early (landing page only). React adds the <link rel="preload"> to <head>. */
export const preloadHeroPhoto = () => preload(HERO_WEBP, { as: 'image', type: 'image/webp', fetchPriority: 'high' });

export const HeroPhoto: React.FC<{
  /** Landing: load eagerly with high priority. Login: lazy. */
  priority?: boolean;
  className?: string;
  /** Overlays inside the photo frame (e.g. a small badge). */
  children?: React.ReactNode;
}> = ({ priority = false, className = '', children }) => (
  <figure className={className}>
    <div className="relative">
      <picture>
        <source type="image/webp" srcSet={HERO_WEBP} />
        <img
          src={HERO_JPG}
          width={1600}
          height={900}
          alt={HERO_ALT}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className="block w-full h-[220px] sm:h-auto sm:aspect-[16/10] object-cover rounded-[20px] bg-mint"
          style={{ objectPosition: '50% 35%' }}
        />
      </picture>
      {children}
    </div>
    <figcaption className="mt-2 text-xs text-ink-muted">Illustrative image, generated with AI.</figcaption>
  </figure>
);
