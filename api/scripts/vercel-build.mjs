// Vercel build for the API (run from the repo root by api/vercel.json).
// 1. build the shared package, 2. generate the Prisma client,
// 3. if a database is connected: apply migrations and load the seed data (both safe to repeat).
// With no database yet the build still succeeds, so the very first deploy never fails;
// connect the database and redeploy to create the tables.
import { execSync } from 'node:child_process';

const run = (cmd, env = process.env) => execSync(cmd, { stdio: 'inherit', env });

run('npm run build -w @fasalshield/shared');
process.chdir('api');
run('npx prisma generate');

const direct = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!direct) {
  console.warn('\n⚠ No database connected yet (DATABASE_URL is empty). Skipping migrations and seed data.');
  console.warn('  Connect the Neon database to this project (prefix DATABASE), then redeploy.\n');
  process.exit(0);
}

// Migrations need a direct (non-pooled) connection.
const dbEnv = { ...process.env, DATABASE_URL: direct };
run('npx prisma migrate deploy', dbEnv);
run('npx tsx prisma/seed.ts', dbEnv);
console.log('\n✔ Database ready: tables up to date, crops, season and covers loaded.\n');
