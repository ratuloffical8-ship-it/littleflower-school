// src/pages/admin/AdminHome.tsx
import type { ReactElement } from 'react';

import { Alert } from '@/components/ui/Primitives';
import { useAuth } from '@/features/auth/AuthContext';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';

/**
 * Landing page after login. It is replaced automatically by pages/admin/Dashboard.tsx
 * (with real statistics) once that file exists. It shows no numbers, so nothing here can be fake.
 */
export default function AdminHome(): ReactElement {
  const { t } = useI18n();
  const { admin } = useAuth();

  useSeo({ title: t('admin.nav.dashboard'), noindex: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl">{t('admin.nav.dashboard')}</h1>
        <div className="gold-line mt-3" aria-hidden="true" />
      </header>

      <section className="card space-y-3 p-6">
        <h2 className="text-xl">স্বাগতম / Welcome</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-page p-3">
            <dt className="text-sm text-ink-muted">{t('admin.email')}</dt>
            <dd className="break-all font-medium text-navy">{admin?.email ?? '—'}</dd>
          </div>
          <div className="rounded-lg bg-page p-3">
            <dt className="text-sm text-ink-muted">ভূমিকা / Role</dt>
            <dd className="font-medium capitalize text-navy">
              {(admin?.role ?? '—').replace(/_/g, ' ')}
            </dd>
          </div>
        </dl>
      </section>

      <Alert variant="info">
        বাম পাশের মেনু থেকে কাজ বেছে নিন। / Use the menu on the left to continue.
      </Alert>
    </div>
  );
    }
