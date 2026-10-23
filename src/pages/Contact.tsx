// src/pages/Contact.tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Facebook, Instagram, Mail, MapPin, Phone, Youtube, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, FormField, Spinner, describedBy } from '@/components/ui/Primitives';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import { ApiError, api, apiErrorMessage } from '@/services/api';
import type { SocialLinks } from '@/types';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Bengali digits and spaces/dashes -> plain Latin digits for validation. */
function normalizeMobile(value: string): string {
  return value
    .replace(/[০-৯]/g, (digit) => String(BN_DIGITS.indexOf(digit)))
    .replace(/[\s-]/g, '');
}

/** Bangladesh mobile: 01[3-9] + 8 digits, optional +88 / 88 prefix. */
const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;

function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Only allow embeds from Google Maps. */
function safeMapEmbed(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'www.google.com' &&
      url.pathname.startsWith('/maps/')
      ? url.href
      : null;
  } catch {
    return null;
  }
}

const SOCIALS: { key: keyof SocialLinks; label: string; icon: LucideIcon }[] = [
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
];

type FormStatus = 'idle' | 'sent' | 'error';

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function Contact(): ReactElement {
  const { t, pick } = useI18n();
  const { settings } = useSchoolSettings();
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorText, setErrorText] = useState('');

  useSeo({ title: t('contact.title'), description: t('contact.subtitle') });

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .min(2, t('validation.minLength', { min: 2 }))
          .max(100, t('validation.maxLength', { max: 100 })),
        mobile: z
          .string()
          .transform(normalizeMobile)
          .pipe(z.string().min(1, t('validation.required')))
          .pipe(z.string().regex(BD_MOBILE, t('validation.phone'))),
        email: z.union([
          z.literal(''),
          z.string().trim().email(t('validation.email')).max(150, t('validation.maxLength', { max: 150 })),
        ]),
        subject: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .min(3, t('validation.minLength', { min: 3 }))
          .max(150, t('validation.maxLength', { max: 150 })),
        message: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .min(10, t('validation.minLength', { min: 10 }))
          .max(2000, t('validation.maxLength', { max: 2000 })),
        // Honeypot: real users never see or fill this field
        website: z.string().max(200).optional(),
      }),
    [t],
  );

  type ContactForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', mobile: '', email: '', subject: '', message: '', website: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus('idle');
    try {
      await api.post('/api/public/contact', values);
      setStatus('sent');
      reset();
    } catch (error) {
      const isConnectionIssue =
        error instanceof ApiError && (error.code === 'timeout' || error.code === 'network');
      setErrorText(isConnectionIssue ? apiErrorMessage(error, t) : t('contact.failed'));
      setStatus('error');
    }
  });

  const address = pick(settings.address);
  const hours = pick(settings.officeHours);
  const phone = settings.phone?.trim();
  const email = settings.email?.trim();
  const mapEmbed = safeMapEmbed(settings.mapEmbedUrl);
  const mapLink = safeHttpUrl(settings.mapLink);
  const notProvided = t('common.notProvided');

  return (
    <>
      <section className="on-dark bg-navy py-10 md:py-14">
        <div className="container">
          <h1 className="text-3xl !text-white md:text-4xl">{t('contact.title')}</h1>
          <div className="gold-line mt-3" aria-hidden="true" />
          <p className="mt-4 max-w-3xl text-lg text-white/90">{t('contact.subtitle')}</p>
        </div>
      </section>

      <section className="section bg-page">
        <div className="container grid gap-6 lg:grid-cols-2">
          {/* Contact information */}
          <div className="space-y-6">
            <ul className="card space-y-4 p-6">
              <li className="flex gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-royal" aria-hidden="true" />
                <div>
                  <p className="text-sm text-ink-muted">{t('contact.address')}</p>
                  <p className="font-medium text-ink">{address || notProvided}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-1 h-5 w-5 shrink-0 text-royal" aria-hidden="true" />
                <div>
                  <p className="text-sm text-ink-muted">{t('contact.phone')}</p>
                  {phone ? (
                    <a href={`tel:${phone.replace(/\s+/g, '')}`} className="font-medium text-ink hover:underline">
                      {phone}
                    </a>
                  ) : (
                    <p className="font-medium text-ink">{notProvided}</p>
                  )}
                </div>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-1 h-5 w-5 shrink-0 text-royal" aria-hidden="true" />
                <div>
                  <p className="text-sm text-ink-muted">{t('contact.email')}</p>
                  {email ? (
                    <a href={`mailto:${email}`} className="break-all font-medium text-ink hover:underline">
                      {email}
                    </a>
                  ) : (
                    <p className="font-medium text-ink">{notProvided}</p>
                  )}
                </div>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-1 h-5 w-5 shrink-0 text-royal" aria-hidden="true" />
                <div>
                  <p className="text-sm text-ink-muted">{t('contact.hours')}</p>
                  <p className="font-medium text-ink">{hours || notProvided}</p>
                </div>
              </li>
              {SOCIALS.some((social) => safeHttpUrl(settings.social?.[social.key])) ? (
                <li>
                  <p className="mb-2 text-sm text-ink-muted">{t('contact.social')}</p>
                  <ul className="flex gap-2">
                    {SOCIALS.map((social) => {
                      const href = safeHttpUrl(settings.social?.[social.key]);
                      if (!href) return null;
                      return (
                        <li key={social.key}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-navy hover:bg-page"
                            aria-label={social.label}
                          >
                            <social.icon className="h-4 w-4" aria-hidden="true" />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ) : null}
            </ul>

            <div className="card overflow-hidden">
              {mapEmbed ? (
                <iframe
                  title={t('contact.map')}
                  src={mapEmbed}
                  className="h-64 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <MapPin className="h-8 w-8 text-ink-muted" aria-hidden="true" />
                  <p className="text-ink-muted">
                    {t('contact.map')}: {notProvided}
                  </p>
                </div>
              )}
              {mapLink ? (
                <div className="border-t border-line p-3 text-center">
                  <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
                    {t('contact.openMap')}
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          {/* Contact form */}
          <div className="card p-6">
            <h2 className="text-xl">{t('contact.formTitle')}</h2>
            <div className="gold-line mt-3" aria-hidden="true" />

            {status === 'sent' ? (
              <Alert variant="success" className="mt-4">
                {t('contact.sent')}
              </Alert>
            ) : null}
            {status === 'error' ? (
              <Alert variant="danger" className="mt-4">
                {errorText}
              </Alert>
            ) : null}

            <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
              <FormField id="contact-name" label={t('contact.name')} required error={errors.name?.message}>
                <input
                  id="contact-name"
                  type="text"
                  autoComplete="name"
                  className={`input ${errors.name ? 'input-error' : ''}`}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={describedBy('contact-name', Boolean(errors.name))}
                  {...register('name')}
                />
              </FormField>

              <FormField id="contact-mobile" label={t('contact.mobile')} required error={errors.mobile?.message}>
                <input
                  id="contact-mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  className={`input ${errors.mobile ? 'input-error' : ''}`}
                  aria-invalid={errors.mobile ? true : undefined}
                  aria-describedby={describedBy('contact-mobile', Boolean(errors.mobile))}
                  {...register('mobile')}
                />
              </FormField>

              <FormField id="contact-email" label={t('contact.emailField')} error={errors.email?.message}>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={describedBy('contact-email', Boolean(errors.email))}
                  {...register('email')}
                />
              </FormField>

              <FormField id="contact-subject" label={t('contact.subject')} required error={errors.subject?.message}>
                <input
                  id="contact-subject"
                  type="text"
                  className={`input ${errors.subject ? 'input-error' : ''}`}
                  aria-invalid={errors.subject ? true : undefined}
                  aria-describedby={describedBy('contact-subject', Boolean(errors.subject))}
                  {...register('subject')}
                />
              </FormField>

              <FormField id="contact-message" label={t('contact.message')} required error={errors.message?.message}>
                <textarea
                  id="contact-message"
                  rows={5}
                  className={`input ${errors.message ? 'input-error' : ''}`}
                  aria-invalid={errors.message ? true : undefined}
                  aria-describedby={describedBy('contact-message', Boolean(errors.message))}
                  {...register('message')}
                />
              </FormField>

              {/* Honeypot (hidden from people and screen readers) */}
              <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
              >
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  {...register('website')}
                />
              </div>

              <button type="submit" className="btn-secondary w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner />
                    {t('contact.sending')}
                  </>
                ) : (
                  t('contact.send')
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
                                                                    }
