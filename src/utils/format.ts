// src/utils/format.ts

/* ------------------------------------------------------------------ */
/* Dates, numbers, currency, file size                                 */
/* All formatters take the Intl locale from useI18n().locale           */
/* ("bn-BD" shows Bengali digits, "en-GB" shows English digits).       */
/* ------------------------------------------------------------------ */

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: string,
  dateStyle: 'short' | 'medium' | 'long' = 'medium',
): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale, { dateStyle }).format(date) : '';
}

export function formatDateTime(value: string | Date | null | undefined, locale: string): string {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '';
}

export function formatNumber(value: number, locale: string, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

/** Bangladeshi Taka, e.g. "৳১,২০০.০০" (bn-BD) or "BDT 1,200.00" (en-GB). */
export function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** e.g. 2097152 -> "2 MB", 512000 -> "500 KB". */
export function formatFileSize(bytes: number, locale: string): string {
  if (bytes >= 1024 * 1024) {
    return `${formatNumber(bytes / (1024 * 1024), locale, 1)} MB`;
  }
  return `${formatNumber(Math.max(1, Math.round(bytes / 1024)), locale, 0)} KB`;
}

/* ------------------------------------------------------------------ */
/* Firestore values                                                    */
/* ------------------------------------------------------------------ */

/** Firestore Timestamp / Date / ISO string -> ISO string (null if not a date). */
export function toIso(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Safe URLs (values that come from the database / admin settings)     */
/* ------------------------------------------------------------------ */

/** Returns the URL only if it is http(s); otherwise null. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Returns the URL only if it is a Google Maps embed link; otherwise null. */
export function safeMapEmbed(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'www.google.com' &&
      url.pathname.startsWith('/maps/')
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Bangladesh mobile numbers                                           */
/* ------------------------------------------------------------------ */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Bengali digits -> Latin digits. */
export function normalizeDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => String(BN_DIGITS.indexOf(digit)));
}

/** Latin digits, no spaces or dashes. */
export function normalizeMobile(value: string): string {
  return normalizeDigits(value).replace(/[\s-]/g, '');
}

/** 01[3-9] + 8 digits, with optional +88 / 88 prefix. */
export const BD_MOBILE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;

export function isValidBdMobile(value: string): boolean {
  return BD_MOBILE_REGEX.test(normalizeMobile(value));
  }
