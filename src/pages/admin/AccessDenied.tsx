// src/pages/admin/AccessDenied.tsx
import { ShieldAlert } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';

/** Shown when an admin opens a page their role is not allowed to use. */
export default function AccessDenied(): ReactElement {
  const { t } = useI18n();

  useSeo({ title: t('admin.accessDenied'), noindex: true });

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
      <ShieldAlert className="h-12 w-12 text-danger" aria-hidden="true" />
      <h1 className="mt-4 text-2xl">{t('admin.accessDenied')}</h1>
      <div className="gold-line mt-3" aria-hidden="true" />
      <p className="mt-4 text-ink-muted" role="alert">
        {t('admin.accessDeniedText')}
      </p>
      <Link to="/admine/dashboard" className="btn-secondary mt-6">
        {t('admin.nav.dashboard')}
      </Link>
    </div>
  );
}
