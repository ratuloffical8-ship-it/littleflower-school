// server/src/routes/admin/me.ts
import { Router } from 'express';

import { getAdmin } from '../../middleware/auth';
import type { RouteModule } from '../index';

/**
 * GET /api/admin/me
 * Reached only after requireAdmin (mounted in routes/index.ts) has confirmed:
 * valid token + role claim + active admins/{uid} document + matching role.
 * The admin panel calls this right after login: if it answers 200 the account is a
 * confirmed admin and the response says which menu items/permissions it has.
 * (Hiding menu items is only UX; every other admin route checks its own permission.)
 */
const router = Router();

router.get('/', (req, res) => {
  const admin = getAdmin(req);
  res.json({
    uid: admin.uid,
    email: admin.email,
    role: admin.role,
    permissions: [...admin.permissions],
  });
});

export default { path: '/me', router } satisfies RouteModule;
