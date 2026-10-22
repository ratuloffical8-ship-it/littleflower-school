// src/hooks/useSeo.ts
import { useEffect } from 'react';

import { useI18n } from '@/i18n';

interface SeoOptions {
  /** Page title (without site name). Site name is appended automatically. */
  title?: string;
  description?: string;
  /** Adds <meta name="robots" content="noindex, nofollow"> (use on admin pages). */
  noindex?: boolean;
  /** Image path or URL for Open Graph. Defaults to the school logo. */
  image?: string;
}

const DEFAULT_IMAGE = '/images/logo.png';

function upsertMeta(
  attr: 'name' | 'property',
  key: string,
  content: string,
): { element: HTMLMetaElement; created: boolean } {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  let created = false;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
    created = true;
  }
  element.setAttribute('content', content);
  return { element, created };
}

/** Sets document title, description, Open Graph tags and optional noindex for the current page. */
export function useSeo({ title, description, noindex = false, image }: SeoOptions = {}): void {
  const { t, lang } = useI18n();

  useEffect(() => {
    const siteName = t('brand.name');
    const fullTitle = title ? `${title} | ${siteName}` : `${siteName} | ${t('brand.nameEn')}`;
    const fullDescription =
      description ?? `${siteName} — ${t('brand.tagline')} (${t('brand.establishedShort')})`;
    const imageUrl = new URL(image ?? DEFAULT_IMAGE, window.location.origin).href;

    document.title = fullTitle;
    upsertMeta('name', 'description', fullDescription);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', fullDescription);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:url', window.location.href);
    upsertMeta('property', 'og:locale', lang === 'bn' ? 'bn_BD' : 'en_US');

    let robotsElement: HTMLMetaElement | null = null;
    if (noindex) {
      const robots = upsertMeta('name', 'robots', 'noindex, nofollow');
      if (robots.created) robotsElement = robots.element;
    }

    return () => {
      robotsElement?.remove();
    };
  }, [title, description, noindex, image, t, lang]);
}
