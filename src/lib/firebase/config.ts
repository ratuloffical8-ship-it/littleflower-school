// src/lib/firebase/config.ts
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase WEB config. These values are public by design (not secrets).
 * Security comes from Firestore/Storage rules + the backend API.
 * The browser only READS published public content from Firestore.
 * ALL writes go through the backend API (client writes are denied by rules).
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function isRealValue(value: string | undefined): value is string {
  return Boolean(value) && !String(value).startsWith('your-');
}

/** True only when real (non-placeholder) Firebase values are set in .env */
export const isFirebaseConfigured: boolean =
  isRealValue(firebaseConfig.apiKey) &&
  isRealValue(firebaseConfig.projectId) &&
  isRealValue(firebaseConfig.appId);

if (!isFirebaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[firebase] Firebase is not configured. Copy .env.example to .env and fill in your values. ' +
      'The public site will show editable sample content until then.',
  );
}

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

/** Firestore instance for public READS only. Null when Firebase is not configured. */
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
