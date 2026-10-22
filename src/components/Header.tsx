// src/components/Header.tsx
import { ChevronDown, Languages, Lock } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { Logo } from '@/components/Logo';
import { useI18n } from '@/i18n';

interface NavItem {
  to: string;
  labelKey: string;
  end?: boolean;
  /** Moves into the "More" dropdown on laptop widths (shown inline from xl). */
  collapseBelowXl?: boolean;
}

/** Inline links. Admission is the highlighted button, so it is not listed here. */
const MAIN_LINKS: NavItem[] = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/school-info', labelKey: 'nav.schoolInfo' },
  { to: '/results', labelKey: 'nav.results' },
  { to: '/notices', labelKey: 'nav.notices' },
  { to: '/payments', labelKey: 'nav.payments', collapseBelowXl: true },
  { to: '/gallery', labelKey: 'nav.gallery', collapseBelowXl: true },
  { to: '/contact', labelKey: 'nav.contact', collapseBelowXl: true },
];

/** Always inside the dropdown. */
const MORE_ONLY_LINKS: NavItem[] = [
  { to: '/admission/status', labelKey: 'nav.admissionStatus' },
  { to: '/faq', labelKey: 'nav.faq' },
  { to: '/privacy', labelKey: 'nav.privacy' },
];

function inlineLinkClass({ isActive }: { isActive: boolean }): string {
  return `inline-flex items-center border-b-2 px-3 py-2 text-[15px] font-medium transition-colors ${
    isActive
      ? 'border-gold text-gold-soft'
      : 'border-transparent text-white/85 hover:text-white'
  }`;
}

function menuLinkClass({ isActive }: { isActive: boolean }): string {
  return `block rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-gold-soft/60 text-navy-dark' : 'text-ink hover:bg-page'
  }`;
}

export function Header(): ReactElement {
  const { t, toggleLang } = useI18n();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when the page changes
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!moreOpen) return;
    const handlePointer = (event: MouseEvent): void => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [moreOpen]);

  return (
    <header
      className="on-dark sticky top-0 z-40 bg-navy text-white shadow-card"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="container flex h-16 items-center justify-between gap-3">
        {/* Logo + school name */}
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <Logo size="md" decorative />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-bold text-white sm:text-lg">
              {t('brand.name')}
            </span>
            <span className="hidden text-xs text-gold-soft sm:block">
              {t('brand.establishedShort')}
            </span>
          </span>
        </Link>

        {/* Desktop / laptop navigation */}
        <nav aria-label={t('nav.mainLabel')} className="hidden items-center gap-1 lg:flex">
          {MAIN_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={(state) =>
                `${inlineLinkClass(state)} ${item.collapseBelowXl ? 'hidden xl:inline-flex' : ''}`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1 border-b-2 border-transparent px-3 py-2 text-[15px] font-medium text-white/85 hover:text-white"
              aria-expanded={moreOpen}
              aria-controls="header-more-menu"
              onClick={() => setMoreOpen((open) => !open)}
            >
              {t('nav.more')}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {moreOpen ? (
              <ul
                id="header-more-menu"
                className="absolute right-0 top-full z-50 mt-1 w-56 space-y-0.5 rounded-card border border-line bg-white p-2 shadow-lift"
              >
                {MAIN_LINKS.filter((item) => item.collapseBelowXl).map((item) => (
                  <li key={item.to} className="xl:hidden">
                    <NavLink to={item.to} className={menuLinkClass}>
                      {t(item.labelKey)}
                    </NavLink>
                  </li>
                ))}
                {MORE_ONLY_LINKS.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} className={menuLinkClass}>
                      {t(item.labelKey)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/admission" className="btn-primary btn-sm hidden lg:inline-flex">
            {t('nav.applyNow')}
          </Link>

          <Link
            to="/admine"
            className="hidden rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white lg:inline-flex"
            title={t('nav.adminLogin')}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{t('nav.adminLogin')}</span>
          </Link>

          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-white/30 px-3 text-sm font-semibold text-white hover:bg-white/10"
            aria-label={t('nav.switchLangLabel')}
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
            {t('nav.switchLang')}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
