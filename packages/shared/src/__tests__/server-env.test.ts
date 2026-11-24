import { EnvValidationError, loadServerEnv } from '../env/server-env';

const secret = (char: string) => char.repeat(44);
const key32 = Buffer.alloc(32, 7).toString('base64');

/** A complete, valid local environment (mirrors .env.example with real-looking secrets). */
function localEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'development',
    APP_ENV: 'local',
    API_BASE_URL: 'http://localhost:4000',
    CORS_ORIGINS: 'http://localhost:5173, http://localhost:8081',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/fasalshield',
    REDIS_URL: 'redis://localhost:6379',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_ACCESS_KEY_ID: 'minio',
    S3_SECRET_ACCESS_KEY: 'minio-secret',
    S3_BUCKET_UPLOADS: 'fs-uploads',
    S3_BUCKET_EVIDENCE: 'fs-evidence',
    S3_BUCKET_RAW: 'fs-raw',
    JWT_ACCESS_SECRET: secret('a'),
    JWT_REFRESH_SECRET: secret('b'),
    OTP_HMAC_SECRET: secret('c'),
    PII_ENCRYPTION_KEY_B64: key32,
    PII_HASH_PEPPER: secret('d'),
    PAYMENT_WEBHOOK_SECRET: secret('e'),
    ENABLE_SIMULATOR: 'true',
    ...overrides,
  };
}

function prodEnv(overrides: Record<string, string | undefined> = {}) {
  return localEnv({
    NODE_ENV: 'production',
    APP_ENV: 'prod',
    ENABLE_SIMULATOR: 'false',
    WEATHER_PROVIDER: 'chirps',
    SMS_PROVIDER: 'msg91',
    SMS_API_KEY: 'k',
    WHATSAPP_PROVIDER: 'meta',
    WHATSAPP_API_TOKEN: 't',
    PUSH_PROVIDER: 'fcm',
    FCM_SERVICE_ACCOUNT_B64: 'f',
    PAYMENT_PROVIDER: 'razorpayx',
    PAYMENT_API_KEY: 'pk',
    PAYMENT_API_SECRET: 'ps',
    KYC_PROVIDER: 'digilocker',
    KYC_API_KEY: 'kk',
    ...overrides,
  });
}

function problemsOf(fn: () => unknown): string[] {
  try {
    fn();
  } catch (error) {
    if (error instanceof EnvValidationError) return error.problems;
    throw error;
  }
  throw new Error('expected EnvValidationError');
}

describe('loadServerEnv', () => {
  it('parses a valid local env with defaults and coercion', () => {
    const env = loadServerEnv(localEnv());
    expect(env.API_PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173', 'http://localhost:8081']);
    expect(env.ENABLE_SIMULATOR).toBe(true);
    expect(env.PAYMENT_PROVIDER).toBe('mock');
    expect(env.PAYOUT_SLA_HOURS).toBe(24);
  });

  it('treats empty strings as unset', () => {
    const env = loadServerEnv(localEnv({ PAYMENT_API_KEY: '', LOG_LEVEL: '' }));
    expect(env.PAYMENT_API_KEY).toBeUndefined();
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('lists every missing/invalid variable without echoing secrets', () => {
    const problems = problemsOf(() =>
      loadServerEnv(localEnv({ DATABASE_URL: 'mysql://x', JWT_ACCESS_SECRET: 'short' })),
    );
    expect(problems.join('\n')).toMatch(/DATABASE_URL/);
    expect(problems.join('\n')).toMatch(/JWT_ACCESS_SECRET must be at least 32/);
    expect(problems.join('\n')).not.toContain('short');
  });

  it('rejects a PII key that is not 32 bytes', () => {
    const problems = problemsOf(() =>
      loadServerEnv(localEnv({ PII_ENCRYPTION_KEY_B64: Buffer.alloc(16).toString('base64') })),
    );
    expect(problems.join('\n')).toMatch(/PII_ENCRYPTION_KEY_B64 must be 32 bytes/);
  });

  it('requires credentials when a real provider is chosen (any env)', () => {
    const problems = problemsOf(() =>
      loadServerEnv(localEnv({ PAYMENT_PROVIDER: 'cashfree', SMS_PROVIDER: 'msg91' })),
    );
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/PAYMENT_API_KEY is required/),
        expect.stringMatching(/PAYMENT_API_SECRET is required/),
        expect.stringMatching(/SMS_API_KEY is required/),
      ]),
    );
  });

  it('accepts a fully configured prod env', () => {
    expect(() => loadServerEnv(prodEnv())).not.toThrow();
  });

  it('blocks simulator, mock providers and placeholder secrets in prod (TH-15)', () => {
    const problems = problemsOf(() =>
      loadServerEnv(
        prodEnv({
          ENABLE_SIMULATOR: 'true',
          WEATHER_PROVIDER: 'simulator',
          PAYMENT_PROVIDER: 'mock',
          JWT_ACCESS_SECRET: 'replace-with-32+-byte-random-base64',
          NODE_ENV: 'development',
        }),
      ),
    );
    const text = problems.join('\n');
    expect(text).toMatch(/ENABLE_SIMULATOR must be false in prod/);
    expect(text).toMatch(/WEATHER_PROVIDER=simulator is not allowed in prod/);
    expect(text).toMatch(/PAYMENT_PROVIDER=mock \(mock\) is not allowed in prod/);
    expect(text).toMatch(/JWT_ACCESS_SECRET still has the .env.example placeholder/);
    expect(text).toMatch(/NODE_ENV must be "production"/);
  });

  it('allows the .env.example placeholders for local development', () => {
    expect(() =>
      loadServerEnv(
        localEnv({
          JWT_ACCESS_SECRET: 'replace-with-32+-byte-random-base64',
          PII_ENCRYPTION_KEY_B64: 'replace-with-32-byte-random-base64',
        }),
      ),
    ).not.toThrow();
  });
});

describe('WEATHER_PROVIDER default', () => {
  it('uses the simulator locally and real rain (chirps) on staging', () => {
    expect(loadServerEnv(localEnv()).WEATHER_PROVIDER).toBe('simulator');
    expect(loadServerEnv(localEnv({ APP_ENV: 'staging' })).WEATHER_PROVIDER).toBe('chirps');
    expect(loadServerEnv(localEnv({ APP_ENV: 'staging', WEATHER_PROVIDER: 'simulator' })).WEATHER_PROVIDER).toBe('simulator');
  });
});
