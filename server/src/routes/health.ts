// server/src/routes/health.ts
import { Router } from 'express';

/**
 * GET /health: lightweight check for Render's health check and for uptime pingers.
 * Deliberately does not touch Firestore and reveals no internal details.
 */
export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok' });
});
