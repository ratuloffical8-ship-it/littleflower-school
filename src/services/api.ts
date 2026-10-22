// src/services/api.ts
import type { ApiErrorBody } from '@/types';

/**
 * Base API client for the backend (Render Web Service).
 *
 * Handles Render free-plan cold starts:
 *  - a request slower than WAKE_NOTICE_MS shows the "Server is waking up…" banner
 *  - network errors / 502 / 503 / 504 are retried (see rules below)
 *  - the banner shows a "failed" state with retry when all attempts fail
 *
 * Retry rules (to avoid double submissions):
 *  - GET/HEAD: retried on network error, timeout, 502, 503, 504
 *  - POST/PUT/PATCH/DELETE: retried ONLY on 502/503/504 (the proxy answered, so the
 *    app did not process the request). Network errors/timeouts are NOT retried
 *    unless `retryUnsafe: true` is set.
 */

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '');

const WAKE_NOTICE_MS = 3500;
const DEFAULT_TIMEOUT_MS = 75_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2500;
const RETRYABLE_STATUSES = [502, 503, 504];

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  /** True when the server may already have processed the request (network error / timeout). */
  readonly maybeProcessed: boolean;
  readonly details?: unknown;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    retryable?: boolean;
    maybeProcessed?: boolean;
    details?: unknown;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.retryable = init.retryable ?? false;
    this.maybeProcessed = init.maybeProcessed ?? false;
    this.details = init.details;
  }
}

/** Turn any error into a user-facing message using the i18n `t` function. */
export function apiErrorMessage(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    if (err.code === 'timeout' || err.code === 'network') {
      return t('server.timeout');
    }
  }
  return t('common.errorTryAgain');
}

/* ------------------------------------------------------------------ */
/* Server status store (read by <ServerWakeBanner />)                  */
/* ------------------------------------------------------------------ */
export type ApiStatus = 'idle' | 'waking' | 'retrying' | 'failed';

let wakingCount = 0;
let retryingCount = 0;
let failedFlag = false;
let currentStatus: ApiStatus = 'idle';
const listeners = new Set<() => void>();

function recompute(): void {
  const next: ApiStatus =
    retryingCount > 0 ? 'retrying' : wakingCount > 0 ? 'waking' : failedFlag ? 'failed' : 'idle';
  if (next !== currentStatus) {
    currentStatus = next;
    listeners.forEach((listener) => listener());
  }
}

export function getApiStatus(): ApiStatus {
  return currentStatus;
}

export function subscribeApiStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hide the "failed" banner. */
export function resetApiStatus(): void {
  failedFlag = false;
  recompute();
}

function createTracker(silent: boolean) {
  let waking = false;
  let retrying = false;
  return {
    markWaking(): void {
      if (silent || waking) return;
      waking = true;
      wakingCount += 1;
      recompute();
    },
    markRetrying(): void {
      if (silent || retrying) return;
      retrying = true;
      retryingCount += 1;
      recompute();
    },
    finish(): void {
      if (waking) {
        wakingCount -= 1;
        waking = false;
      }
      if (retrying) {
        retryingCount -= 1;
        retrying = false;
      }
      recompute();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Header providers (App Check token, etc. registered by other modules) */
/* ------------------------------------------------------------------ */
type HeaderProvider = () => Promise<Record<string, string>>;
const headerProviders: HeaderProvider[] = [];

/** Register a function that returns extra headers for every request (e.g. X-Firebase-AppCheck). */
export function registerHeaderProvider(provider: HeaderProvider): void {
  headerProviders.push(provider);
}

async function collectProviderHeaders(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const provider of headerProviders) {
    try {
      Object.assign(result, await provider());
    } catch {
      // A failing provider must not break the request; the server will reject if needed.
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Max retry count (default 2). */
  retries?: number;
  /** Allow retrying non-GET requests after network errors/timeouts (risk of duplicates). */
  retryUnsafe?: boolean;
  /** Do not show the server banner for this request. */
  silent?: boolean;
  signal?: AbortSignal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const err = (value as { error?: unknown }).error;
  return typeof err === 'object' && err !== null && typeof (err as { code?: unknown }).code === 'string';
}

async function singleAttempt<T>(
  url: string,
  options: ApiRequestOptions,
  onSlow: () => void,
): Promise<T> {
  const { method = 'GET', body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;

  const controller = new AbortController();
  let timedOut = false;

  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const slowTimer = setTimeout(onSlow, WAKE_NOTICE_MS);

  const onExternalAbort = (): void => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort);
  }

  try {
    const providerHeaders = await collectProviderHeaders();
    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...providerHeaders,
      ...headers,
    };
    if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: 'omit',
      });
    } catch {
      if (timedOut) {
        throw new ApiError({
          status: 0,
          code: 'timeout',
          message: 'Request timed out',
          retryable: true,
          maybeProcessed: true,
        });
      }
      if (signal?.aborted) {
        throw new ApiError({ status: 0, code: 'aborted', message: 'Request aborted' });
      }
      throw new ApiError({
        status: 0,
        code: 'network',
        message: 'Network error',
        retryable: true,
        maybeProcessed: true,
      });
    }

    const data = await parseBody(response);

    if (!response.ok) {
      const retryable = RETRYABLE_STATUSES.includes(response.status);
      if (isErrorBody(data)) {
        throw new ApiError({
          status: response.status,
          code: data.error.code,
          message: data.error.message,
          details: data.error.details,
          retryable,
        });
      }
      throw new ApiError({
        status: response.status,
        code: response.status === 429 ? 'RATE_LIMITED' : 'unknown',
        message: `Request failed (${response.status})`,
        retryable,
      });
    }

    return data as T;
  } finally {
    clearTimeout(timeoutTimer);
    clearTimeout(slowTimer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const isSafeMethod = method === 'GET';
  const maxRetries = options.retries ?? MAX_RETRIES;
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const tracker = createTracker(options.silent ?? false);

  let attempt = 0;
  try {
    for (;;) {
      try {
        const data = await singleAttempt<T>(url, options, () => tracker.markWaking());
        failedFlag = false;
        return data;
      } catch (err) {
        const canRetry =
          err instanceof ApiError &&
          err.retryable &&
          attempt < maxRetries &&
          (isSafeMethod || options.retryUnsafe === true || !err.maybeProcessed) &&
          !options.signal?.aborted;

        if (!canRetry) {
          if (err instanceof ApiError && err.retryable && !options.silent) {
            failedFlag = true;
          }
          throw err;
        }

        attempt += 1;
        tracker.markRetrying();
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  } finally {
    tracker.finish();
  }
}

/** Convenience helpers. */
export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

/** Ping GET /health to wake the server. Returns true when the server answered. */
export async function warmUpServer(options: { silent?: boolean } = {}): Promise<boolean> {
  try {
    await apiRequest<unknown>('/health', { retries: 1, silent: options.silent });
    return true;
  } catch {
    return false;
  }
    }
