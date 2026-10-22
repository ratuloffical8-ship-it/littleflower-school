// src/layouts/PublicLayout.tsx
import { Suspense, lazy, type ComponentType, type ReactElement } from 'react';
import { Outlet } from 'react-router-dom';

import { Header } from '@/components/Header';
import { ServerWakeBanner } from '@/components/ServerWakeBanner';
import { useI18n } from '@/i18n';

/**
 * Footer and BottomNav are loaded through import.meta.glob so this layout works
 * even before those files exist (they arrive in a later batch).
 * Contract: both files must have a default export.
 */
const optionalParts = import.meta.glob<{ default: ComponentType }>([
  '../components/Footer.tsx',
  '../components/BottomNav.tsx',
]);

const Nothing = (): null => null;

function loadOptional(path: string) {
  return lazy<ComponentType>(async () => {
    const loader = optionalParts[path];
    return loader ? loader() : { default: Nothing };
  });
}

const Footer = loadOptional('../components/Footer.tsx');
const BottomNav = loadOptional('../components/BottomNav.tsx');

export default function PublicLayout(): ReactElement {
  const { t } = useI18n();

  return (
    // pb-nav reserves space so the fixed mobile bottom bar never covers content
    <div className="pb-nav flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded-md focus:bg-gold focus:px-4 focus:py-2 focus:font-semibold focus:text-navy-dark"
      >
        {t('nav.skipToContent')}
      </a>

      <ServerWakeBanner />
      <Header />

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <Suspense fallback={null}>
        <Footer />
        <BottomNav />
      </Suspense>
    </div>
  );
}
