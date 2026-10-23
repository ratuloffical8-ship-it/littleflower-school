// src/components/Hero.tsx
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { useI18n } from '@/i18n';

/** Owner provides this photo. Until then the navy gradient below is shown. */
const HERO_IMAGE = '/images/students-studying.jpg';

export function Hero(): ReactElement {
  const { t } = useI18n();

  return (
    <section
      className="on-dark relative isolate flex min-h-[560px] items-end overflow-hidden bg-navy-dark md:min-h-[520px] md:items-center lg:min-h-[640px]"
      aria-labelledby="hero-title"
    >
      {/* 1) Fallback: navy gradient (visible if the photo file is missing) */}
      <div
        className="absolute inset-0 -z-30 bg-gradient-to-br from-navy-dark via-navy to-royal/60"
        aria-hidden="true"
      />

      {/* 2) Photo: cover, responsive focal point so students stay visible */}
      <div
        className="absolute inset-0 -z-20 bg-cover bg-no-repeat [background-position:60%_20%] md:[background-position:center_35%]"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        aria-hidden="true"
      />

      {/* 3) Dark-navy overlay for text contrast:
             mobile = text sits at the bottom, top of photo stays clear for faces;
             desktop = text on the left, right side of the photo stays clear */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-dark/95 via-navy-dark/70 to-navy-dark/10 md:bg-gradient-to-r md:from-navy-dark/90 md:via-navy-dark/65 md:to-navy-dark/5"
        aria-hidden="true"
      />

      <div className="container py-10 md:py-16">
        <div className="max-w-xl lg:max-w-2xl">
          <div className="h-[3px] w-14 rounded-full bg-gold" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold tracking-wide text-gold-soft">
            {t('hero.label')}
          </p>

          <h1
            id="hero-title"
            className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl"
          >
            {t('hero.title')}
          </h1>

          <p className="mt-3 text-lg font-semibold text-gold sm:text-xl">{t('hero.subtitle')}</p>

          <p className="mt-4 text-base leading-relaxed text-white/90 sm:text-lg">
            {t('hero.description')}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/admission" className="btn-primary">
              {t('hero.ctaPrimary')}
            </Link>
            <Link to="/school-info" className="btn-outline-light">
              {t('hero.ctaSecondary')}
            </Link>
          </div>

          <p className="mt-6 text-sm text-white/80">{t('hero.info')}</p>
        </div>
      </div>
    </section>
  );
}

export default Hero;
