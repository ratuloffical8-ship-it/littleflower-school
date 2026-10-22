// src/i18n/index.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { bn, type Dictionary } from './bn';
import { en } from './en';

export type Lang = 'bn' | 'en';

/** Bilingual data stored in the database, e.g. notice titles. */
export interface LocalizedText {
  bn?: string;
  en?: string;
}

type Params = Record<string, string | number>;

/** Dotted keys of the dictionary, e.g. "hero.title" (use for typed helpers). */
type Paths<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
    }[keyof T & string];
export type TranslationKey = Paths<Dictionary>;

const STORAGE_KEY = 'tlfs-lang';
const DEFAULT_LANG: Lang = 'bn';

const dictionaries: Record<Lang, Dictionary> = { bn, en };
const warnedKeys = new Set<string>();

function readStoredLang(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'bn' || stored === 'en') return stored;
  } catch {
    // localStorage may be blocked; fall through to default
  }
  return DEFAULT_LANG;
}

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

interface I18nValue {
  lang: Lang;
  /** Intl locale string for number/date formatting */
  locale: string;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  /** Translate a dotted key. Supports {placeholders} via params. */
  t: (key: string, params?: Params) => string;
  /** Pick the current-language value from bilingual data, with fallback to the other language. */
  pick: (text: LocalizedText | null | undefined) => string;
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }): ReactElement {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggleLang = useCallback(() => setLangState((prev) => (prev === 'bn' ? 'en' : 'bn')), []);

  const t = useCallback(
    (key: string, params?: Params): string => {
      let text = lookup(dictionaries[lang], key) ?? lookup(dictionaries.bn, key);
      if (text === undefined) {
        if (import.meta.env.DEV && !warnedKeys.has(key)) {
          warnedKeys.add(key);
          console.warn(`[i18n] Missing translation key: ${key}`);
        }
        return key;
      }
      if (params) {
        text = text.replace(/\{(\w+)\}/g, (match, name: string) =>
          name in params ? String(params[name]) : match,
        );
      }
      return text;
    },
    [lang],
  );

  const pick = useCallback(
    (text: LocalizedText | null | undefined): string => {
      if (!text) return '';
      const primary = lang === 'bn' ? text.bn : text.en;
      const secondary = lang === 'bn' ? text.en : text.bn;
      return primary?.trim() || secondary?.trim() || '';
    },
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      locale: lang === 'bn' ? 'bn-BD' : 'en-GB',
      setLang,
      toggleLang,
      t,
      pick,
    }),
    [lang, setLang, toggleLang, t, pick],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <LanguageProvider>');
  }
  return ctx;
                                 }
