import path from 'node:path';
import dotenv from 'dotenv';
import { loadServerEnv } from '@fasalshield/shared/env';

// One .env at the repo root serves api + scripts.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

export const env = loadServerEnv(process.env);
export const dataDir = path.resolve(__dirname, '..', '..', env.DATA_DIR);
