// server/src/services/counters.ts
import type { Transaction } from 'firebase-admin/firestore';

import { FieldValue, db } from '../config/firebaseAdmin';
import { internalError } from '../utils/errors';
import {
  counterDocId,
  formatApplicationId,
  formatStudentId,
  type CounterKind,
} from '../utils/ids';

/**
 * Allocates the next Application ID / Student ID INSIDE a Firestore transaction.
 *
 * Firestore rule: in a transaction every READ must happen before the first WRITE.
 * allocateId() performs one read and one write, so call it AFTER all your other reads
 * (duplicate checks, loading the application, ...) and BEFORE your remaining writes.
 *
 *   await db.runTransaction(async (tx) => {
 *     // 1) all reads first
 *     // 2) const { id } = await allocateId(tx, 'application', year);
 *     // 3) tx.set(...) the new records
 *   });
 *
 * If the transaction is retried by Firestore, the counter is read again, so IDs are never reused
 * or duplicated. A failed transaction rolls back and the number is not consumed.
 */
export async function allocateId(
  tx: Transaction,
  kind: CounterKind,
  year: number,
): Promise<{ id: string; sequence: number }> {
  const ref = db.collection('counters').doc(counterDocId(kind, year));
  const snapshot = await tx.get(ref);

  const current = snapshot.exists ? Number(snapshot.data()?.value ?? 0) : 0;
  if (!Number.isInteger(current) || current < 0) {
    throw internalError();
  }

  const sequence = current + 1;
  tx.set(
    ref,
    { kind, year, value: sequence, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  return {
    id: kind === 'application' ? formatApplicationId(year, sequence) : formatStudentId(year, sequence),
    sequence,
  };
}
