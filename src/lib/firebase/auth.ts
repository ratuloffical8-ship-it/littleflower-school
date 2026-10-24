// src/lib/firebase/auth.ts
import {
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type Unsubscribe,
  type User,
} from 'firebase/auth';

import { firebaseApp } from './config';

/** Firebase Authentication (email/password). Null when Firebase is not configured. */
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

/**
 * Admin sessions last only while the browser tab/window is open (session persistence),
 * so a shared school computer does not stay logged in after the browser is closed.
 */
const persistenceReady: Promise<void> = auth
  ? setPersistence(auth, browserSessionPersistence).catch(() => undefined)
  : Promise.resolve();

export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase is not configured');
  await persistenceReady;
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

/** Sends the Firebase password-reset email. */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth) throw new Error('Firebase is not configured');
  await sendPasswordResetEmail(auth, email);
}

/** Current user's ID token (null when logged out). Use forceRefresh after a role change. */
export async function getAuthToken(forceRefresh = false): Promise<string | null> {
  const user = auth?.currentUser;
  return user ? user.getIdToken(forceRefresh) : null;
}

export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

/** Simplified error kinds so the UI never reveals whether an email exists. */
export type AuthErrorKind = 'invalid' | 'tooMany' | 'network' | 'unknown';

export function getAuthErrorKind(error: unknown): AuthErrorKind {
  const code = (error as { code?: unknown } | null)?.code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/user-disabled':
      return 'invalid';
    case 'auth/too-many-requests':
      return 'tooMany';
    case 'auth/network-request-failed':
      return 'network';
    default:
      return 'unknown';
  }
}
