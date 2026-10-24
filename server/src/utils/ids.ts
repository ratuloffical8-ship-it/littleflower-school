// server/src/utils/ids.ts

/**
 * ID formats (pure functions, unit-tested):
 *   Application ID:  TLFS-APP-YYYY-000001   (sequence padded to 6 digits)
 *   Student ID:      TLFS-STU-YYYY-0001     (sequence padded to 4 digits)
 * The sequence comes from a Firestore transaction on the `counters` collection
 * (see services/counters.ts), so two people can never receive the same ID.
 * Padding is a minimum: sequence 10000 for students becomes "TLFS-STU-2026-10000".
 */

export const APPLICATION_ID_REGEX = /^TLFS-APP-\d{4}-\d{6,}$/;
export const STUDENT_ID_REGEX = /^TLFS-STU-\d{4}-\d{4,}$/;

function assertValid(year: number, sequence: number): void {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new RangeError('Invalid year for ID');
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError('Invalid sequence for ID');
  }
}

export function formatApplicationId(year: number, sequence: number): string {
  assertValid(year, sequence);
  return `TLFS-APP-${year}-${String(sequence).padStart(6, '0')}`;
}

export function formatStudentId(year: number, sequence: number): string {
  assertValid(year, sequence);
  return `TLFS-STU-${year}-${String(sequence).padStart(4, '0')}`;
}

/** Trim + uppercase user input before matching or storing. */
export function normalizeId(input: string): string {
  return input.trim().toUpperCase();
}

export function isApplicationId(value: string): boolean {
  return APPLICATION_ID_REGEX.test(value);
}

export function isStudentId(value: string): boolean {
  return STUDENT_ID_REGEX.test(value);
}

/** Calendar year in Bangladesh time (Asia/Dhaka), so IDs change at local midnight on 1 January. */
export function currentYearInDhaka(now: Date = new Date()): number {
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
  }).format(now);
  return Number(year);
}

export type CounterKind = 'application' | 'student';

/** Document id inside the `counters` collection, e.g. "application_2026". */
export function counterDocId(kind: CounterKind, year: number): string {
  return `${kind}_${year}`;
}
