// src/components/Lightbox.tsx
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent, type ReactElement } from 'react';

import { useI18n } from '@/i18n';
import { formatNumber } from '@/utils/format';

export interface LightboxItem {
  id: string;
  src: string;
  alt: string;
  caption?: string;
}

interface LightboxProps {
  items: LightboxItem[];
  /** Index of the open image, or null when closed. */
  index: number | null;
  onClose: () => void;
  onChange: (index: number) => void;
}

const FOCUSABLE = 'button:not([disabled])';

/**
 * Accessible image viewer: role="dialog", Escape to close, Arrow keys to navigate,
 * focus moves into the dialog, is trapped there, and returns to the opener on close.
 */
export function Lightbox({ items, index, onClose, onChange }: LightboxProps): ReactElement | null {
  const { t, locale } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const current = index !== null ? items[index] : undefined;
  const isOpen = current !== undefined;

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [isOpen]);

  if (index === null || !current) return null;

  const total = items.length;
  const goPrev = (): void => onChange((index - 1 + total) % total);
  const goNext = (): void => onChange((index + 1) % total);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    switch (event.key) {
      case 'Escape':
        event.stopPropagation();
        onClose();
        return;
      case 'ArrowLeft':
        event.preventDefault();
        goPrev();
        return;
      case 'ArrowRight':
        event.preventDefault();
        goNext();
        return;
      case 'Tab': {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      default:
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('gallery.title')}
      className="on-dark no-print fixed inset-0 z-[80] flex flex-col bg-navy-dark/95"
      onKeyDown={handleKeyDown}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <p className="text-sm" aria-live="polite">
          {t('gallery.photoOf', {
            current: formatNumber(index + 1, locale, 0),
            total: formatNumber(total, locale, 0),
          })}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
          aria-label={t('common.close')}
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Image area (click outside the image closes) */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-14"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {total > 1 ? (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-1 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-3"
            aria-label={t('gallery.prev')}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : null}

        <img
          src={current.src}
          alt={current.alt}
          className="max-h-full max-w-full rounded object-contain"
          decoding="async"
        />

        {total > 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-1 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-3"
            aria-label={t('gallery.next')}
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Caption */}
      <div
        className="min-h-[3.5rem] px-4 py-3 text-center text-sm text-white/90"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        {current.caption ? <p>{current.caption}</p> : null}
      </div>
    </div>
  );
}

export default Lightbox;
