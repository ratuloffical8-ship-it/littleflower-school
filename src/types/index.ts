// src/types/index.ts
import type { LocalizedText } from '@/i18n';

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */
export const ADMIN_ROLES = [
  'super_admin',
  'school_admin',
  'accountant',
  'teacher',
  'admission_officer',
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/* ------------------------------------------------------------------ */
/* Admission                                                           */
/* Stable internal keys; labels come from i18n "status.*"               */
/* ------------------------------------------------------------------ */
export const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'correction_needed',
  'approved',
  'rejected',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */
export const PAYMENT_PROVIDERS = ['bkash', 'nagad'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = [
  'pending_verification',
  'verified',
  'rejected',
  'refunded_reversed',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/* ------------------------------------------------------------------ */
/* File uploads (frontend checks are UX only; backend re-checks)        */
/* ------------------------------------------------------------------ */
export type UploadKind = 'photo' | 'document' | 'payment_screenshot';

export const ALLOWED_UPLOAD_MIME_TYPES: Record<UploadKind, readonly string[]> = {
  photo: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  payment_screenshot: ['image/jpeg', 'image/png', 'image/webp'],
};

export const MAX_UPLOAD_BYTES: Record<UploadKind, number> = {
  photo: 2 * 1024 * 1024,
  document: 5 * 1024 * 1024,
  payment_screenshot: 3 * 1024 * 1024,
};

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* Server error body: { error: { code, message, details? } }            */
/* ------------------------------------------------------------------ */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NO_MATCH'
  | 'DUPLICATE'
  | 'RATE_LIMITED'
  | 'APP_CHECK_FAILED'
  | 'INTERNAL'
  // client-side only codes
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'unknown';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Cursor-paginated list returned by backend list endpoints. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/* ------------------------------------------------------------------ */
/* Public content (dates are ISO strings)                              */
/* ------------------------------------------------------------------ */
export interface SocialLinks {
  facebook?: string;
  youtube?: string;
  instagram?: string;
}

/** Public part of schoolSettings (document: schoolSettings/public). */
export interface SchoolSettings {
  schoolName?: LocalizedText;
  establishedYear?: number;
  address?: LocalizedText;
  phone?: string;
  email?: string;
  officeHours?: LocalizedText;
  mapLink?: string;
  mapEmbedUrl?: string;
  social?: SocialLinks;
  principalName?: LocalizedText;
  principalMessage?: LocalizedText;
  admissionAnnouncement?: LocalizedText;
  bkashNumber?: string;
  nagadNumber?: string;
  paymentInstructions?: LocalizedText;
}

export interface Notice {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  publishedAt: string | null;
  important: boolean;
  attachmentUrl?: string;
}

export interface GalleryItem {
  id: string;
  title?: LocalizedText;
  caption?: LocalizedText;
  category?: string;
  imageUrl: string;
  order?: number;
}

export interface Faq {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
  order?: number;
  }
