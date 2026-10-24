// server/src/schemas/admission.ts
import { z } from 'zod';

import { APPLICATION_ID_REGEX, normalizeId } from '../utils/ids';

/**
 * Server-side validation for the admission flow. The browser validates the same things only
 * for convenience; THIS is the check that counts.
 */

/* ------------------------------------------------------------------ */
/* Shared helpers (also imported by other schemas, e.g. payments)       */
/* ------------------------------------------------------------------ */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Bengali digits -> Latin digits. */
export function normalizeDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => String(BN_DIGITS.indexOf(digit)));
}

/** Canonical Bangladesh mobile: 01XXXXXXXXX (Latin digits, no spaces, no +88 / 88 prefix). */
export function normalizeMobile(value: string): string {
  let result = normalizeDigits(value).replace(/[\s-]/g, '');
  if (result.startsWith('+88')) result = result.slice(3);
  else if (result.startsWith('88') && result.length === 13) result = result.slice(2);
  return result;
}

export const bdMobileSchema = z
  .string()
  .transform(normalizeMobile)
  .pipe(z.string().regex(/^01[3-9]\d{8}$/, 'Invalid mobile number'));

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const text = (min: number, max: number) =>
  z.string().trim().min(min, 'Required').max(max, 'Too long');

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, 'Too long').optional());

const optionalMobile = z.preprocess(emptyToUndefined, bdMobileSchema.optional());

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().toLowerCase().email('Invalid email').max(150, 'Too long').optional(),
);

/** Today's date (YYYY-MM-DD) in Bangladesh time. */
function todayInDhaka(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Date of birth as YYYY-MM-DD: a real date, not in the future, not older than 30 years. */
export const dateOfBirthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
  .refine(isRealDate, 'Invalid date')
  .refine((value) => value <= todayInDhaka(), 'Date cannot be in the future')
  .refine((value) => Number(value.slice(0, 4)) >= Number(todayInDhaka().slice(0, 4)) - 30, 'Invalid date');

/* ------------------------------------------------------------------ */
/* Status values (same keys as the frontend)                            */
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
/* Uploaded document references                                         */
/* ------------------------------------------------------------------ */
export const DOCUMENT_KINDS = ['birth_registration', 'photo', 'previous_result', 'other'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** File ids are created by the backend when it issues an upload URL: "<kind>-<16 hex>.<ext>" */
export const FILE_ID_REGEX = /^(birth_registration|photo|previous_result|other)-[a-f0-9]{16}\.(jpg|png|webp|pdf)$/;

const documentRefSchema = z
  .object({
    kind: z.enum(DOCUMENT_KINDS),
    fileId: z.string().regex(FILE_ID_REGEX, 'Invalid file reference'),
  })
  .refine((doc) => doc.fileId.startsWith(`${doc.kind}-`), 'File does not match its type')
  .refine((doc) => !(doc.kind === 'photo' && doc.fileId.endsWith('.pdf')), 'Photo must be an image');

export type DocumentRef = z.infer<typeof documentRefSchema>;

/* ------------------------------------------------------------------ */
/* Admission submission                                                 */
/* ------------------------------------------------------------------ */
const studentSchema = z.object({
  nameBn: text(2, 100).refine((value) => /[\u0980-\u09FF]/.test(value), 'Name must be written in Bengali'),
  nameEn: text(2, 100).regex(/^[A-Za-z][A-Za-z .'-]*$/, 'Name must be written in English letters'),
  dob: dateOfBirthSchema,
  gender: z.enum(['male', 'female', 'other']),
  birthRegNo: z
    .string()
    .transform((value) => normalizeDigits(value).replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^\d{10,20}$/, 'Invalid birth registration number')),
  classId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,50}$/, 'Invalid class'),
  previousSchool: optionalText(150),
  previousClassResult: optionalText(300),
  presentAddress: text(5, 300),
  permanentAddress: text(5, 300),
});

const guardianSchema = z
  .object({
    fatherName: text(2, 100),
    motherName: text(2, 100),
    guardianName: optionalText(100),
    guardianRelation: optionalText(50),
    primaryMobile: bdMobileSchema,
    secondaryMobile: optionalMobile,
    email: optionalEmail,
    address: optionalText(300),
  })
  .refine((guardian) => !guardian.guardianName || Boolean(guardian.guardianRelation), {
    message: 'Relationship is required when a guardian name is given',
    path: ['guardianRelation'],
  });

export const admissionSubmitSchema = z
  .object({
    /** Random id created by the browser when the form opens; groups the uploaded files. */
    uploadSessionId: z.string().uuid(),
    student: studentSchema,
    guardian: guardianSchema,
    documents: z.array(documentRefSchema).max(6),
    consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
    /** Honeypot: must stay empty (checked in the route). */
    website: z.string().max(200).optional(),
  })
  .superRefine((value, context) => {
    const count = (kind: DocumentKind): number =>
      value.documents.filter((doc) => doc.kind === kind).length;

    if (count('birth_registration') !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documents'],
        message: 'Exactly one birth registration document is required',
      });
    }
    if (count('photo') !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documents'],
        message: 'Exactly one student photo is required',
      });
    }
  });

export type AdmissionSubmitInput = z.infer<typeof admissionSubmitSchema>;

/* ------------------------------------------------------------------ */
/* Public status lookup: Application ID + guardian primary mobile       */
/* ------------------------------------------------------------------ */
export const applicationStatusLookupSchema = z.object({
  applicationId: z
    .string()
    .transform(normalizeId)
    .pipe(z.string().regex(APPLICATION_ID_REGEX, 'Invalid application ID')),
  mobile: bdMobileSchema,
  website: z.string().max(200).optional(),
});

export type ApplicationStatusLookupInput = z.infer<typeof applicationStatusLookupSchema>;

/* ------------------------------------------------------------------ */
/* Admin review actions                                                 */
/* ------------------------------------------------------------------ */
export const applicationActionSchema = z
  .object({
    action: z.enum(['start_review', 'request_correction', 'approve', 'reject']),
    /** Shown to the guardian on the status page (required when asking for a correction). */
    publicNote: optionalText(500),
    /** Internal only; never shown to the public (required when rejecting). */
    internalNote: optionalText(1000),
  })
  .superRefine((value, context) => {
    if (value.action === 'request_correction' && !value.publicNote) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publicNote'],
        message: 'Explain what must be corrected',
      });
    }
    if (value.action === 'reject' && !value.internalNote) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['internalNote'],
        message: 'A reason is required when rejecting',
      });
    }
  });

export type ApplicationActionInput = z.infer<typeof applicationActionSchema>;
