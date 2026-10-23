// src/components/Footer.tsx
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube, type LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@/components/Logo';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { useI18n } from '@/i18n';
import type { SocialLinks } from '@/types';

const QUICK_LINKS: { to: string; labelKey: string }[] = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/school-info', labelKey: 'nav.schoolInfo' },
  { to: '/admission', labelKey: 'nav.admission' },
  { to: '/results', labelKey: 'nav.results' },
  { to: '/notices', labelKey: 'nav.notices' },
  { to: '/payments', labelKey: 'nav.payments' },
];

const MORE_LINKS: { to: string; labelKey: string }[] = [
  { to: '/gallery', labelKey: 'nav.gallery' },
  { to: '/contact', labelKey: 'nav.contact' },
  { to: '/admission/status', labelKey: 'nav.admissionStatus' },
  { to: '/faq', labelKey: 'nav.faq' },
  { to: '/privacy', labelKey: 'nav.privacy' },
];

const SOCIALS: { key: keyof SocialLinks; label: string; icon: LucideIcon }[] = [
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
];

/** Only allow http(s) links coming from settings. */
function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function Footer(): ReactElement {
  const { t, pick, locale } = useI18n();
  const { settings } = useSchoolSettings();

  const year = new Intl.NumberFormat(locale, { useGrouping: false }).format(
    new Date().getFullYear(),
  );
  const address = pick(settings.address);
  const phone = settings.phone?.trim();
  const email = settings.email?.trim();
  const notProvided = t('common.notProvided');

  const linkClass = 'text-sm text-white/80 hover:text-gold-soft';

  return (
    <footer className="on-dark no-print bg-navy-dark text-white">
      <div className="h-[3px] bg-gold" aria-hidden="true" />
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <Link to="/" className="inline-flex items-center gap-3">
            <Logo size="lg" decorative />
          </Link>
          <p className="mt-3 text-lg font-bold text-white">{t('brand.name')}</p>
          <p className="text-sm text-gold-soft">{t('brand.established')}</p>
          <p className="mt-2 text-sm text-white/80">{t('footer.aboutText')}</p>
        </div>

        {/* Quick links */}
        <nav aria-label={t('footer.quickLinks')}>
          <h2 className="text-base !text-gold-soft">{t('footer.quickLinks')}</h2>
          <ul className="mt-3 space-y-2">
            {QUICK_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* More links */}
        <nav aria-label={t('nav.more')}>
          <h2 className="text-base !text-gold-soft">{t('nav.more')}</h2>
          <ul className="mt-3 space-y-2">
            {MORE_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <h2 className="text-base !text-gold-soft">{t('footer.contactInfo')}</h2>
          <ul className="mt-3 space-y-3 text-sm text-white/80">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              <span>{address || notProvided}</span>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              {phone ? (
                <a href={`tel:${phone.replace(/\s+/g, '')}`} className="hover:text-gold-soft">
                  {phone}
                </a>
              ) : (
                <span>{notProvided}</span>
              )}
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              {email ? (
                <a href={`mailto:${email}`} className="break-all hover:text-gold-soft">
                  {email}
                </a>
              ) : (
                <span>{notProvided}</span>
              )}
            </li>
          </ul>

          <ul className="mt-4 flex gap-2">
            {SOCIALS.map((social) => {
              const href = safeHttpUrl(settings.social?.[social.key]);
              if (!href) return null;
              return (
                <li key={social.key}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 hover:bg-white/10"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-4 text-center text-sm text-white/70">
          {t('footer.rights', { year })}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
