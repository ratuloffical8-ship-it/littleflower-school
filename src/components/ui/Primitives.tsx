// src/components/ui/Primitives.tsx
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Inbox,
  Loader2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { useI18n } from '@/i18n';

/* ------------------------------------------------------------------ */
/* Spinner & loading                                                   */
/* ------------------------------------------------------------------ */
export function Spinner({ className = 'h-5 w-5' }: { className?: string }): ReactElement {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function LoadingState({ label }: { label?: string }): ReactElement {
  const { t } = useI18n();
  return (
    <div
      className="flex min-h-[160px] flex-col items-center justify-center gap-3 py-10 text-ink-muted"
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-7 w-7 text-royal" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

/** Placeholder bars while content loads. */
export function SkeletonLines({ lines = 3 }: { lines?: number }): ReactElement {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className={`skeleton h-4 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty & error states                                                */
/* ------------------------------------------------------------------ */
interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps): ReactElement {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-white px-6 py-10 text-center">
      <Icon className="h-10 w-10 text-ink-muted" aria-hidden="true" />
      <p className="mt-3 font-semibold text-navy">{title ?? t('common.empty')}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps): ReactElement {
  const { t } = useI18n();
  return (
    <div
      className="flex flex-col items-center justify-center rounded-card border border-danger/30 bg-danger/5 px-6 py-10 text-center"
      role="alert"
    >
      <XCircle className="h-10 w-10 text-danger" aria-hidden="true" />
      <p className="mt-3 font-semibold text-danger">{title ?? t('common.error')}</p>
      <p className="mt-1 max-w-md text-sm text-ink-muted">
        {description ?? t('common.errorTryAgain')}
      </p>
      {onRetry ? (
        <button type="button" className="btn-outline mt-4" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alert                                                               */
/* ------------------------------------------------------------------ */
export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const ALERT_STYLES: Record<AlertVariant, { className: string; icon: LucideIcon }> = {
  info: { className: 'alert-info', icon: Info },
  success: { className: 'alert-success', icon: CheckCircle2 },
  warning: { className: 'alert-warning', icon: AlertTriangle },
  danger: { className: 'alert-danger', icon: XCircle },
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({
  variant = 'info',
  title,
  children,
  className = '',
}: AlertProps): ReactElement {
  const { className: variantClass, icon: Icon } = ALERT_STYLES[variant];
  const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'status';
  return (
    <div className={`${variantClass} flex gap-3 ${className}`} role={role}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */
export type BadgeTone = 'gold' | 'blue' | 'success' | 'warning' | 'danger' | 'muted';

export function Badge({
  tone = 'muted',
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}): ReactElement {
  return <span className={`badge-${tone}`}>{children}</span>;
}

/** Marks placeholder content that the school must edit. */
export function SampleBadge(): ReactElement {
  const { t } = useI18n();
  return <span className="badge-warning">{t('common.sampleContent')}</span>;
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */
interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  light?: boolean;
  as?: 'h1' | 'h2';
}

export function SectionHeading({
  title,
  subtitle,
  align = 'left',
  light = false,
  as = 'h2',
}: SectionHeadingProps): ReactElement {
  const Heading = as;
  const alignClass = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  return (
    <div className={`mb-8 flex flex-col ${alignClass}`}>
      <Heading className={`section-title ${light ? '!text-white' : ''}`}>{title}</Heading>
      <div className="gold-line mt-3" aria-hidden="true" />
      {subtitle ? (
        <p className={`section-subtitle ${light ? '!text-white/80' : ''}`}>{subtitle}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form field wrapper (label + hint + error with accessible ids)        */
/* ------------------------------------------------------------------ */

/** Value for aria-describedby on the control inside <FormField id="x">. */
export function describedBy(id: string, hasError: boolean, hasHint = false): string | undefined {
  const ids = [hasError ? `${id}-error` : null, hasHint ? `${id}-hint` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

interface FormFieldProps {
  /** Must equal the id of the control rendered as children. */
  id: string;
  label: string;
  required?: boolean;
  optionalLabel?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  required = false,
  optionalLabel,
  error,
  hint,
  children,
  className = '',
}: FormFieldProps): ReactElement {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
        {optionalLabel ? (
          <span className="ml-1 font-normal text-ink-muted">({optionalLabel})</span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
                        }
