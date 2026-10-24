// src/features/auth/AuthContext.tsx
import type { User } from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import {
  auth,
  sendPasswordReset,
  signInWithEmail,
  signOutUser,
  subscribeToAuth,
} from '@/lib/firebase/auth';
import { ApiError, api } from '@/services/api';
import type { AdminRole } from '@/types';

/**
 * Admin session state.
 *
 * IMPORTANT: a valid Firebase login is NOT enough. After login the backend (GET /api/admin/me)
 * checks the role claim and the active admins/{uid} document. Only when it answers OK is the
 * status "signedIn". This context only controls what the UI shows; the backend enforces access.
 */
export type AuthStatus =
  | 'loading' // checking the session / asking the backend
  | 'signedOut'
  | 'signedIn' // valid login AND confirmed active admin by the backend
  | 'denied' // login worked but this account is not an active admin
  | 'error'; // backend could not be reached

export interface AdminProfile {
  uid: string;
  email: string | null;
  role: AdminRole;
  /** Permission keys from the backend matrix (e.g. "students.view") */
  permissions: string[];
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  admin: AdminProfile | null;
  /** False when Firebase env values are missing */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Ask the backend again (after a network error). */
  retry: () => void;
  /** UI-only check; the backend re-checks every request. */
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchAdminProfile(user: User): Promise<AdminProfile> {
  const request = async (forceRefresh: boolean): Promise<AdminProfile> => {
    const token = await user.getIdToken(forceRefresh);
    return api.get<AdminProfile>('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  try {
    return await request(false);
  } catch (error) {
    // A freshly assigned role claim only appears in a refreshed token: try once more
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return request(true);
    }
    throw error;
  }
}

export function AuthProvider({ children }: { children?: ReactNode }): ReactElement {
  const [status, setStatus] = useState<AuthStatus>(auth ? 'loading' : 'signedOut');
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  // Ignores answers from older checks when a newer one has started
  const runRef = useRef(0);
  // Remembers "denied" across the automatic sign-out that follows it
  const deniedRef = useRef(false);

  const verify = useCallback(async (nextUser: User): Promise<void> => {
    runRef.current += 1;
    const run = runRef.current;
    setStatus('loading');

    try {
      const profile = await fetchAdminProfile(nextUser);
      if (run !== runRef.current) return;
      deniedRef.current = false;
      setUser(nextUser);
      setAdmin(profile);
      setStatus('signedIn');
    } catch (error) {
      if (run !== runRef.current) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        // Not an active admin: close the session completely
        deniedRef.current = true;
        setUser(null);
        setAdmin(null);
        setStatus('denied');
        await signOutUser().catch(() => undefined);
      } else {
        setUser(nextUser);
        setAdmin(null);
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    if (!auth) return undefined;
    return subscribeToAuth((nextUser) => {
      if (nextUser) {
        void verify(nextUser);
      } else {
        runRef.current += 1;
        setUser(null);
        setAdmin(null);
        setStatus(deniedRef.current ? 'denied' : 'signedOut');
      }
    });
  }, [verify]);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    deniedRef.current = false;
    await signInWithEmail(email, password);
    // onAuthStateChanged fires next and runs the backend admin check
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    deniedRef.current = false;
    await signOutUser();
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    await sendPasswordReset(email);
  }, []);

  const retry = useCallback((): void => {
    const current = auth?.currentUser;
    if (current) void verify(current);
  }, [verify]);

  const can = useCallback(
    (permission: string): boolean => admin?.permissions.includes(permission) ?? false,
    [admin],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      admin,
      configured: auth !== null,
      signIn,
      signOut,
      resetPassword,
      retry,
      can,
    }),
    [status, user, admin, signIn, signOut, resetPassword, retry, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
