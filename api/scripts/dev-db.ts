// Starts a local PostgreSQL server (embedded binaries, no Docker/admin needed) and keeps it running.
// shortcut: no PostGIS in embedded Postgres; use docker-compose (postgis/postgis) once Docker is installed.
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import EmbeddedPostgres from 'embedded-postgres';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const url = new URL(process.env.DATABASE_URL ?? '');
const dataDir = path.resolve(__dirname, '..', '..', process.env.DATA_DIR ?? '.data', 'pg');
const dbName = url.pathname.slice(1);

async function main() {
  const fresh = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    port: Number(url.port || 5432),
    persistent: true,
    // Windows defaults to WIN1252, which cannot store Devanagari (hi/mr).
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) await pg.createDatabase(dbName);
  console.warn(`Postgres ready on port ${url.port || 5432} (db "${dbName}", data ${dataDir}). Ctrl+C to stop.`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
