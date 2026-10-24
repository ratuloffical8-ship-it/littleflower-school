// src/services/adminApi.ts
import { getAuthToken } from '@/lib/firebase/auth';
import { ApiError, apiRequest, type ApiRequestOptions } from '@/services/api';

/**
 * API client for the admin panel. Every request goes to /api/admin/... with the logged-in
 * admin's Firebase ID token. The backend decides what the account may do; this file only
 * attaches the token.
 *
 *   const page = await adminApi.get<Page<Student>>(withQuery('/students', { limit: 20 }));
 *   await adminApi.post('/notices', body);
 *
 * If the server answers 401 (token too old), the request is repeated once with a fresh token.
 */

type RequestOptions = Omit<ApiRequestOptions, 'method' | 'body'>;

async function authorization(forceRefresh: boolean): Promise<Record<string, string>> {
  const token = await getAuthToken(forceRefresh);
  if (!token) {
    throw new ApiError({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Not signed in',
    });
  }
  return { Authorization: `Bearer ${token}` };
}

async function adminRequest<T>(
  path: string,
  method: NonNullable<ApiRequestOptions['method']>,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const send = async (forceRefresh: boolean): Promise<T> =>
    apiRequest<T>(`/api/admin${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      method,
      body,
      headers: { ...options.headers, ...(await authorization(forceRefresh)) },
    });

  try {
    return await send(false);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return send(true);
    }
    throw error;
  }
}

export const adminApi = {
  get: <T>(path: string, options?: RequestOptions) => adminRequest<T>(path, 'GET', undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    adminRequest<T>(path, 'POST', body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    adminRequest<T>(path, 'PUT', body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    adminRequest<T>(path, 'PATCH', body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    adminRequest<T>(path, 'DELETE', undefined, options),
};

/** Adds a query string, skipping empty values. withQuery('/students', { q: 'a', cursor: null }) -> '/students?q=a' */
export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
  }
