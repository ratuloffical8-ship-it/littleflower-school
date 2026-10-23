// src/pages/Home.tsx
import {
  Bell,
  BookOpen,
  ClipboardCheck,
  Clock,
  FileCheck2,
  GraduationCap,
  HeartHandshake,
  Mail,
  MapPin,
  MessagesSquare,
  MonitorSmartphone,
  Phone,
  Search,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Hero } from '@/components/Hero';
import { Badge, EmptyState, ErrorState, LoadingState, SampleBadge, SectionHeading } from '@/components/ui/Primitives';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { db } from '@/lib/firebase/config';
import type { GalleryItem, Notice } from '@/types';

/* ------------------------------------------------------------------ */
/* Local helpers                                                       */
/* ------------------------------------------------------------------ */
type LoadState<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

/** Firestore Timestamp (or ISO string) -> ISO string. */
function toIso(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function mapNotice(id: string, data: DocumentData): Notice {
  return {
    id,
    title: data.title ?? {},
    description: data.description,
    publishedAt: toIso(data.publishedAt),
    important: Boolean(data.important),
    attachmentUrl: typeof data.attachmentUrl === 'string' ? data.attachmentUrl : undefined,
  };
}

function mapGalleryItem(id: string, data: DocumentData): GalleryItem {
  return {
    id,
    title: data.title,
    caption: data.caption,
    category: typeof data.category === 'string' ? data.category : undefined,
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
    order: typeof data.order === 'number' ? data.order : undefined,
  };
}

/** Only allow embeds from Google Maps. */
function safeMapEmbed(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'www.google.com' &&
      url.pathname.startsWith('/maps/')
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function Section({
  tone = 'white',
  children,
  id,
}: {
  tone?: 'white' | 'page';
  children: ReactNode;
  id?: string;
}): ReactElement {
  return (
    <section id={id} className={`section ${tone === 'white' ? 'bg-white' : 'bg-page'}`}>
      <div className="container">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Static config                                                       */
/* ------------------------------------------------------------------ */
const QUICK_ACTIONS: { to: string; icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { to: '/admission', icon: GraduationCap, titleKey: 'home.quickAdmission', descKey: 'home.quickAdmissionDesc' },
  { to: '/results', icon: FileCheck2, titleKey: 'home.quickResults', descKey: 'home.quickResultsDesc' },
  { to: '/notices', icon: Bell, titleKey: 'home.quickNotices', descKey: 'home.quickNoticesDesc' },
  { to: '/payments', icon: Wallet, titleKey: 'home.quickPayments', descKey: 'home.quickPaymentsDesc' },
  { to: '/admission/status', icon: Search, titleKey: 'home.quickStatus', descKey: 'home.quickStatusDesc' },
];

const FACILITIES: { icon: LucideIcon; key: string }[] = [
  { icon: BookOpen, key: 'home.facility1' },
  { icon: HeartHandshake, key: 'home.facility2' },
  { icon: ShieldCheck, key: 'home.facility3' },
  { icon: ClipboardCheck, key: 'home.facility4' },
  { icon: MonitorSmartphone, key: 'home.facility5' },
  { icon: MessagesSquare, key: 'home.facility6' },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function Home(): ReactElement {
  const { t, pick, locale } = useI18n();
  const { settings } = useSchoolSettings();
  const [notices, setNotices] = useState<LoadState<Notice[]>>({ status: 'loading' });
  const [gallery, setGallery] = useState<LoadState<GalleryItem[]>>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useSeo({});

  // Public READS only: published notices and gallery items (Firestore rules allow nothing else)
  useEffect(() => {
    if (!db) {
      setNotices({ status: 'ready', data: [] });
      setGallery({ status: 'ready', data: [] });
      return;
    }
    const firestore = db;
    let active = true;

    void (async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(firestore, 'notices'),
            where('status', '==', 'published'),
            orderBy('publishedAt', 'desc'),
            limit(3),
          ),
        );
        if (active) {
          setNotices({
            status: 'ready',
            data: snapshot.docs.map((item) => mapNotice(item.id, item.data())),
          });
        }
      } catch {
        if (active) setNotices({ status: 'error' });
      }
    })();

    void (async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(firestore, 'gallery'),
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc'),
            limit(6),
          ),
        );
        if (active) {
          setGallery({
            status: 'ready',
            data: snapshot.docs
              .map((item) => mapGalleryItem(item.id, item.data()))
              .filter((item) => item.imageUrl !== ''),
          });
        }
      } catch {
        if (active) setGallery({ status: 'error' });
      }
    })();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = (): void => {
    setNotices({ status: 'loading' });
    setGallery({ status: 'loading' });
    setReloadKey((key) => key + 1);
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  };

  const announcement = pick(settings.admissionAnnouncement);
  const principalMessage = pick(settings.principalMessage);
  const principalName = pick(settings.principalName);
  const address = pick(settings.address);
  const hours = pick(settings.officeHours);
  const phone = settings.phone?.trim();
  const email = settings.email?.trim();
  const mapEmbed = safeMapEmbed(settings.mapEmbedUrl);
  const mapLink = safeHttpUrl(settings.mapLink);
  const notProvided = t('common.notProvided');

  return (
    <>
      <Hero />

      {/* 1) Quick-action cards */}
      <section className="relative z-10 -mt-8 pb-4 md:-mt-12" aria-labelledby="quick-title">
        <div className="container">
          <h2 id="quick-title" className="sr-only">
            {t('home.quickTitle')}
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.to} className="last:col-span-2 md:last:col-span-1">
                <Link
                  to={action.to}
                  className="card card-hover flex h-full flex-col items-start gap-2 p-4"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-navy text-gold">
                    <action.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-navy">{t(action.titleKey)}</span>
                  <span className="text-sm text-ink-muted">{t(action.descKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2) About the school */}
      <Section>
        <SectionHeading title={t('home.aboutTitle')} />
        <div className="max-w-3xl space-y-3">
          <p className="text-lg text-ink">{t('home.aboutText')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gold">{t('brand.established')}</Badge>
            <SampleBadge />
          </div>
          <Link to="/school-info" className="btn-outline mt-2">
            {t('hero.ctaSecondary')}
          </Link>
        </div>
      </Section>

      {/* 3) Admission announcement */}
      <section className="on-dark section bg-navy">
        <div className="container">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl !text-white md:text-3xl">{t('home.admissionTitle')}</h2>
              <div className="gold-line mt-3" aria-hidden="true" />
              <p className="mt-3 text-white/90">{announcement || t('home.admissionText')}</p>
              {!announcement ? (
                <p className="mt-2 text-xs text-gold-soft">{t('common.sampleContent')}</p>
              ) : null}
            </div>
            <Link to="/admission" className="btn-primary shrink-0">
              {t('home.admissionCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* 4) Principal's message (editable in School Settings) */}
      <Section tone="page">
        <SectionHeading title={t('home.principalTitle')} />
        <figure className="card max-w-3xl border-l-4 border-l-gold p-6">
          <blockquote className="text-lg leading-relaxed text-ink">
            {principalMessage || t('home.principalText')}
          </blockquote>
          <figcaption className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-navy">
              {principalName || t('home.principalRole')}
            </span>
            {principalName ? (
              <span className="text-sm text-ink-muted">— {t('home.principalRole')}</span>
            ) : null}
            {!principalMessage ? <SampleBadge /> : null}
          </figcaption>
        </figure>
      </Section>

      {/* 5) Classes & academic information */}
      <Section>
        <SectionHeading title={t('home.classesTitle')} />
        <div className="max-w-3xl space-y-3">
          <p className="text-lg text-ink">{t('home.classesText')}</p>
          <SampleBadge />
        </div>
      </Section>

      {/* 6) Latest notices */}
      <Section tone="page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading title={t('home.noticesTitle')} />
          <Link to="/notices" className="btn-outline btn-sm mb-8">
            {t('common.viewAll')}
          </Link>
        </div>
        {notices.status === 'loading' ? <LoadingState /> : null}
        {notices.status === 'error' ? (
          <ErrorState description={t('notices.loadError')} onRetry={reload} />
        ) : null}
        {notices.status === 'ready' && notices.data.length === 0 ? (
          <EmptyState title={t('home.noticesEmpty')} icon={Bell} />
        ) : null}
        {notices.status === 'ready' && notices.data.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-3">
            {notices.data.map((notice) => (
              <li key={notice.id} className="card flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {notice.important ? <Badge tone="danger">{t('common.important')}</Badge> : null}
                  {notice.publishedAt ? (
                    <span className="text-sm text-ink-muted">{formatDate(notice.publishedAt)}</span>
                  ) : null}
                </div>
                <p className="font-semibold text-navy">{pick(notice.title)}</p>
                <Link to="/notices" className="mt-auto text-sm font-semibold text-royal hover:underline">
                  {t('common.readMore')}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {/* 7) Result lookup shortcut */}
      <Section>
        <div className="card flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-gold">
              <FileCheck2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl">{t('home.resultTitle')}</h2>
              <p className="mt-1 text-ink-muted">{t('home.resultText')}</p>
            </div>
          </div>
          <Link to="/results" className="btn-secondary shrink-0">
            {t('home.resultCta')}
          </Link>
        </div>
      </Section>

      {/* 8) Payment & fee information */}
      <Section tone="page">
        <SectionHeading title={t('home.paymentTitle')} />
        <div className="card max-w-3xl space-y-4 p-6">
          <p className="text-ink">{t('home.paymentText')}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-page p-3">
              <dt className="text-sm text-ink-muted">{t('payments.bkash')}</dt>
              <dd className="font-semibold text-navy">{settings.bkashNumber?.trim() || notProvided}</dd>
            </div>
            <div className="rounded-lg bg-page p-3">
              <dt className="text-sm text-ink-muted">{t('payments.nagad')}</dt>
              <dd className="font-semibold text-navy">{settings.nagadNumber?.trim() || notProvided}</dd>
            </div>
          </dl>
          <Link to="/payments" className="btn-primary">
            {t('home.paymentCta')}
          </Link>
        </div>
      </Section>

      {/* 9) Gallery */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading title={t('home.galleryTitle')} />
          <Link to="/gallery" className="btn-outline btn-sm mb-8">
            {t('common.viewAll')}
          </Link>
        </div>
        {gallery.status === 'loading' ? <LoadingState /> : null}
        {gallery.status === 'error' ? (
          <ErrorState description={t('gallery.loadError')} onRetry={reload} />
        ) : null}
        {gallery.status === 'ready' && gallery.data.length === 0 ? (
          <EmptyState title={t('home.galleryEmpty')} />
        ) : null}
        {gallery.status === 'ready' && gallery.data.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.data.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-card border border-line bg-page">
                <img
                  src={item.imageUrl}
                  alt={pick(item.title) || pick(item.caption) || t('home.galleryTitle')}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {/* 10) Facilities & highlights */}
      <Section tone="page">
        <div className="flex flex-wrap items-center gap-3">
          <SectionHeading title={t('home.facilitiesTitle')} />
          <div className="mb-8">
            <SampleBadge />
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FACILITIES.map((facility) => (
            <li key={facility.key} className="card flex items-center gap-3 p-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-navy-dark">
                <facility.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-medium text-navy">{t(facility.key)}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 11) Contact + map */}
      <Section>
        <SectionHeading title={t('home.contactTitle')} />
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="card space-y-4 p-6">
            <li className="flex gap-3">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-royal" aria-hidden="true" />
              <div>
                <p className="text-sm text-ink-muted">{t('contact.address')}</p>
                <p className="font-medium text-ink">{address || notProvided}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-royal" aria-hidden="true" />
              <div>
                <p className="text-sm text-ink-muted">{t('contact.phone')}</p>
                {phone ? (
                  <a href={`tel:${phone.replace(/\s+/g, '')}`} className="font-medium text-ink hover:underline">
                    {phone}
                  </a>
                ) : (
                  <p className="font-medium text-ink">{notProvided}</p>
                )}
              </div>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-1 h-5 w-5 shrink-0 text-royal" aria-hidden="true" />
              <div>
                <p className="text-sm text-ink-muted">{t('contact.email')}</p>
                {email ? (
                  <a href={`mailto:${email}`} className="break-all font-medium text-ink hover:underline">
                    {email}
                  </a>
                ) : (
                  <p className="font-medium text-ink">{notProvided}</p>
                )}
              </div>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-1 h-5 w-5 shrink-0 text-royal" aria-hidden="true" />
              <div>
                <p className="text-sm text-ink-muted">{t('contact.hours')}</p>
                <p className="font-medium text-ink">{hours || notProvided}</p>
              </div>
            </li>
            <li>
              <Link to="/contact" className="btn-secondary">
                {t('nav.contact')}
              </Link>
            </li>
          </ul>

          <div className="card overflow-hidden">
            {mapEmbed ? (
              <iframe
                title={t('contact.map')}
                src={mapEmbed}
                className="h-72 w-full border-0 lg:h-full lg:min-h-[320px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
                <MapPin className="h-8 w-8 text-ink-muted" aria-hidden="true" />
                <p className="text-ink-muted">{t('contact.map')}: {notProvided}</p>
                {mapLink ? (
                  <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn-outline">
                    {t('contact.openMap')}
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
    }
