// server/scripts/bootstrap-admin.ts
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

import { applicationDefault, cert, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

/**
 * ONE-TIME LOCAL SCRIPT: creates the first super_admin.
 * Run it on YOUR computer only. Never run it on Render and never commit the key file.
 *
 *   npm run bootstrap-admin -- you@example.com --key C:\secure\tlfs-service-account.json
 *
 * Options:
 *   <email>        email of an existing Firebase Authentication user (first argument)
 *   --key <path>   service-account JSON stored OUTSIDE the repository.
 *                  If omitted, GOOGLE_APPLICATION_CREDENTIALS is used.
 *   --create       create the Auth user (WITHOUT a password) when it does not exist yet.
 *                  Then use "Forgot password?" on the admin login page to set a password.
 *   --yes          skip the confirmation question
 *
 * There is no default password and no hard-coded credential anywhere in this script.
 * It sets the custom claim { role: 'super_admin' } and creates/updates admins/{uid} (active: true).
 */

const emailSchema = z.string().trim().toLowerCase().email();

const keyFileSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.string().email(),
  private_key: z.string().includes('PRIVATE KEY'),
});

interface Options {
  email: string;
  keyPath: string | undefined;
  create: boolean;
  yes: boolean;
}

function parseArgs(argv: string[]): Options {
  let email: string | undefined;
  let keyPath: string | undefined;
  let create = false;
  let yes = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) continue;
    if (arg === '--key') {
      index += 1;
      keyPath = argv[index];
    } else if (arg === '--create') {
      create = true;
    } else if (arg === '--yes') {
      yes = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      email = arg;
    }
  }

  if (!email) {
    throw new Error(
      'Email is required.\nUsage: npm run bootstrap-admin -- you@example.com --key <path-to-service-account.json>',
    );
  }
  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) throw new Error('That does not look like a valid email address.');

  return { email: parsedEmail.data, keyPath, create, yes };
}

function initAdmin(keyPath: string | undefined): { app: App; projectId: string } {
  if (keyPath) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(keyPath, 'utf8'));
    } catch {
      throw new Error(`Could not read a JSON file at: ${keyPath}`);
    }
    const parsed = keyFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error('That file is not a Firebase service-account key (missing project_id, client_email or private_key).');
    }
    const key = parsed.data;
    const app = initializeApp({
      credential: cert({
        projectId: key.project_id,
        clientEmail: key.client_email,
        privateKey: key.private_key.replace(/\\n/g, '\n'),
      }),
      projectId: key.project_id,
    });
    return { app, projectId: key.project_id };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !projectId) {
    throw new Error(
      'No credentials found. Pass --key <path-to-service-account.json>, or set GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_PROJECT_ID.',
    );
  }
  return { app: initializeApp({ credential: applicationDefault(), projectId }), projectId };
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim().toUpperCase() === 'YES';
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { app, projectId } = initAdmin(options.keyPath);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log('');
  console.log(`Firebase project : ${projectId}`);
  console.log(`Email            : ${options.email}`);
  console.log('Role to assign   : super_admin');
  console.log('');

  if (!options.yes) {
    const ok = await confirm('Type YES to continue (anything else cancels): ');
    if (!ok) {
      console.log('Cancelled. Nothing was changed.');
      return;
    }
  }

  // 1) Find (or, with --create, create without a password) the Authentication user
  let uid: string;
  let displayName: string | null = null;
  let existingClaims: Record<string, unknown> = {};
  try {
    const user = await auth.getUserByEmail(options.email);
    uid = user.uid;
    displayName = user.displayName ?? null;
    existingClaims = user.customClaims ?? {};
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw error;
    if (!options.create) {
      throw new Error(
        'No Firebase Authentication user has that email.\n' +
          'Create the user first (Firebase Console > Authentication > Users > Add user),\n' +
          'or run this script again with --create to create it without a password.',
      );
    }
    const created = await auth.createUser({ email: options.email, emailVerified: false });
    uid = created.uid;
    console.log('Created the Authentication user WITHOUT a password.');
    console.log('Open the admin login page and use "Forgot password?" to set one.');
  }

  // 2) Custom claim (keeps any other claims the user already had)
  await auth.setCustomUserClaims(uid, { ...existingClaims, role: 'super_admin' });

  // 3) admins/{uid} document (must be active for the backend to accept this admin)
  const adminRef = db.collection('admins').doc(uid);
  const existing = await adminRef.get();
  await adminRef.set(
    {
      email: options.email,
      displayName,
      role: 'super_admin',
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists
        ? {}
        : { createdAt: FieldValue.serverTimestamp(), createdBy: 'bootstrap-script' }),
    },
    { merge: true },
  );

  // 4) Force a fresh login so the new claim is picked up
  await auth.revokeRefreshTokens(uid);

  // 5) Audit trail
  await db.collection('auditLogs').add({
    action: 'admin.bootstrap',
    actorUid: null,
    actorRole: 'script',
    actorEmail: null,
    targetType: 'admin',
    targetId: uid,
    metadata: { email: options.email, role: 'super_admin' },
    ip: null,
    userAgent: 'bootstrap-admin script',
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log('');
  console.log(`Done. ${options.email} is now an active super_admin (uid: ${uid}).`);
  console.log('Next steps:');
  console.log('  1. Sign out and sign in again on the admin login page.');
  console.log('  2. Delete the service-account key file from your Downloads folder when you no longer need it.');
  console.log('  3. Never commit that key file to GitHub.');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('');
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
