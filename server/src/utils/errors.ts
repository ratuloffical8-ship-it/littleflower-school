// server/src/utils/errors.ts

/**
 * Error codes sent to the browser. They match ApiErrorCode in the frontend (src/types/index.ts).
 * Response body shape: { error: { code, message, details? } }
 * Messages are short and generic on purpose: no stack traces, no hints that help attackers.
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NO_MATCH'
  | 'DUPLICATE'
  | 'RATE_LIMITED'
  | 'APP_CHECK_FAILED'
  | 'INTERNAL';

export class AppError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export const badRequest = (message = 'Invalid request', details?: unknown): AppError =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const unauthenticated = (message = 'Authentication required'): AppError =>
  new AppError(401, 'UNAUTHENTICATED', message);

export const appCheckFailed = (message = 'App Check verification failed'): AppError =>
  new AppError(401, 'APP_CHECK_FAILED', message);

export const forbidden = (message = 'Access denied'): AppError =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Not found'): AppError =>
  new AppError(404, 'NOT_FOUND', message);

/**
 * Generic mismatch for public lookups (application status, results, payments).
 * Always the same message so attackers cannot tell WHICH field was wrong.
 */
export const noMatch = (): AppError =>
  new AppError(404, 'NO_MATCH', 'Details do not match');

export const duplicate = (message = 'Duplicate record'): AppError =>
  new AppError(409, 'DUPLICATE', message);

export const tooManyRequests = (
  message = 'Too many requests. Please try again later.',
): AppError => new AppError(429, 'RATE_LIMITED', message);

export const internalError = (message = 'Internal server error'): AppError =>
  new AppError(500, 'INTERNAL', message);
