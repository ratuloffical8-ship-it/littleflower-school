// src/pages/Privacy.tsx
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Primitives';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';

const SECTIONS = [1, 2, 3, 4, 5, 6] as const;

export default function Privacy(): ReactElement {
  const { t } = useI18n();

  useSeo({ title: t('privacy.title') });

  return (
    <>
      <section className="on-dark bg-navy py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl !text-white md:text-4xl">{t('privacy.title')}</h1>
          <div className="gold-line mt-3" aria-hidden="true" />
        </div>
      </section>

      <section className="section bg-page">
        <div className="container max-w-3xl space-y-6">
          <Alert variant="warning">{t('privacy.draftNotice')}</Alert>

          <article className="card space-y-6 p-6">
            {SECTIONS.map((n) => (
              <section key={n} aria-labelledby={`privacy-s${n}`}>
                <h2 id={`privacy-s${n}`} className="text-xl">
                  {t(`privacy.s${n}Title`)}
                </h2>
                <p className="mt-2 text-ink">{t(`privacy.s${n}Text`)}</p>
              </section>
            ))}
          </article>

          <Link to="/contact" className="btn-outline">
            {t('nav.contact')}
          </Link>
        </div>
      </section>
    </>
  );
}
