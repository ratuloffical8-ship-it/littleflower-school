// src/pages/NotFound.tsx
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';

export default function NotFound(): ReactElement {
  const { t } = useI18n();

  useSeo({ title: t('notFound.title'), noindex: true });

  return (
    <section className="section bg-page">
      <div className="container flex min-h-[50vh] max-w-xl flex-col items-center justify-center text-center">
        <p className="text-6xl font-bold text-gold" aria-hidden="true">
          404
        </p>
        <h1 className="mt-4 text-2xl md:text-3xl">{t('notFound.title')}</h1>
        <div className="gold-line mt-3" aria-hidden="true" />
        <p className="mt-4 text-ink-muted">{t('notFound.text')}</p>
        <Link to="/" className="btn-secondary mt-6">
          {t('common.goHome')}
        </Link>
      </div>
    </section>
  );
                                              }
