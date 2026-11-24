import { z } from 'zod';

/**
 * Server environment schema (API + workers). Validated once at boot; the process exits with a
 * readable list of problems if anything is missing or invalid. Mirrors .env.example.
 *
 * Production guard (TH-15 / NFR-13): with APP_ENV=prod, mock providers and the weather simulator
 * are rejected, and secrets must not be the example placeholders.
 */

const APP_ENVS = ['local', 'dev', 'staging', 'prod'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_PREFIX = 'replace-with';

const secret = (name: string) =>
  z
    .string({ required_error: `${name} is required` })
    .min(MIN_SECRET_LENGTH, `${name} must be at least ${MIN_SECRET_LENGTH} characters`);

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const positiveInt = z.coerce.number().int().positive();

const csvList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(APP_ENVS).default('local'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  API_PORT: positiveInt.default(4000),
  API_BASE_URL: z.string().url(),
  CORS_ORIGINS: csvList,

  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a postgres:// connection string'),
  REDIS_URL: z.string().regex(/^rediss?:\/\//, 'REDIS_URL must be a redis:// or rediss:// URL'),

  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1).default('ap-south-1'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_UPLOADS: z.string().min(3),
  S3_BUCKET_EVIDENCE: z.string().min(3),
  S3_BUCKET_RAW: z.string().min(3),

  JWT_ACCESS_SECRET: secret('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: secret('JWT_REFRESH_SECRET'),
  JWT_ACCESS_TTL_SECONDS: positiveInt.default(900),
  JWT_REFRESH_TTL_SECONDS: positiveInt.default(2_592_000),
  STAFF_ACCESS_TTL_SECONDS: positiveInt.default(600),
  STAFF_SESSION_MAX_SECONDS: positiveInt.default(28_800),
  OTP_HMAC_SECRET: secret('OTP_HMAC_SECRET'),
  OTP_TTL_SECONDS: positiveInt.default(300),
  MFA_ISSUER: z.string().min(1).default('FasalShield'),

  PII_ENCRYPTION_KEY_B64: z
    .string()
    .refine(
      (value) => value.startsWith(PLACEHOLDER_PREFIX) || Buffer.from(value, 'base64').length === 32,
      'PII_ENCRYPTION_KEY_B64 must be 32 bytes, base64-encoded',
    ),
  PII_HASH_PEPPER: secret('PII_HASH_PEPPER'),

  SMS_PROVIDER: z.enum(['console', 'msg91', 'gupshup']).default('console'),
  WHATSAPP_PROVIDER: z.enum(['mock', 'meta']).default('mock'),
  PUSH_PROVIDER: z.enum(['mock', 'fcm']).default('mock'),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpayx', 'cashfree']).default('mock'),
  KYC_PROVIDER: z.enum(['mock', 'digilocker']).default('mock'),
  WEATHER_PROVIDER: z.enum(['simulator', 'chirps', 'imerg']).default('simulator'),
  ENABLE_SIMULATOR: booleanFromString.default('false'),
  /** Demo deployments without an SMS provider: return the OTP in the API response. Forbidden in prod. */
  DEMO_SHOW_OTP: booleanFromString.default('false'),
  /** Shared secret Vercel Cron sends as `Authorization: Bearer <CRON_SECRET>`. */
  CRON_SECRET: z.string().min(16).optional(),

  PAYMENT_API_KEY: z.string().optional(),
  PAYMENT_API_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: secret('PAYMENT_WEBHOOK_SECRET'),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().min(1).default('FSHLD'),
  WHATSAPP_API_TOKEN: z.string().optional(),
  FCM_SERVICE_ACCOUNT_B64: z.string().optional(),
  KYC_API_KEY: z.string().optional(),
  NASA_EARTHDATA_TOKEN: z.string().optional(),

  DATA_DIR: z.string().min(1).default('.data'),

  PAYOUT_AUTO_APPROVE_BATCH_LIMIT_PAISE: positiveInt.default(50_000_000),
  PAYOUT_AUTO_APPROVE_ITEM_LIMIT_PAISE: positiveInt.default(1_000_000),
  PAYOUT_SLA_HOURS: positiveInt.default(24),
});

const SECRET_KEYS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'OTP_HMAC_SECRET',
  'PII_ENCRYPTION_KEY_B64',
  'PII_HASH_PEPPER',
  'PAYMENT_WEBHOOK_SECRET',
] as const;

/** Provider → credential env var that becomes mandatory when that real provider is selected. */
const REAL_PROVIDER_CREDENTIALS: ReadonlyArray<{
  key: 'SMS_PROVIDER' | 'WHATSAPP_PROVIDER' | 'PUSH_PROVIDER' | 'PAYMENT_PROVIDER' | 'KYC_PROVIDER';
  mockValues: readonly string[];
  credential: keyof z.infer<typeof baseSchema>;
}> = [
  { key: 'SMS_PROVIDER', mockValues: ['console'], credential: 'SMS_API_KEY' },
  { key: 'WHATSAPP_PROVIDER', mockValues: ['mock'], credential: 'WHATSAPP_API_TOKEN' },
  { key: 'PUSH_PROVIDER', mockValues: ['mock'], credential: 'FCM_SERVICE_ACCOUNT_B64' },
  { key: 'PAYMENT_PROVIDER', mockValues: ['mock'], credential: 'PAYMENT_API_KEY' },
  { key: 'KYC_PROVIDER', mockValues: ['mock'], credential: 'KYC_API_KEY' },
];

export const serverEnvSchema = baseSchema.superRefine((env, ctx) => {
  // Real providers need their credentials, in every environment.
  for (const { key, mockValues, credential } of REAL_PROVIDER_CREDENTIALS) {
    if (!mockValues.includes(env[key]) && !env[credential]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [credential],
        message: `${credential} is required when ${key}=${env[key]}`,
      });
    }
  }
  if (env.PAYMENT_PROVIDER !== 'mock' && !env.PAYMENT_API_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PAYMENT_API_SECRET'],
      message: `PAYMENT_API_SECRET is required when PAYMENT_PROVIDER=${env.PAYMENT_PROVIDER}`,
    });
  }

  if (env.APP_ENV !== 'prod') return;

  // ---- Production-only guards ----
  if (env.DEMO_SHOW_OTP) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['DEMO_SHOW_OTP'], message: 'DEMO_SHOW_OTP must be false in prod' });
  }
  if (env.ENABLE_SIMULATOR) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ENABLE_SIMULATOR'],
      message: 'ENABLE_SIMULATOR must be false in prod (TH-15)',
    });
  }
  if (env.WEATHER_PROVIDER === 'simulator') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['WEATHER_PROVIDER'],
      message: 'WEATHER_PROVIDER=simulator is not allowed in prod',
    });
  }
  for (const { key, mockValues } of REAL_PROVIDER_CREDENTIALS) {
    if (mockValues.includes(env[key])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key}=${env[key]} (mock) is not allowed in prod`,
      });
    }
  }
  for (const key of SECRET_KEYS) {
    if (env[key].startsWith(PLACEHOLDER_PREFIX)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} still has the .env.example placeholder value`,
      });
    }
  }
  if (env.NODE_ENV !== 'production') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['NODE_ENV'],
      message: 'NODE_ENV must be "production" when APP_ENV=prod',
    });
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid server environment:\n  - ${problems.join('\n  - ')}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Parses and validates an env object (normally `process.env`).
 * Throws EnvValidationError listing every problem (never echoes secret values).
 */
export function loadServerEnv(source: Record<string, string | undefined>): ServerEnv {
  // Treat empty strings as "unset" so optional/default handling works with `KEY=` lines.
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== '') cleaned[key] = value;
  }
  const result = serverEnvSchema.safeParse(cleaned);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => {
      const path = issue.path.join('.') || '(root)';
      return issue.message.startsWith(path) ? issue.message : `${path}: ${issue.message}`;
    });
    throw new EnvValidationError(problems);
  }
  return result.data;
}
