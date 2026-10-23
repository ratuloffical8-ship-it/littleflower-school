// server/src/middleware/errorHandler.ts
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

import { isAppError, notFound, type ApiErrorCode } from '../utils/errors';

/**
 * Every error leaves the API in ONE shape: { error: { code, message, details? } }.
 * Clients never receive stack traces or internal messages for unexpected errors.
 */

interface HttpLikeError {
  status?: number;
  statusCode?: number;
  type?: string;
}

function sendError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): void {
  res.status(status).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}

/** Unknown route -> 404 in the standard error shape. */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound('Route not found'));
};

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Errors we raised on purpose
  if (isAppError(err)) {
    sendError(res, err.status, err.code, err.message, err.details);
    return;
  }

  // Zod validation errors thrown directly
  if (err instanceof ZodError) {
    sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid request',
      err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
    return;
  }

  // Body-parser errors (express.json)
  if (typeof err === 'object' && err !== null) {
    const http = err as HttpLikeError;
    if (http.type === 'entity.too.large') {
      sendError(res, 413, 'VALIDATION_ERROR', 'Request body too large');
      return;
    }
    if (http.type === 'entity.parse.failed') {
      sendError(res, 400, 'VALIDATION_ERROR', 'Malformed JSON body');
      return;
    }
    const status = http.status ?? http.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500 && typeof http.type === 'string') {
      sendError(res, status, 'VALIDATION_ERROR', 'Invalid request');
      return;
    }
  }

  // Anything else is a bug or an outage: log on the server only, send a generic message
  console.error(`[error] ${req.method} ${req.path}`, err);
  sendError(res, 500, 'INTERNAL', 'Something went wrong');
};
