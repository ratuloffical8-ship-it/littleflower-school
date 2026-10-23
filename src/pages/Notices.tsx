// src/pages/Notices.tsx
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Bell, FileText } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  Spinner,
} from '@/components/ui/Primitives';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { db } from '@/lib/firebase/config';
import type { Notice } from '@/types';

const PAGE_SIZE = 10;

type CursorDoc = QueryDocumentSnapshot<DocumentData>;

interface NoticePage {
  items: Notice[];
  last: CursorDoc | null;
  hasMore: boolean;
}

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

function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function mapNotice(item: CursorDoc): Notice {
  const data = item.data();
  return {
    id: item.id,
    title: data.title ?? {},
    description: data.description,
    publishedAt: toIso(data.publishedAt),
    important: Boolean(data.important),
    attachmentUrl: typeof data.attachmentUrl === 'string' ? data.attachmentUrl : undefined,
  };
}

/** Public READ of published notices, newest first, cursor-paginated. */
async function fetchNoticePage(after: CursorDoc | null): Promise<NoticePage> {
  if (!db) return { items: [], last: null, hasMore: false };

  const base = [
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(PAGE_SIZE),
  ];
  const snapshot = await getDocs(
    after
      ? query(collection(db, 'notices'), ...base, startAfter(after))
      : query(collection(db, 'notices'), ...base),
  );

  const last = snapshot.docs.length > 0 ? (snapshot.docs[snapshot.docs.length - 1] ?? null) : null;
  return {
    items: snapshot.docs.map(mapNotice),
    last,
    hasMore: snapshot.docs.length === PAGE_SIZE,
  };
}

type Phase = 'loading' | 'ready' | 'error';

export default function Notices(): ReactElement {
  const { t, pick, locale } = useI18n();
  const [items, setItems] = useState<Notice[]>([]);
  const [cursor, setCursor] = useState<CursorDoc | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [phase, setPhase] = useState<Phase>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useSeo({ title: t('notices.title') });

  useEffect(() => {
    let active = true;
    setPhase('loading');

    fetchNoticePage(null)
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setCursor(page.last);
        setHasMore(page.hasMore);
        setPhase('ready');
      })
      .catch(() => {
        if (active) setPhase('error');
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const loadMore = async (): Promise<void> => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await fetchNoticePage(cursor);
      setItems((previous) => [...previous, ...page.items]);
      setCursor(page.last ?? cursor);
      setHasMore(page.hasMore);
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
  };

  return (
    <>
      <section className="on-dark bg-navy py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl !text-white md:text-4xl">{t('notices.title')}</h1>
          <div className="gold-line mt-3" aria-hidden="true" />
        </div>
      </section>

      <section className="section bg-page">
        <div className="container max-w-3xl">
          {phase === 'loading' ? <LoadingState /> : null}

          {phase === 'error' ? (
            <ErrorState
              description={t('notices.loadError')}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          ) : null}

          {phase === 'ready' && items.length === 0 ? (
            <EmptyState title={t('notices.empty')} icon={Bell} />
          ) : null}

          {phase === 'ready' && items.length > 0 ? (
            <>
              <ul className="space-y-4">
                {items.map((notice) => {
                  const description = pick(notice.description);
                  const attachment = safeHttpUrl(notice.attachmentUrl);
                  return (
                    <li
                      key={notice.id}
                      className={`card p-5 ${notice.important ? 'border-l-4 border-l-gold' : ''}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {notice.important ? (
                          <Badge tone="danger">{t('common.important')}</Badge>
                        ) : null}
                        {notice.publishedAt ? (
                          <span className="text-sm text-ink-muted">
                            {t('notices.published')}: {formatDate(notice.publishedAt)}
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-2 text-lg">{pick(notice.title)}</h2>
                      {description ? (
                        <p className="mt-2 whitespace-pre-line text-ink">{description}</p>
                      ) : null}
                      {attachment ? (
                        <a
                          href={attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline btn-sm mt-3"
                        >
                          <FileText className="h-4 w-4" aria-hidden="true" />
                          {t('notices.attachment')}
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {moreFailed ? (
                <p className="mt-4 text-center text-sm text-danger" role="alert">
                  {t('notices.loadError')}
                </p>
              ) : null}

              {hasMore ? (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Spinner />
                        {t('common.loading')}
                      </>
                    ) : (
                      t('common.loadMore')
                    )}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </>
  );
  }
