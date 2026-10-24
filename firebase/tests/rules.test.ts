// firebase/tests/rules.test.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getBytes, ref, uploadString } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Security rules tests. They need the Firebase emulators (and Java 11+).
 * Run from the project root:   npm run test:rules
 *
 * What is proven here:
 *  - the public can read ONLY published notices / gallery / faqs and schoolSettings/public
 *  - the public, logged-in users AND users with an admin role claim cannot read private collections
 *  - every client write is denied
 *  - Storage: public/** is read-only, everything else is closed
 */

let testEnv: RulesTestEnvironment;

const PRIVATE_COLLECTIONS = [
  'admins',
  'sessions',
  'classes',
  'sections',
  'subjects',
  'students',
  'guardians',
  'teachers',
  'admissionApplications',
  'feeStructures',
  'invoices',
  'payments',
  'paymentLedger',
  'expenses',
  'attendance',
  'exams',
  'examSubjects',
  'results',
  'contactMessages',
  'counters',
  'stats',
  'auditLogs',
] as const;

const publicDb = () => testEnv.unauthenticatedContext().firestore();
const userDb = () => testEnv.authenticatedContext('user1').firestore();
const adminDb = () => testEnv.authenticatedContext('admin1', { role: 'super_admin' }).firestore();

const clients = [
  { name: 'a visitor (not logged in)', db: publicDb },
  { name: 'a logged-in non-admin user', db: userDb },
  { name: 'a user with the super_admin role claim', db: adminDb },
] as const;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-tlfs',
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firebase/firestore.rules'), 'utf8'),
    },
    storage: {
      rules: readFileSync(resolve(process.cwd(), 'firebase/storage.rules'), 'utf8'),
    },
  });
}, 60_000);

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = Timestamp.now();

    for (const name of ['notices', 'gallery', 'faqs'] as const) {
      await setDoc(doc(db, name, 'published1'), {
        status: 'published',
        title: { bn: 'প্রকাশিত', en: 'Published' },
        publishedAt: now,
        createdAt: now,
        order: 1,
      });
      await setDoc(doc(db, name, 'draft1'), {
        status: 'draft',
        title: { bn: 'খসড়া', en: 'Draft' },
        publishedAt: now,
        createdAt: now,
        order: 2,
      });
    }

    await setDoc(doc(db, 'schoolSettings', 'public'), { phone: '01700000000' });
    await setDoc(doc(db, 'schoolSettings', 'internal'), { secret: true });

    for (const name of PRIVATE_COLLECTIONS) {
      await setDoc(doc(db, name, 'doc1'), { secret: true });
    }

    const storage = context.storage();
    await uploadString(ref(storage, 'public/gallery/photo.txt'), 'public file');
    await uploadString(
      ref(storage, 'private/admissions/TLFS-APP-2026-000001/birth.txt'),
      'private file',
    );
  });
});

describe('Firestore: public content', () => {
  for (const name of ['notices', 'gallery', 'faqs'] as const) {
    describe(name, () => {
      it('visitor can read a published document', async () => {
        await assertSucceeds(getDoc(doc(publicDb(), name, 'published1')));
      });

      it('visitor cannot read a draft document', async () => {
        await assertFails(getDoc(doc(publicDb(), name, 'draft1')));
      });

      it('visitor can list published documents with the status filter', async () => {
        await assertSucceeds(
          getDocs(query(collection(publicDb(), name), where('status', '==', 'published'))),
        );
      });

      it('visitor cannot list without the published filter', async () => {
        await assertFails(getDocs(collection(publicDb(), name)));
      });

      it('visitor cannot list drafts', async () => {
        await assertFails(
          getDocs(query(collection(publicDb(), name), where('status', '==', 'draft'))),
        );
      });
    });
  }

  describe('schoolSettings', () => {
    it('visitor can read schoolSettings/public', async () => {
      await assertSucceeds(getDoc(doc(publicDb(), 'schoolSettings', 'public')));
    });

    it('visitor cannot read any other settings document', async () => {
      await assertFails(getDoc(doc(publicDb(), 'schoolSettings', 'internal')));
    });

    it('visitor cannot list schoolSettings', async () => {
      await assertFails(getDocs(collection(publicDb(), 'schoolSettings')));
    });
  });
});

