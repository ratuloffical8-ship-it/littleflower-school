// server/src/utils/validate.ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

import { badRequest } from './errors';

/**
 * Express 4 does not catch rejected promises from async handlers.
 * Wrap EVERY async route handler so errors reach the error middleware:
 *
 *   router.get('/', requirePermission('students.view'), asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/**
 * Server-side validation (the browser's validation is only UX).
 * Returns the parsed, typed data (unknown keys are stripped by the schema)
 * or throws a 400 VALIDATION_ERROR listing which fields failed (never echoing values back).
 */
export function parseInput<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(
      'Invalid request',
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data as z.infer<S>;
}

/** Middleware: validates req.body and replaces it with the parsed value. */
export function validateBody<S extends z.ZodTypeAny>(schema: S): RequestHandler {
  return (req, _res, next) => {
    try {
      req.body = parseInput(schema, req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Honeypot check for public forms. Real users never see or fill the hidden field,
 * so a filled value means a bot. Routes should then pretend success and store nothing.
 */
export function honeypotTriggered(body: unknown, field = 'website'): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === 'string' && value.trim() !== '';
}
