// src/hooks/useSchoolSettings.ts
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { db } from '@/lib/firebase/config';
import type { SchoolSettings } from '@/types';

/**
 * Reads the PUBLIC school settings (Firestore document schoolSettings/public).
 * Cached for the whole session and shared between components.
 * When Firebase is not configured, or the document does not exist, settings is {}
 * and pages show "Editable sample content" placeholders.
 * Editing settings happens in the admin panel through the backend API (never from here).
 */
let cached: SchoolSettings | null = null;
let inflight: Promise<SchoolSettings> | null = null;

async function fetchSettings(force: boolean): Promise<SchoolSettings> {
  if (!db) return {};
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;

  const request = getDoc(doc(db, 'schoolSettings', 'public'))
    .then((snapshot) => {
      const data = snapshot.exists() ? (snapshot.data() as SchoolSettings) : {};
      cached = data;
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  inflight = request;
  return request;
}

interface UseSchoolSettingsResult {
  settings: SchoolSettings;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

export function useSchoolSettings(): UseSchoolSettingsResult {
  const [settings, setSettings] = useState<SchoolSettings>(cached ?? {});
  const [loading, setLoading] = useState<boolean>(cached === null && db !== null);
  const [error, setError] = useState<boolean>(false);

  const load = useCallback(async (force: boolean): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      setSettings(await fetchSettings(force));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!db) return;
    if (cached !== null) {
      setSettings(cached);
      return;
    }
    void load(false);
  }, [load]);

  const reload = useCallback(() => {
    void load(true);
  }, [load]);

  return { settings, loading, error, reload };
                                                  }
