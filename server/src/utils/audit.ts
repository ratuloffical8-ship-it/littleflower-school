// server/src/utils/audit.ts
import type { Request } from 'express';
import type { DocumentReference } from 'firebase-admin/firestore';

import { FieldValue, db } from '../config/firebaseAdmin';

/**
 * Audit trail (collection: auditLogs). Append-only: only the backend writes, never the browser.
 *
 * Action naming: "<resource>.<verb>", e.g. "application.approve", "document.view",
 * "payment.verify", "export.students", "admin.role_change".
 *
 * Two ways to use it:
 *  1) Inside a Firestore transaction/batch (preferred for data changes, so the change and its
 *     log are saved together):
 *        const ref = newAuditLogRef();
 *        tx.set(ref, buildAuditEntry(req, { action, targetType, targetId }));
 *  2) Standalone: await writeAuditLog(req, {...}).
 *     For sensitive reads (signed document URLs, exports) await it BEFORE responding, so the
 *     action fails if it cannot be logged.
 */

export interface AuditInput {
  action: string;
  targetType: string;
  targetId?: string | null;
  /** Small, non-sensitive details (never passwords, tokens, or full documents). */
  metadata?: Record<string, unknown>;
}

const MAX_STRING = 500;

function cleanMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!metadata) return result;
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    result[key] = typeof value === 'string' ? value.slice(0, MAX_STRING) : value;
  }
  return result;
}

export function newAuditLogRef(): DocumentReference {
  return db.collection('auditLogs').doc();
}

export function buildAuditEntry(req: Request, input: AuditInput) {
  const admin = req.admin;
  return {
    action: input.action,
    actorUid: admin?.uid ?? null,
    actorRole: admin?.role ?? (admin ? null : 'public'),
    actorEmail: admin?.email ?? null,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: cleanMetadata(input.metadata),
    ip: req.ip ?? null,
    userAgent: (req.header('user-agent') ?? '').slice(0, 200) || null,
    createdAt: FieldValue.serverTimestamp(),
  };
}

export async function writeAuditLog(req: Request, input: AuditInput): Promise<string> {
  const ref = newAuditLogRef();
  await ref.set(buildAuditEntry(req, input));
  return ref.id;
}
