// src/pages/Faq.tsx
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { Alert, LoadingState } from '@/components/ui/Primitives';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { db } from '@/lib/firebase/config';
import type { Faq as FaqItem } from '@/types';

type Phase = 'loading' | 'ready';

export default function Faq(): ReactElement {
  const { t, pick } = useI18n();
  const [published, setPublished] = useState<FaqItem[]>([]);
  const [phase, setPhase] = useState<Phase>(db ? 'loading' : 'ready');

  useSeo({ title: t('faq.title') });

  // Public READ: only published FAQs
  useEffect(() => {
    if (!db) return;
    const firestore = db;
    let active = true;

    void (async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(firestore, 'faqs'),
            where('status', '==', 'published'),
            orderBy('order', 'asc'),
          ),
        );
        if (active) {
          setPublished(
            snapshot.docs.map((item) => {
              const data = item.data();
              return {
                id: item.id,
                question: data.question ?? {},
                answer: data.answer ?? {},
                order: typeof data.order === 'number' ? data.order : undefined,
              };
            }),
          );
        }
      } catch {
        // On any error the draft sample FAQs below are shown instead
        if (active) setPublished([]);
      } finally {
        if (active) setPhase('ready');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const usingDraft = published.length === 0;

  const items = useMemo(() => {
    if (!usingDraft) {
      return published.map((item) => ({
        id: item.id,
        question: pick(item.question),
        answer: pick(item.answer),
      }));
    }
    return [1, 2, 3, 4, 5].map((n) => ({
      id: `draft-${n}`,
      question: t(`faq.q${n}`),
      answer: t(`faq.a${n}`),
    }));
  }, [usingDraft, published, pick, t]);

  return (
    <>
      <section className="on-dark bg-navy py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl !text-white md:text-4xl">{t('faq.title')}</h1>
          <div className="gold-line mt-3" aria-hidden="true" />
        </div>
      </section>

      <section className="section bg-page">
        <div className="container max-w-3xl space-y-4">
          {phase === 'loading' ? <LoadingState /> : null}

          {phase === 'ready' ? (
            <>
              {usingDraft ? <Alert variant="warning">{t('faq.draftNotice')}</Alert> : null}

              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <details className="card group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-navy [&::-webkit-details-marker]:hidden">
                        <span>{item.question}</span>
                        <ChevronDown
                          className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <div className="whitespace-pre-line border-t border-line p-4 text-ink">
                        {item.answer}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
