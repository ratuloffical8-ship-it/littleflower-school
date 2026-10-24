// src/features/auth/RequireAdmin.tsx
import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ErrorState, LoadingState } from '@/components/ui/Primitives';
import { useAuth } from '@/features/auth/AuthContext';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';

/**
 * Guards every admin page. The panel opens ONLY when the backend has confirmed that the
 * logged-in account is an active admin (status "signedIn"). A plain Firebase login is not enough.
 *
 * This is a UI guard: it decides what the browser shows. The backend re-checks every request,
 * so bypassing this component never gives access to data.
 */
export function RequireAdmin(): ReactElement {
  const { status, retry, signOut } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  // Admin pages must never appear in search engines
  useSeo({ title: 'Admin', noindex: true });

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <LoadingState />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <div className="w-full max-w-md space-y-4">
          <ErrorState description={t('server.timeout')} onRetry={retry} />
          <button type="button" className="btn-outline w-full" onClick={() => void signOut()}>
            {t('admin.logout')}
          </button>
        </div>
      </div>
    );
  }

  if (status !== 'signedIn') {
    // signedOut or denied -> login page (it shows the "no permission" message for denied)
    return <Navigate to="/admine" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default RequireAdmin;
