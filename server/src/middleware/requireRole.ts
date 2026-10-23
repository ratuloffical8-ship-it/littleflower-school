// server/src/middleware/requireRole.ts
import type { RequestHandler } from 'express';

import { hasPermission, type AdminRole, type Permission } from '../config/permissions';
import { forbidden, unauthenticated } from '../utils/errors';

/**
 * Route guards. Always place AFTER requireAdmin:
 *
 *   router.use(requireAdmin);
 *   router.get('/', requirePermission('students.view'), handler);
 *
 * The permission matrix lives in config/permissions.ts.
 */

/** Allows the request when the admin's role has ANY of the given permissions. */
export function requireAnyPermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    const admin = req.admin;
    if (!admin) {
      next(unauthenticated());
      return;
    }
    if (permissions.some((permission) => hasPermission(admin.role, permission))) {
      next();
      return;
    }
    next(forbidden());
  };
}

/** Allows the request only when the admin's role has this permission. */
export function requirePermission(permission: Permission): RequestHandler {
  return requireAnyPermission(permission);
}

/** Allows only the listed roles (use sparingly; prefer permissions). */
export function requireRole(...roles: AdminRole[]): RequestHandler {
  return (req, _res, next) => {
    const admin = req.admin;
    if (!admin) {
      next(unauthenticated());
      return;
    }
    if (roles.includes(admin.role)) {
      next();
      return;
    }
    next(forbidden());
  };
}
