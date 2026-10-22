// src/App.tsx
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  type ComponentType,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { LanguageProvider, useI18n } from './i18n';

/**
 * Pages, layouts and auth modules are loaded lazily through import.meta.glob.
 * This gives route-level code splitting AND lets the app start while some
 * files from later batches do not exist yet (a "not added yet" notice shows).
 *
 * Contracts:
 *  - pages/**       -> default export
 *  - layouts/*      -> default export (renders <Outlet />)
 *  - features/auth/AuthContext.tsx -> named export `AuthProvider`
 *  - features/auth/RequireAdmin.tsx -> named export `RequireAdmin` (renders <Outlet /> when allowed)
 */
type AnyModule = Record<string, unknown>;

const moduleLoaders = import.meta.glob<AnyModule>([
  './pages/**/*.tsx',
  './layouts/*.tsx',
  './features/auth/*.tsx',
]);

function loadComponent<P extends object>(
  paths: string[],
  exportName: string,
  Fallback: ComponentType<P>,
) {
  return lazy<ComponentType<P>>(async () => {
    for (const path of paths) {
      const loader = moduleLoaders[path];
      if (loader) {
        const mod = await loader();
        const found = mod[exportName] as ComponentType<P> | undefined;
        if (found) return { default: found };
      }
    }
    return { default: Fallback };
  });
}

/* ---------------------------- fallbacks ---------------------------- */

function PassThrough(): ReactElement {
  return <Outlet />;
}

function PassChildren({ children }: { children?: ReactNode }): ReactElement {
  return <>{children}</>;
}

function BlockedAdmin(): ReactElement {
  return (
    <div className="mx-auto max-w-md p-8 text-center" role="alert">
      <h1 className="text-xl">Admin guard module not found</h1>
      <p className="mt-2 text-ink-muted">
        features/auth/RequireAdmin.tsx is missing, so the admin area stays closed.
      </p>
    </div>
  );
}

function makeMissingPage(name: string): ComponentType {
  const Missing = (): ReactElement => (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl">এই পেজ এখনো যোগ করা হয়নি / Page not added yet</h1>
      <p className="mt-2 text-ink-muted">
        pages/{name}.tsx
      </p>
    </div>
  );
  return Missing;
}

function page(name: string | string[]) {
  const names = Array.isArray(name) ? name : [name];
  return loadComponent<object>(
    names.map((n) => `./pages/${n}.tsx`),
    'default',
    makeMissingPage(names[0] ?? 'unknown'),
  );
}

/* ----------------------------- layouts ----------------------------- */

const PublicLayout = loadComponent<object>(['./layouts/PublicLayout.tsx'], 'default', PassThrough);
const AdminLayout = loadComponent<object>(['./layouts/AdminLayout.tsx'], 'default', PassThrough);
const AuthProvider = loadComponent<{ children?: ReactNode }>(
  ['./features/auth/AuthContext.tsx'],
  'AuthProvider',
  PassChildren,
);
const RequireAdmin = loadComponent<object>(
  ['./features/auth/RequireAdmin.tsx'],
  'RequireAdmin',
  BlockedAdmin,
);

/* ------------------------------ pages ------------------------------ */

const Home = page('Home');
const SchoolInfo = page('SchoolInfo');
const Admission = page('Admission');
const AdmissionStatus = page('AdmissionStatus');
const Results = page('Results');
const Notices = page('Notices');
const Payments = page('Payments');
const Gallery = page('Gallery');
const Contact = page('Contact');
const Privacy = page('Privacy');
const Faq = page('Faq');
const NotFound = page('NotFound');

const AdminLogin = page('admin/AdminLogin');
const AdminDashboard = page(['admin/Dashboard', 'admin/AdminHome']);
const AdminApplications = page('admin/Applications');
const AdminApplicationDetail = page('admin/ApplicationDetail');
const AdminStudents = page('admin/Students');
const AdminStudentProfile = page('admin/StudentProfile');
const AdminGuardians = page('admin/Guardians');
const AdminClasses = page('admin/ClassesSections');
const AdminTeachers = page('admin/Teachers');
const AdminAttendance = page('admin/Attendance');
const AdminExams = page('admin/Examinations');
const AdminResults = page('admin/ResultsEntry');
const AdminFees = page('admin/FeesInvoices');
const AdminPayments = page('admin/PaymentVerification');
const AdminFinance = page('admin/IncomeExpenses');
const AdminNotices = page('admin/Notices');
const AdminFaqs = page('admin/Faqs');
const AdminGallery = page('admin/Gallery');
const AdminMessages = page('admin/ContactMessages');
const AdminReports = page('admin/Reports');
const AdminSettings = page('admin/Settings');
const AdminUsers = page('admin/AdminUsers');
const AdminLogs = page('admin/ActivityLogs');
const AdminBackup = page('admin/BackupMaintenance');
const AdminAccessDenied = page('admin/AccessDenied');

/* ---------------------------- helpers ------------------------------ */

function PageLoader(): ReactElement {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-royal"
        aria-hidden="true"
      />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}

function ScrollToTop(): null {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AdminAuthRoot(): ReactElement {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function ErrorScreen(): ReactElement {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center p-6 text-center" role="alert">
      <h1 className="text-xl">{t('common.error')}</h1>
      <p className="mt-2 text-ink-muted">{t('common.errorTryAgain')}</p>
      <button type="button" className="btn-secondary mt-6" onClick={() => window.location.reload()}>
        {t('common.retry')}
      </button>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
}
interface BoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error(error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return <ErrorScreen />;
    return this.props.children;
  }
}

/* ------------------------------- App ------------------------------- */

export default function App(): ReactElement {
  return (
    <LanguageProvider>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public website */}
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="school-info" element={<SchoolInfo />} />
              <Route path="admission" element={<Admission />} />
              <Route path="admission/status" element={<AdmissionStatus />} />
              <Route path="results" element={<Results />} />
              <Route path="notices" element={<Notices />} />
              <Route path="payments" element={<Payments />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="contact" element={<Contact />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="faq" element={<Faq />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* /admin -> /admine (intentional spelling) */}
            <Route path="/admin/*" element={<Navigate to="/admine" replace />} />

            {/* Admin: /admine is the login; everything else is guarded */}
            <Route path="/admine" element={<AdminAuthRoot />}>
              <Route index element={<AdminLogin />} />
              <Route element={<RequireAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="applications" element={<AdminApplications />} />
                  <Route path="applications/:id" element={<AdminApplicationDetail />} />
                  <Route path="students" element={<AdminStudents />} />
                  <Route path="students/:id" element={<AdminStudentProfile />} />
                  <Route path="guardians" element={<AdminGuardians />} />
                  <Route path="classes" element={<AdminClasses />} />
                  <Route path="teachers" element={<AdminTeachers />} />
                  <Route path="attendance" element={<AdminAttendance />} />
                  <Route path="exams" element={<AdminExams />} />
                  <Route path="results" element={<AdminResults />} />
                  <Route path="fees" element={<AdminFees />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="finance" element={<AdminFinance />} />
                  <Route path="notices" element={<AdminNotices />} />
                  <Route path="faqs" element={<AdminFaqs />} />
                  <Route path="gallery" element={<AdminGallery />} />
                  <Route path="messages" element={<AdminMessages />} />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="backup" element={<AdminBackup />} />
                  <Route path="access-denied" element={<AdminAccessDenied />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </LanguageProvider>
  );
}
