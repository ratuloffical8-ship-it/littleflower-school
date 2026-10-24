// src/lib/firebase/appCheck.ts
import {
  ReCaptchaV3Provider,
  getToken,
  initializeAppCheck,
  type AppCheck,
} from 'firebase/app-check';

import { registerHeaderProvider } from '@/services/api';

import { firebaseApp } from './config';

/**
 * Firebase App Check with reCAPTCHA v3 (spam/abuse protection for public endpoints).
 * Importing this module (done once in src/main.tsx):
 *  1. starts App Check, and
 *  2. makes every API request carry the header X-Firebase-AppCheck, which the backend verifies.
 *
 * The reCAPTCHA SITE key is public. The secret key stays in Firebase Console (App Check settings).
 * Local development: set VITE_APPCHECK_DEBUG_TOKEN (dev builds only) and register that token in
 * Firebase Console > App Check > Apps > Manage debug tokens. Leave it empty in production.
 */
const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

function createAppCheck(): AppCheck | null {
  if (!firebaseApp || !siteKey || siteKey.startsWith('your-')) {
    if (import.meta.env.DEV) {
      console.warn(
        '[appCheck] Not started: set VITE_RECAPTCHA_SITE_KEY (and Firebase values) in .env. ' +
          'Use APPCHECK_ENFORCE=false on the backend for local development.',
      );
    }
    return null;
  }

  const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  if (import.meta.env.DEV && debugToken) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugToken;
  }

  try {
    return initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Already initialised (hot reload in development)
    return null;
  }
}

export const appCheck: AppCheck | null = createAppCheck();

if (appCheck) {
  registerHeaderProvider(async () => {
    const result = await getToken(appCheck, false);
    return { 'X-Firebase-AppCheck': result.token };
  });
}
