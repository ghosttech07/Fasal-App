// Server-only entry point: import from '@fasalshield/shared/env' in the API and workers.
// Never import this from the mobile app or admin dashboard.
export { serverEnvSchema, loadServerEnv, EnvValidationError } from './server-env';
export type { ServerEnv, AppEnv } from './server-env';
