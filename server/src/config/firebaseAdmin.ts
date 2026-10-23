// server/src/config/firebaseAdmin.ts
import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import { env } from './env';

/**
 * Firebase Admin SDK, initialised once.
 *
 * Credentials:
 *  - Render / production: FIREBASE_SERVICE_ACCOUNT_JSON (set ONLY in the Render dashboard)
 *  - Local development: Application Default Credentials, i.e. GOOGLE_APPLICATION_CREDENTIALS
 *    pointing to a service-account file stored OUTSIDE the repository.
 * Secrets are never written to code, logs or GitHub.
 */
function createApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    credential: env.serviceAccount ? cert(env.serviceAccount) : applicationDefault(),
    projectId: env.firebaseProjectId,
    storageBucket: env.firebaseStorageBucket,
  });
}

export const adminApp: App = createApp();

export const adminAuth = getAuth(adminApp);

export const db = getFirestore(adminApp);
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch {
  // settings() throws if Firestore was already used (e.g. module reloaded in tests); safe to ignore
}

/** Default Cloud Storage bucket (private paths only; the backend issues signed URLs). */
export const storageBucket = getStorage(adminApp).bucket();

export const adminAppCheck = getAppCheck(adminApp);

export { FieldValue, Timestamp };
