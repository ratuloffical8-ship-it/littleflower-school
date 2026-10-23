// src/pages/SchoolInfo.tsx
import { BookOpen, Clock, Eye, Target, type LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { Alert, Badge, SampleBadge } from '@/components/ui/Primitives';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';

const INFO_BLOCKS: { icon: LucideIcon; titleKey: string; textKey: string }[] = [
  { icon: Target, titleKey: 'schoolInfo.missionTitle', textKey: 'schoolInfo.missionText' },
  { icon: Eye, titleKey: 'schoolInfo.visionTitle', textKey: 'schoolInfo.visionText' },
  { icon: BookOpen, titleKey: 'schoolInfo.classesTitle', textKey: 'schoolInfo.classesText' },
  { icon: Clock, titleKey: 'schoolInfo.timingTitle', textKey: 'schoolInfo.timingText' },
];

export default function SchoolInfo(): ReactElement {
  const { t } = useI18n();

  useSeo({
    title: t('schoolInfo.title'),
    description: t('schoolInfo.intro'),
  });

  return (
    <>
      {/* Page header band */}
      <section className="on-dark bg-navy py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl !text-white md:text-4xl">{t('schoolInfo.title')}</h1>
          <div className="gold-line mt-3" aria-hidden="true" />
          <p className="mt-4 max-w-3xl text-lg text-white/90">{t('schoolInfo.intro')}</p>
          <div className="mt-4">
            <Badge tone="gold">{t('brand.established')}</Badge>
          </div>
        </div>
      </section>

      <section className="section bg-page">
        <div className="container space-y-6">
          <Alert variant="warning">{t('schoolInfo.sampleNote')}</Alert>

          <ul className="grid gap-4 md:grid-cols-2">
            {INFO_BLOCKS.map((block) => (
              <li key={block.titleKey} className="card flex gap-4 p-5">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-gold">
                  <block.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-2">
                  <h2 className="text-xl">{t(block.titleKey)}</h2>
                  <p className="text-ink">{t(block.textKey)}</p>
                  <SampleBadge />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/admission" className="btn-primary">
              {t('hero.ctaPrimary')}
            </Link>
            <Link to="/contact" className="btn-outline">
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
