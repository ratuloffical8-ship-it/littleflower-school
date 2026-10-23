// server/src/middleware/rateLimit.ts
import type { Request, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

import { tooManyRequests } from '../utils/errors';

/**
 * Rate limiting (express-rate-limit, in-memory store).
 * NOTE: counters live in this server's memory. With ONE Render instance this is fine;
 * with several instances each keeps its own counters (use a shared store such as Redis then).
 * Requires `trust proxy` to be set (done in app.ts) so req.ip is the real client IP.
 */

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export const RATE_LIMITS = {
  /** All /api requests per IP */
  general: { windowMs: FIFTEEN_MINUTES, limit: 300 },
  /** Public submissions (admission, contact, payments, upload URLs) per IP */
  publicWrite: { windowMs: FIFTEEN_MINUTES, limit: 20 },
  /** Failed public lookups per IP + ID (status, results, payments) */
  lookupPerId: { windowMs: FIFTEEN_MINUTES, limit: 5 },
  /** Failed public lookups per IP across all IDs (stops ID guessing) */
  lookupPerIp: { windowMs: FIFTEEN_MINUTES, limit: 20 },
  /** Admin API per IP (admins are already authenticated) */
  admin: { windowMs: FIFTEEN_MINUTES, limit: 1000 },
} as const;

/** IPv6 addresses are grouped by /64 so one user cannot dodge limits by rotating addresses. */
function expandIpv6(ip: string): string[] {
  const clean = ip.split('%')[0] ?? ip;
  const halves = clean.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
  const filler =
    halves.length > 1 ? Array.from({ length: Math.max(8 - left.length - right.length, 0) }, () => '0') : [];
  return [...left, ...filler, ...right].map((group) => group.padStart(4, '0'));
}

export function clientKey(req: Request): string {
  const ip = req.ip ?? 'unknown';
  if (!ip.includes(':')) return ip;
  // IPv4-mapped IPv6, e.g. ::ffff:1.2.3.4
  if (ip.includes('.')) return ip.slice(ip.lastIndexOf(':') + 1);
  return `v6:${expandIpv6(ip).slice(0, 4).join(':')}`;
}

interface LimiterOptions {
  windowMs: number;
  limit: number;
  keyGenerator?: (req: Request) => string;
  /** Count only failed responses (status >= 400). */
  failuresOnly?: boolean;
}

function makeLimiter(options: LimiterOptions): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: options.failuresOnly ?? false,
    keyGenerator: (req) => (options.keyGenerator ? options.keyGenerator(req) : clientKey(req)),
    handler: (_req, _res, next) => {
      next(tooManyRequests());
    },
  });
}

export const generalLimiter = makeLimiter(RATE_LIMITS.general);
export const publicWriteLimiter = makeLimiter(RATE_LIMITS.publicWrite);
export const adminLimiter = makeLimiter(RATE_LIMITS.admin);

/** Reads the first present string field from the JSON body, normalised, for use in a limiter key. */
function bodyId(req: Request, fields: readonly string[]): string {
  const body: unknown = req.body;
  if (typeof body === 'object' && body !== null) {
    for (const field of fields) {
      const value = (body as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.trim() !== '') {
        return value.trim().toUpperCase().slice(0, 64);
      }
    }
  }
  return 'none';
}

/**
 * Limiters for public lookups. Only FAILED attempts count:
 *  - 5 failures per 15 min per IP + ID
 *  - 20 failures per 15 min per IP (any ID)
 * Place AFTER express.json() so the body is available.
 *
 *   router.post('/status', ...lookupLimiters('applicationId'), handler)
 */
export function lookupLimiters(...idFields: string[]): RequestHandler[] {
  return [
    makeLimiter({
      ...RATE_LIMITS.lookupPerId,
      failuresOnly: true,
      keyGenerator: (req) => `${clientKey(req)}|${bodyId(req, idFields)}`,
    }),
    makeLimiter({
      ...RATE_LIMITS.lookupPerIp,
      failuresOnly: true,
    }),
  ];
    }
