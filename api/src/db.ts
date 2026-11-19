import { PrismaClient } from '@prisma/client';

/**
 * Hosted Postgres (Neon on Vercel) hands out a pooled "-pooler" URL. Prisma needs pgbouncer=true on it,
 * or prepared statements break under transaction pooling. Local URLs are used unchanged.
 */
function datasourceUrl(url = process.env.DATABASE_URL) {
  if (!url || !/-pooler\./.test(url) || /[?&]pgbouncer=/.test(url)) return undefined;
  return `${url}${url.includes('?') ? '&' : '?'}pgbouncer=true`;
}

const url = datasourceUrl();
export const prisma = new PrismaClient(url ? { datasourceUrl: url } : undefined);
