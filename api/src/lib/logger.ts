import pino from 'pino';

// Redact anything that could carry PII or secrets (Security §4.2 logging hygiene).
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-admin-key"]',
      '*.otp',
      '*.phone',
      '*.vpa',
      '*.name',
      '*.refreshToken',
      '*.accessToken',
    ],
    censor: '[redacted]',
  },
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
      : undefined,
});
