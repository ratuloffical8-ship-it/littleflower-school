// src/pages/admin/AdminLogin.tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff, Languages } from 'lucide-react';
import { useMemo, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';

import { Logo } from '@/components/Logo';
import { ServerWakeBanner } from '@/components/ServerWakeBanner';
import { Alert, FormField, Spinner, describedBy } from '@/components/ui/Primitives';
import { useAuth } from '@/features/auth/AuthContext';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { getAuthErrorKind } from '@/lib/firebase/auth';

type Mode = 'login' | 'reset';

const DEFAULT_REDIRECT = '/admine/dashboard';

/** Only follow redirects that stay inside the admin area. */
function safeRedirect(state: unknown): string {
  const from = (state as { from?: { pathname?: unknown } } | null)?.from?.pathname;
  return typeof from === 'string' && from.startsWith('/admine/') ? from : DEFAULT_REDIRECT;
}

export default function AdminLogin(): ReactElement {
  const { t, toggleLang } = useI18n();
  const { status, configured, signIn, resetPassword, retry, signOut } = useAuth();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [resetDone, setResetDone] = useState(false);

  useSeo({ title: t('admin.loginTitle'), noindex: true });

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .email(t('validation.email')),
        password:
          mode === 'login' ? z.string().min(1, t('validation.required')) : z.string().optional(),
      }),
    [t, mode],
  );

  type LoginForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const busy = isSubmitting || status === 'loading';

  const onSubmit = handleSubmit(async (values) => {
    setErrorText('');
    setResetDone(false);

    if (mode === 'reset') {
      try {
        await resetPassword(values.email);
        setResetDone(true);
      } catch (error) {
        // Same message whether or not the account exists (no account enumeration)
        if (getAuthErrorKind(error) === 'network') {
          setErrorText(t('server.offline'));
        } else {
          setResetDone(true);
        }
      }
      return;
    }

    try {
      await signIn(values.email, values.password ?? '');
      // On success the auth listener runs the backend admin check, then this page redirects
    } catch (error) {
      const kind = getAuthErrorKind(error);
      if (kind === 'invalid') setErrorText(t('admin.invalid'));
      else if (kind === 'network') setErrorText(t('server.offline'));
      else setErrorText(t('common.errorTryAgain'));
    }
  });

  if (status === 'signedIn') {
    return <Navigate to={safeRedirect(location.state)} replace />;
  }

  const switchMode = (next: Mode): void => {
    setMode(next);
    setErrorText('');
    setResetDone(false);
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-dark via-navy to-navy-dark px-4 py-10"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }}
    >
      <ServerWakeBanner />

      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-4 top-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-white/30 px-3 text-sm font-semibold text-white hover:bg-white/10"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        aria-label={t('nav.switchLangLabel')}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        {t('nav.switchLang')}
      </button>

      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <Logo size="lg" />
            <p className="mt-3 text-sm font-semibold text-ink-muted">{t('brand.name')}</p>
            <h1 className="mt-4 text-2xl">{t('admin.loginTitle')}</h1>
            <div className="gold-line mt-3" aria-hidden="true" />
            <p className="mt-3 text-sm text-ink-muted">{t('admin.loginSubtitle')}</p>
          </div>

          <div className="mt-6 space-y-4">
            {!configured ? (
              <Alert variant="warning">
                Firebase কনফিগার করা হয়নি / Firebase is not configured (.env)
              </Alert>
            ) : null}

            {status === 'denied' ? <Alert variant="danger">{t('admin.notAdmin')}</Alert> : null}

            {status === 'error' ? (
              <Alert variant="danger">
                <p>{t('server.timeout')}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn-outline btn-sm" onClick={retry}>
                    {t('common.retry')}
                  </button>
                  <button type="button" className="btn-outline btn-sm" onClick={() => void signOut()}>
                    {t('admin.logout')}
                  </button>
                </div>
              </Alert>
            ) : null}

            {errorText ? <Alert variant="danger">{errorText}</Alert> : null}
            {resetDone ? <Alert variant="success">{t('admin.resetSent')}</Alert> : null}

            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <FormField id="admin-email" label={t('admin.email')} required error={errors.email?.message}>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={describedBy('admin-email', Boolean(errors.email))}
                  disabled={busy || !configured}
                  {...register('email')}
                />
              </FormField>

              {mode === 'login' ? (
                <FormField
                  id="admin-password"
                  label={t('admin.password')}
                  required
                  error={errors.password?.message}
                >
                  <div className="relative">
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className={`input pr-12 ${errors.password ? 'input-error' : ''}`}
                      aria-invalid={errors.password ? true : undefined}
                      aria-describedby={describedBy('admin-password', Boolean(errors.password))}
                      disabled={busy || !configured}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-ink-muted hover:text-navy"
                      aria-label={showPassword ? t('admin.hide') : t('admin.show')}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </FormField>
              ) : null}

              <button type="submit" className="btn-primary w-full" disabled={busy || !configured}>
                {busy ? (
                  <>
                    <Spinner />
                    {mode === 'login' ? t('admin.loggingIn') : t('common.loading')}
                  </>
                ) : mode === 'login' ? (
                  t('admin.login')
                ) : (
                  t('common.submit')
                )}
              </button>
            </form>

            <div className="text-center">
              {mode === 'login' ? (
                <button
                  type="button"
                  className="text-sm font-medium text-royal hover:underline"
                  onClick={() => switchMode('reset')}
                >
                  {t('admin.forgot')}
                </button>
              ) : (
                <button
                  type="button"
                  className="text-sm font-medium text-royal hover:underline"
                  onClick={() => switchMode('login')}
                >
                  {t('admin.login')}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('admin.backToSite')}
          </Link>
        </p>
      </div>
    </main>
  );
                                                  }
