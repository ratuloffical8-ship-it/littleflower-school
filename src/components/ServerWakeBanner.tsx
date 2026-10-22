// src/components/ServerWakeBanner.tsx
import { Loader2, ServerCrash, X } from 'lucide-react';
import { useState, useSyncExternalStore, type ReactElement } from 'react';

import { useI18n } from '@/i18n';
import { getApiStatus, resetApiStatus, subscribeApiStatus, warmUpServer } from '@/services/api';

/**
 * Shows "Server is waking up…" while the Render free-plan backend cold-starts,
 * and a retry option if the server could not be reached.
 * Render once inside each layout (public and admin).
 */
export function ServerWakeBanner(): ReactElement | null {
  const { t } = useI18n();
  const status = useSyncExternalStore(subscribeApiStatus, getApiStatus, getApiStatus);
  const [retrying, setRetrying] = useState(false);

  if (status === 'idle') return null;

  const handleRetry = async (): Promise<void> => {
    setRetrying(true);
    resetApiStatus();
    await warmUpServer();
    setRetrying(false);
  };

  if (status === 'failed') {
    return (
      <div
        className="no-print fixed inset-x-0 top-0 z-[60] bg-danger px-4 pb-2 text-white shadow-lift"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
        role="alert"
      >
        <div className="container flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <ServerCrash className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('server.timeout')}
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-white/60 px-3 py-1 font-semibold hover:bg-white/10 disabled:opacity-60"
              onClick={() => void handleRetry()}
              disabled={retrying}
            >
              {t('common.retry')}
            </button>
            <button
              type="button"
              className="rounded p-1 hover:bg-white/10"
              onClick={resetApiStatus}
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="no-print on-dark fixed inset-x-0 top-0 z-[60] bg-navy-dark px-4 pb-2 text-white shadow-lift"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
      role="status"
      aria-live="polite"
    >
      <div className="container flex items-start gap-2 text-sm">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-gold" aria-hidden="true" />
        <div>
          <p className="font-semibold text-gold-soft">
            {status === 'retrying' ? t('server.retrying') : t('server.wakingUp')}
          </p>
          <p className="text-white/80">{t('server.wakingUpHint')}</p>
        </div>
      </div>
    </div>
  );
}

export default ServerWakeBanner;
