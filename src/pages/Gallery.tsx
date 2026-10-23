// src/pages/Gallery.tsx
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
import { Image as ImageIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { Lightbox, type LightboxItem } from '@/components/Lightbox';
import { EmptyState, ErrorState, LoadingState, Spinner } from '@/components/ui/Primitives';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { db } from '@/lib/firebase/config';
import type { GalleryItem } from '@/types';
import { safeHttpUrl } from '@/utils/format';

const PAGE_SIZE = 12;

type CursorDoc = QueryDocumentSnapshot<DocumentData>;

interface GalleryPage {
  items: GalleryItem[];
  last: CursorDoc | null;
  hasMore: boolean;
}

function mapItem(item: CursorDoc): GalleryItem | null {
  const data = item.data();
  const imageUrl = safeHttpUrl(typeof data.imageUrl === 'string' ? data.imageUrl : undefined);
  if (!imageUrl) return null;
  return {
    id: item.id,
    title: data.title,
    caption: data.caption,
    category: typeof data.category === 'string' && data.category.trim() ? data.category.trim() : undefined,
    imageUrl,
    order: typeof data.order === 'number' ? data.order : undefined,
  };
}

/** Public READ of published gallery items, newest first, cursor-paginated. */
async function fetchGalleryPage(after: CursorDoc | null): Promise<GalleryPage> {
  if (!db) return { items: [], last: null, hasMore: false };

  const base = [
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  ];
  const snapshot = await getDocs(
    after
      ? query(collection(db, 'gallery'), ...base, startAfter(after))
      : query(collection(db, 'gallery'), ...base),
  );

  const last = snapshot.docs.length > 0 ? (snapshot.docs[snapshot.docs.length - 1] ?? null) : null;
  const items = snapshot.docs
    .map(mapItem)
    .filter((item): item is GalleryItem => item !== null);
  return { items, last, hasMore: snapshot.docs.length === PAGE_SIZE };
}

type Phase = 'loading' | 'ready' | 'error';

export default function Gallery(): ReactElement {
  const { t, pick } = useI18n();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [cursor, setCursor] = useState<CursorDoc | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [phase, setPhase] = useState<Phase>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useSeo({ title: t('gallery.title') });

  useEffect(() => {
    let active = true;
    setPhase('loading');

    fetchGalleryPage(null)
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
      const page = await fetchGalleryPage(cursor);
      setItems((previous) => [...previous, ...page.items]);
      setCursor(page.last ?? cursor);
      setHasMore(page.hasMore);
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter((c): c is string => Boolean(c)))),
    [items],
  );

  const visible = useMemo(
    () => (category ? items.filter((item) => item.category === category) : items),
    [items, category],
  );

  const lightboxItems: LightboxItem[] = useMemo(
    () =>
      visible.map((item) => ({
        id: item.id,
        src: item.imageUrl,
        alt: pick(item.title) || pick(item.caption) || t('gallery.title'),
        caption: pick(item.caption) || pick(item.title) || undefined,
      })),
    [visible, pick, t],
  );

  const chipClass = (active: boolean): string =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'border-navy bg-navy text-white'
        : 'border-line bg-white text-navy hover:bg-page'
    }`;

  return (
    <>
      <section className="on-dark bg-navy py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl !text-white md:text-4xl">{t('gallery.title')}</h1>
          <div className="gold-line mt-3" aria-hidden="true" />
        </div>
      </section>

      <section className="section bg-page">
        <div className="container">
          {phase === 'loading' ? <LoadingState /> : null}

          {phase === 'error' ? (
            <ErrorState
              description={t('gallery.loadError')}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          ) : null}

          {phase === 'ready' && items.length === 0 ? (
            <EmptyState title={t('gallery.empty')} icon={ImageIcon} />
          ) : null}

          {phase === 'ready' && items.length > 0 ? (
            <>
              {categories.length > 0 ? (
                <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label={t('gallery.title')}>
                  <button
                    type="button"
                    className={chipClass(category === null)}
                    aria-pressed={category === null}
                    onClick={() => setCategory(null)}
                  >
                    {t('gallery.all')}
                  </button>
                  {categories.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={chipClass(category === name)}
                      aria-pressed={category === name}
                      onClick={() => setCategory(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}

              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {visible.map((item, index) => {
                  const label = pick(item.title) || pick(item.caption) || t('gallery.title');
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setOpenIndex(index)}
                        className="group block w-full overflow-hidden rounded-card border border-line bg-white text-left shadow-card"
                        aria-label={label}
                      >
                        <img
                          src={item.imageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        {pick(item.title) ? (
                          <span className="block truncate px-3 py-2 text-sm font-medium text-navy">
                            {pick(item.title)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {moreFailed ? (
                <p className="mt-4 text-center text-sm text-danger" role="alert">
                  {t('gallery.loadError')}
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

      <Lightbox
        items={lightboxItems}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onChange={setOpenIndex}
      />
    </>
  );
    }
