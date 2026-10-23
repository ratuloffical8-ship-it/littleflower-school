// server/src/middleware/auth.ts
import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';

import { adminAuth, db } from '../config/firebaseAdmin';
import {
  isAdminRole,
  permissionsForRole,
  type AdminRole,
  type Permission,
} from '../config/permissions';
import { forbidden, unauthenticated } from '../utils/errors';

export interface AdminContext {
  uid: string;
  email: string | null;
  role: AdminRole;
  permissions: readonly Permission[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAdmin after ALL admin checks passed. */
      admin?: AdminContext;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Protects admin routes. A valid Firebase login ALONE grants nothing. All must pass:
 *  1. valid, non-revoked Firebase ID token
 *  2. `role` custom claim is one of the known roles
 *  3. admins/{uid} exists and active === true
 *  4. admins/{uid}.role equals the claim (a stale claim after a role change is rejected)
 * Failure messages are intentionally generic.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) throw unauthenticated();

    let decoded: DecodedIdToken;
    try {
      // checkRevoked = true so deactivated/changed admins lose access right away
      decoded = await adminAuth.verifyIdToken(token, true);
    } catch {
      throw unauthenticated('Invalid or expired session');
    }

    const claimRole: unknown = decoded.role;
    if (!isAdminRole(claimRole)) throw forbidden();

    const snapshot = await db.collection('admins').doc(decoded.uid).get();
    if (!snapshot.exists) throw forbidden();

    const data = snapshot.data();
    if (data?.active !== true) throw forbidden();
    if (data.role !== claimRole) throw forbidden();

    req.admin = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role: claimRole,
      permissions: permissionsForRole(claimRole),
    };
    next();
  } catch (error) {
    next(error);
  }
}

/** Use inside route handlers that sit behind requireAdmin. */
export function getAdmin(req: Request): AdminContext {
  if (!req.admin) throw unauthenticated();
  return req.admin;
}
