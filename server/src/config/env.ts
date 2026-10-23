// server/src/config/env.ts
import 'dotenv/config';
import { z } from 'zod';

/**
 * Reads and validates all environment variables ONCE at startup.
 * The server refuses to start with a clear message if something is missing or invalid.
 * Secret VALUES are never printed; only variable names are.
 */

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  FRONTEND_ORIGIN: z.string().trim().min(1, 'is required'),
  FIREBASE_PROJECT_ID: z.string().trim().min(1, 'is required'),
  FIREBASE_STORAGE_BUCKET: z.string().trim().min(1, 'is required'),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().trim().optional(),
  APPCHECK_ENFORCE: booleanString.default('true'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),
  JSON_BODY_LIMIT: z
    .string()
    .trim()
    .regex(/^\d+(kb|mb)$/i, 'must look like 100kb or 1mb')
    .default('100kb'),
  SIGNED_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  SIGNED_READ_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
});

/** Values used only when NODE_ENV=test so unit tests can import modules without a real .env. */
const TEST_DEFAULTS: Record<string, string> = {
  FRONTEND_ORIGIN: 'http://localhost:5173',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
  APPCHECK_ENFORCE: 'false',
};

export interface ServiceAccountCredentials {
  projectId: string | undefined;
  clientEmail: string;
  privateKey: string;
}

const serviceAccountJsonSchema = z
  .object({
    project_id: z.string().optional(),
    client_email: z.string().email(),
    private_key: z.string().includes('PRIVATE KEY'),
  })
  .passthrough();

function readRawEnv(): Record<string, string> {
  const merged: Record<string, string | undefined> =
    process.env.NODE_ENV === 'test' ? { ...TEST_DEFAULTS, ...process.env } : { ...process.env };

  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    // Empty values (e.g. "FIREBASE_SERVICE_ACCOUNT_JSON=") count as "not set"
    if (value !== undefined && value !== '') cleaned[key] = value;
  }
  return cleaned;
}

function parseOrigins(value: string, isProduction: boolean): string[] {
  const origins = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      let url: URL;
      try {
        url = new URL(item);
      } catch {
        throw new Error(`FRONTEND_ORIGIN contains an invalid URL: ${item}`);
      }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error(`FRONTEND_ORIGIN must use http or https: ${item}`);
      }
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (isProduction && url.protocol !== 'https:' && !isLocal) {
        throw new Error(`FRONTEND_ORIGIN must use https in production: ${item}`);
      }
      return url.origin;
    });

  if (origins.length === 0) {
    throw new Error('FRONTEND_ORIGIN must contain at least one origin');
  }
  return Array.from(new Set(origins));
}

function parseServiceAccount(value: string | undefined): ServiceAccountCredentials | null {
  if (!value) return null;

  let parsed: unknown;
  try {
    const text = value.startsWith('{') ? value : Buffer.from(value, 'base64').toString('utf8');
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (or base64-encoded JSON)',
    );
  }

  const result = serviceAccountJsonSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key (is it a service account key?)',
    );
  }

  return {
    projectId: result.data.project_id,
    clientEmail: result.data.client_email,
    // Environment variables often store newlines as the two characters "\n"
    privateKey: result.data.private_key.replace(/\\n/g, '\n'),
  };
}

function loadEnv() {
  const result = envSchema.safeParse(readRawEnv());
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration. Check server/.env (or the Render Environment tab):\n${problems}`,
    );
  }

  const parsed = result.data;
  const isProduction = parsed.NODE_ENV === 'production';
  const serviceAccount = parseServiceAccount(parsed.FIREBASE_SERVICE_ACCOUNT_JSON);

  if (
    serviceAccount?.projectId &&
    serviceAccount.projectId !== parsed.FIREBASE_PROJECT_ID
  ) {
    throw new Error(
      'FIREBASE_PROJECT_ID does not match the project_id inside FIREBASE_SERVICE_ACCOUNT_JSON',
    );
  }

  if (isProduction && !parsed.APPCHECK_ENFORCE) {
    console.warn(
      '[env] WARNING: APPCHECK_ENFORCE is false in production. Public endpoints are not protected by App Check.',
    );
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    isProduction,
    isTest: parsed.NODE_ENV === 'test',
    port: parsed.PORT,
    allowedOrigins: parseOrigins(parsed.FRONTEND_ORIGIN, isProduction),
    firebaseProjectId: parsed.FIREBASE_PROJECT_ID,
    firebaseStorageBucket: parsed.FIREBASE_STORAGE_BUCKET,
    /** null = use Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS), local use only */
    serviceAccount,
    appCheckEnforce: parsed.APPCHECK_ENFORCE,
    trustProxy: parsed.TRUST_PROXY,
    jsonBodyLimit: parsed.JSON_BODY_LIMIT,
    signedUploadUrlTtlSeconds: parsed.SIGNED_UPLOAD_URL_TTL_SECONDS,
    signedReadUrlTtlSeconds: parsed.SIGNED_READ_URL_TTL_SECONDS,
  } as const;
}

export const env = loadEnv();
export type Env = typeof env;
