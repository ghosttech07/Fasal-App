import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { env } from '../env';
import { HttpError } from '../lib/http';
import { evaluateAll, ingest, seasonStart } from './triggers/service';

/**
 * Daily rain import + trigger check, called by Vercel Cron (vercel.json) on serverless hosts where the
 * in-process scheduler cannot run. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Both steps are idempotent, so a retried or duplicated call never pays twice.
 */
export const cronRouter = Router();

cronRouter.get('/daily', async (req, res) => {
  const expected = env.CRON_SECRET ? Buffer.from(`Bearer ${env.CRON_SECRET}`) : null;
  const given = Buffer.from(req.get('authorization') ?? '');
  if (!expected || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpError(404, 'not_found');
  }
  const ingestion = await ingest(await seasonStart());
  const evaluation = await evaluateAll();
  res.json({ ingestion, evaluation });
});