describe('Firestore: private collections have no client access', () => {
  for (const client of clients) {
    describe(client.name, () => {
      for (const name of PRIVATE_COLLECTIONS) {
        it(`cannot read ${name}`, async () => {
          await assertFails(getDoc(doc(client.db(), name, 'doc1')));
        });
      }

      it('cannot list students', async () => {
        await assertFails(getDocs(collection(client.db(), 'students')));
      });
    });
  }
});

describe('Firestore: every client write is denied', () => {
  for (const client of clients) {
    describe(client.name, () => {
      it('cannot create a notice', async () => {
        await assertFails(
          setDoc(doc(client.db(), 'notices', 'new1'), { status: 'published', title: {} }),
        );
      });

      it('cannot edit a published notice', async () => {
        await assertFails(updateDoc(doc(client.db(), 'notices', 'published1'), { important: true }));
      });

      it('cannot delete a published notice', async () => {
        await assertFails(deleteDoc(doc(client.db(), 'notices', 'published1')));
      });

      it('cannot change schoolSettings/public', async () => {
        await assertFails(setDoc(doc(client.db(), 'schoolSettings', 'public'), { phone: 'x' }));
      });

      it('cannot create an admission application', async () => {
        await assertFails(
          setDoc(doc(client.db(), 'admissionApplications', 'new1'), { status: 'submitted' }),
        );
      });

      it('cannot create a payment', async () => {
        await assertFails(setDoc(doc(client.db(), 'payments', 'new1'), { status: 'verified' }));
      });

      it('cannot create an admins document (self promotion)', async () => {
        await assertFails(
          setDoc(doc(client.db(), 'admins', 'user1'), { role: 'super_admin', active: true }),
        );
      });

      it('cannot write an audit log', async () => {
        await assertFails(setDoc(doc(client.db(), 'auditLogs', 'new1'), { action: 'x' }));
      });
    });
  }
});

describe('Storage rules', () => {
  const publicStorage = () => testEnv.unauthenticatedContext().storage();
  const adminStorage = () =>
    testEnv.authenticatedContext('admin1', { role: 'super_admin' }).storage();

  it('visitor can read a file under public/', async () => {
    await assertSucceeds(getBytes(ref(publicStorage(), 'public/gallery/photo.txt')));
  });

  it('visitor cannot write under public/', async () => {
    await assertFails(uploadString(ref(publicStorage(), 'public/gallery/hack.txt'), 'x'));
  });

  it('admin claim cannot write under public/ from the browser', async () => {
    await assertFails(uploadString(ref(adminStorage(), 'public/gallery/hack.txt'), 'x'));
  });

  it('visitor cannot read a private admission document', async () => {
    await assertFails(
      getBytes(ref(publicStorage(), 'private/admissions/TLFS-APP-2026-000001/birth.txt')),
    );
  });

  it('admin claim cannot read a private admission document directly', async () => {
    await assertFails(
      getBytes(ref(adminStorage(), 'private/admissions/TLFS-APP-2026-000001/birth.txt')),
    );
  });

  it('visitor cannot upload to a private path', async () => {
    await assertFails(
      uploadString(ref(publicStorage(), 'private/admissions/TLFS-APP-2026-000002/x.txt'), 'x'),
    );
  });

  it('admin claim cannot upload to a private path directly', async () => {
    await assertFails(
      uploadString(ref(adminStorage(), 'private/admissions/TLFS-APP-2026-000002/x.txt'), 'x'),
    );
  });

  it('visitor cannot read a file outside public/ and private/', async () => {
    await assertFails(getBytes(ref(publicStorage(), 'random/file.txt')));
  });
});
