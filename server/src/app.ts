// server/src/app.ts
import cors from 'cors';
import express, { type Express, type Router } from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimit';
import { AppError } from './utils/errors';

export interface AppRoutes {
  /** Mounted at "/" (provides GET /health). Not rate limited, not behind App Check. */
  healthRouter: Router;
  /** Mounted at "/api" (public + admin routes). */
  apiRouter: Router;
}

/**
 * Builds the Express app. Routers are passed in by src/index.ts, which keeps this file
 * free of route imports.
 *
 * Order matters: security headers -> CORS -> body parsing (with size limit) -> rate limit
 * -> routes -> 404 -> error handler.
 */
export function createApp(routes: AppRoutes): Express {
  const app = express();

  app.disable('x-powered-by');
  // Render sits behind 1 proxy; required so req.ip (rate limiting, audit logs) is the real client
  app.set('trust proxy', env.trustProxy);

  app.use(
    helmet({
      // The browser app lives on another origin and reads JSON responses
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Strict CORS: only the frontend origin(s) from FRONTEND_ORIGIN
  app.use(
    cors({
      origin: (origin, callback) => {
        // No Origin header = not a browser request (health checks, curl, server-to-server)
        if (!origin || env.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, 'FORBIDDEN', 'Origin not allowed'));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Firebase-AppCheck'],
      credentials: false,
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: env.jsonBodyLimit }));

  // Health check for Render and uptime pingers
  app.use(routes.healthRouter);

  // API: private data must never be cached by browsers or proxies
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', generalLimiter, routes.apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
    }
