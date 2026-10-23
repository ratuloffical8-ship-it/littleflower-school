// server/src/middleware/appCheck.ts
import type { NextFunction, Request, Response } from 'express';

import { adminAppCheck } from '../config/firebaseAdmin';
import { env } from '../config/env';
import { appCheckFailed } from '../utils/errors';

/** The frontend sends the reCAPTCHA v3 App Check token in this header (CORS must allow it). */
export const APP_CHECK_HEADER = 'x-firebase-appcheck';

/**
 * Verifies the Firebase App Check token (reCAPTCHA v3) on public endpoints.
 * Set APPCHECK_ENFORCE=false ONLY for local development.
 * App Check reduces bots and abuse; it does NOT replace validation, rate limits or auth.
 */
export async function verifyAppCheck(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!env.appCheckEnforce) {
    next();
    return;
  }

  const token = req.header(APP_CHECK_HEADER);
  if (!token) {
    next(appCheckFailed('Missing App Check token'));
    return;
  }

  try {
    await adminAppCheck.verifyToken(token);
    next();
  } catch {
    next(appCheckFailed());
  }
}
