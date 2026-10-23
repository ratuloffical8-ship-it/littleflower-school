// server/src/routes/index.ts
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { Router } from 'express';

import { env } from '../config/env';
import { verifyAppCheck } from '../middleware/appCheck';
import { requireAdmin } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimit';

/**
 * ROUTE REGISTRY
 *
 * Every file inside routes/public/ and routes/admin/ is mounted automatically.
 * Each file must default-export { path, router }:
 *
 *   import type { RouteModule } from '../index';
 *   const router = Router();
 *   router.get('/', requirePermission('students.view'), asyncHandler(async (req, res) => { ... }));
 *   export default { path: '/students', router } satisfies RouteModule;
 *
 * Security is applied HERE, once, so a route file cannot forget it:
 *   /api/public/*  -> App Check (reCAPTCHA v3) verification.
 *                     Each route adds its own validation, rate limits and honeypot check.
 *   /api/admin/*   -> admin rate limit + requireAdmin (valid token + role claim + active admins doc).
 *                     Each route adds requirePermission(...) for its own permission.
 */
export interface RouteModule {
  path: string;
  router: Router;
}

function isRouteModule(value: unknown): value is RouteModule {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { path?: unknown; router?: unknown };
  return (
    typeof candidate.path === 'string' &&
    candidate.path.startsWith('/') &&
    typeof candidate.router === 'function'
  );
}

/** Mounts every route file of a folder onto `target`. Returns the mounted paths. */
function mountFolder(target: Router, folder: 'public' | 'admin'): string[] {
  const directory = path.join(__dirname, folder);

  let files: string[];
  try {
    files = readdirSync(directory);
  } catch {
    return []; // folder does not exist yet
  }

  const routeFiles = files
    .filter((file) => /\.(ts|js)$/.test(file) && !file.endsWith('.d.ts'))
    .sort();

  const mounted: string[] = [];
  for (const file of routeFiles) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require(path.join(directory, file)) as { default?: unknown };
    const routeModule = loaded.default ?? loaded;
    if (!isRouteModule(routeModule)) {
      throw new Error(
        `routes/${folder}/${file} must default-export { path: '/something', router }`,
      );
    }
    target.use(routeModule.path, routeModule.router);
    mounted.push(`/${folder}${routeModule.path}`);
  }
  return mounted;
}

const publicRouter = Router();
publicRouter.use(verifyAppCheck);

const adminRouter = Router();
adminRouter.use(adminLimiter, requireAdmin);

const mountedPaths = [...mountFolder(publicRouter, 'public'), ...mountFolder(adminRouter, 'admin')];

export const apiRouter = Router();
apiRouter.use('/public', publicRouter);
apiRouter.use('/admin', adminRouter);

if (!env.isTest) {
  console.log(`[routes] ${mountedPaths.length} route group(s) mounted under /api`);
                              }
