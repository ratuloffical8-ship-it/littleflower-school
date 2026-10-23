// src/components/BottomNav.tsx
import { Bell, FileCheck2, GraduationCap, Home, MoreHorizontal, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { useI18n } from '@/i18n';

interface TabItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

const TABS: TabItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/admission', labelKey: 'nav.admission', icon: GraduationCap },
  { to: '/results', labelKey: 'nav.results', icon: FileCheck2 },
  { to: '/notices', labelKey: 'nav.notices', icon: Bell },
];

/** Items inside the "আরও / More" sheet. */
const MORE_LINKS: { to: string; labelKey: string }[] = [
  { to: '/school-info', labelKey: 'nav.schoolInfo' },
  { to: '/payments', labelKey: 'nav.payments' },
  { to: '/gallery', labelKey: 'nav.gallery' },
  { to: '/contact', labelKey: 'nav.contact' },
  { to: '/admission/status', labelKey: 'nav.admissionStatus' },
  { to: '/faq', labelKey: 'nav.faq' },
  { to: '/privacy', labelKey: 'nav.privacy' },
];

const FOCUSABLE = 'a[href], button:not([disabled])';

export function BottomNav(): ReactElement {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const moreActive = MORE_LINKS.some(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );

  const closeSheet = (): void => {
    setOpen(false);
    moreButtonRef.current?.focus();
  };

  // Close when the page changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock page scroll and move focus into the sheet
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleSheetKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeSheet();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const tabBase =
    'relative flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors';

  return (
    <>
      {/* Tablet widths (md to lg): the layout stops padding at md, so reserve the space here */}
      <div className="hidden h-bottom-nav md:block lg:hidden" aria-hidden="true" />

      <nav
        aria-label={t('nav.bottomLabel')}
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white shadow-lift lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid h-16 grid-cols-5">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                `${tabBase} ${isActive ? 'text-royal' : 'text-ink-muted hover:text-navy'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span
                      className="absolute top-0 h-[3px] w-10 rounded-b bg-gold"
                      aria-hidden="true"
                    />
                  ) : null}
                  <tab.icon className="h-5 w-5" aria-hidden="true" />
                  <span>{t(tab.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}

          <button
            ref={moreButtonRef}
            type="button"
            className={`${tabBase} ${moreActive || open ? 'text-royal' : 'text-ink-muted hover:text-navy'}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            {moreActive ? (
              <span className="absolute top-0 h-[3px] w-10 rounded-b bg-gold" aria-hidden="true" />
            ) : null}
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            <span>{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden" onKeyDown={handleSheetKeyDown}>
          <button
            type="button"
            className="absolute inset-0 bg-navy-dark/50"
            aria-label={t('common.close')}
            tabIndex={-1}
            onClick={closeSheet}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-sheet-title"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-lift"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 id="more-sheet-title" className="text-lg">
                {t('nav.moreMenuTitle')}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                className="rounded-md p-2 text-ink-muted hover:bg-page"
                onClick={closeSheet}
                aria-label={t('nav.closeMenu')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ul className="divide-y divide-line">
              {MORE_LINKS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex min-h-[48px] items-center px-2 text-base font-medium ${
                      pathname === item.to ? 'text-royal' : 'text-ink'
                    }`}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default BottomNav;
