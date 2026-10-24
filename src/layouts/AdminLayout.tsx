// src/layouts/AdminLayout.tsx
import {
  Award,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarCheck,
  ClipboardList,
  Database,
  GraduationCap,
  HelpCircle,
  History,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  Languages,
  LogOut,
  Mail,
  Menu,
  Receipt,
  School,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { Logo } from '@/components/Logo';
import { ServerWakeBanner } from '@/components/ServerWakeBanner';
import { useAuth } from '@/features/auth/AuthContext';
import { useI18n } from '@/i18n';

interface AdminNavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** Shown when the admin has this permission... */
  permission?: string;
  /** ...or any of these (used for Reports). */
  anyOf?: string[];
}

/** Menu items follow the backend permission matrix. Hiding an item is UX only; the backend enforces access. */
const NAV_ITEMS: AdminNavItem[] = [
  { to: '/admine/dashboard', labelKey: 'admin.nav.dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { to: '/admine/applications', labelKey: 'admin.nav.applications', icon: ClipboardList, permission: 'applications.view' },
  { to: '/admine/students', labelKey: 'admin.nav.students', icon: GraduationCap, permission: 'students.view' },
  { to: '/admine/guardians', labelKey: 'admin.nav.guardians', icon: Users, permission: 'guardians.view' },
  { to: '/admine/classes', labelKey: 'admin.nav.classes', icon: School, permission: 'classes.view' },
  { to: '/admine/teachers', labelKey: 'admin.nav.teachers', icon: UserCog, permission: 'teachers.view' },
  { to: '/admine/attendance', labelKey: 'admin.nav.attendance', icon: CalendarCheck, permission: 'attendance.view' },
  { to: '/admine/exams', labelKey: 'admin.nav.exams', icon: BookOpenCheck, permission: 'exams.view' },
  { to: '/admine/results', labelKey: 'admin.nav.results', icon: Award, permission: 'results.view' },
  { to: '/admine/fees', labelKey: 'admin.nav.fees', icon: Receipt, permission: 'fees.view' },
  { to: '/admine/payments', labelKey: 'admin.nav.payments', icon: ShieldCheck, permission: 'payments.view' },
  { to: '/admine/finance', labelKey: 'admin.nav.finance', icon: Wallet, permission: 'expenses.view' },
  { to: '/admine/notices', labelKey: 'admin.nav.notices', icon: Bell, permission: 'notices.manage' },
  { to: '/admine/faqs', labelKey: 'admin.nav.faqs', icon: HelpCircle, permission: 'faqs.manage' },
  { to: '/admine/gallery', labelKey: 'admin.nav.gallery', icon: ImageIcon, permission: 'gallery.manage' },
  { to: '/admine/messages', labelKey: 'admin.nav.messages', icon: Mail, permission: 'messages.view' },
  {
    to: '/admine/reports',
    labelKey: 'admin.nav.reports',
    icon: BarChart3,
    anyOf: ['reports.academic', 'reports.admissions', 'reports.finance'],
  },
  { to: '/admine/settings', labelKey: 'admin.nav.settings', icon: Settings, permission: 'settings.view' },
  { to: '/admine/users', labelKey: 'admin.nav.users', icon: KeyRound, permission: 'users.view' },
  { to: '/admine/logs', labelKey: 'admin.nav.logs', icon: History, permission: 'logs.view' },
  { to: '/admine/backup', labelKey: 'admin.nav.backup', icon: Database, permission: 'backup.manage' },
];

const FOCUSABLE = 'a[href], button:not([disabled])';

function SidebarContent(): ReactElement {
  const { t } = useI18n();
  const { admin, can, signOut } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.anyOf) return item.anyOf.some((permission) => can(permission));
    return item.permission ? can(item.permission) : false;
  });

  return (
    <div className="flex h-full flex-col">
      <Link to="/admine/dashboard" className="flex items-center gap-3 px-4 py-4">
        <Logo size="md" decorative />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-base font-bold text-white">{t('brand.name')}</span>
          <span className="text-xs text-gold-soft">{t('brand.establishedShort')}</span>
        </span>
      </Link>

      <nav aria-label={t('nav.mainLabel')} className="flex-1 overflow-y-auto px-2 pb-4">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md border-l-4 px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-gold bg-white/10 text-gold-soft'
                      : 'border-transparent text-white/80 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-white/90">{admin?.email ?? ''}</p>
          <span className="badge-gold mt-1">{(admin?.role ?? '').replace(/_/g, ' ')}</span>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-md border border-white/30 px-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t('admin.logout')}
        </button>
        <Link to="/" className="block text-center text-xs text-white/70 hover:text-white">
          {t('admin.backToSite')}
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout(): ReactElement {
  const { t, toggleLang } = useI18n();
  const { admin } = useAuth();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const closeDrawer = (): void => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  };

  // Close the drawer when the page changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // While the drawer is open: lock page scroll and move focus into it
  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const handleDrawerKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab' || !drawerRef.current) return;
    const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
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

  return (
    <div className="min-h-screen bg-page">
      <ServerWakeBanner />

      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded-md focus:bg-gold focus:px-4 focus:py-2 focus:font-semibold focus:text-navy-dark"
      >
        {t('nav.skipToContent')}
      </a>

      {/* Desktop sidebar */}
      <aside className="on-dark no-print fixed inset-y-0 left-0 z-40 hidden w-64 bg-navy text-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="on-dark no-print fixed inset-0 z-50 lg:hidden" onKeyDown={handleDrawerKeyDown}>
          <button
            type="button"
            className="absolute inset-0 bg-navy-dark/60"
            aria-label={t('common.close')}
            tabIndex={-1}
            onClick={closeDrawer}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.moreMenuTitle')}
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-navy text-white shadow-lift"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeDrawer}
              className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10"
              aria-label={t('nav.closeMenu')}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarContent />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header
          className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 lg:px-8"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: '3.5rem' }}
        >
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-navy hover:bg-page lg:hidden"
            aria-label={t('nav.openMenu')}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <p className="hidden text-sm font-semibold text-navy lg:block">{t('admin.loginTitle')}</p>

          <div className="flex items-center gap-3">
            <span className="hidden max-w-[16rem] truncate text-sm text-ink-muted sm:block">
              {admin?.email ?? ''}
            </span>
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-line px-3 text-sm font-semibold text-navy hover:bg-page"
              aria-label={t('nav.switchLangLabel')}
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
              {t('nav.switchLang')}
            </button>
          </div>
        </header>

        <main id="admin-main" className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
  }
