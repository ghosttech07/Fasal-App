import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import { env } from '../../env';
import { weather } from '../../adapters';
import { audit, verifyAuditChain } from '../../lib/audit';
import { requireAdminKey } from '../../lib/auth';
import { body, HttpError } from '../../lib/http';
import { daysBetween } from '../../rules/engine';
import { evaluateAll, ingest, seasonStart } from './service';

/** Demo tooling (FR-21, brief 5.5). Disabled unless ENABLE_SIMULATOR=true; env schema forbids it in prod. */
export const adminRouter = Router();
adminRouter.use(requireAdminKey);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Simulate a drought (pctOfNormal < 100) or heavy rain (extraMmPerDay) over a district for a date range.
 * Writes a new sourceVersion of readings (revision, never overwrite), then re-runs trigger evaluation.
 */
adminRouter.post('/simulator/scenarios', async (req, res) => {
  if (!env.ENABLE_SIMULATOR) throw new HttpError(404, 'not_found');
  const input = body(
    req,
    z
      .object({
        districtCode: z.enum(['LATUR', 'BEED', 'DHARASHIV', 'NANDED']),
        from: isoDate,
        to: isoDate,
        pctOfNormal: z.number().min(0).max(1000).optional(),
        extraMmPerDay: z.number().min(0).max(300).optional(),
      })
      .refine((v) => v.from <= v.to, 'from must be on or before to')
      .refine((v) => v.pctOfNormal !== undefined || v.extraMmPerDay !== undefined, 'pctOfNormal or extraMmPerDay is required'),
  );
  const cells = await prisma.gridCell.findMany({ where: { districtCode: input.districtCode }, select: { id: true } });
  if (cells.length === 0) throw new HttpError(422, 'no_plots_in_district');

  await ingest(await seasonStart()); // make sure the baseline series exists before revising it
  const latest = await prisma.indexReading.aggregate({
    where: { gridCellId: { in: cells.map((c) => c.id) }, dataSourceCode: weather.sourceCode },
    _max: { sourceVersion: true },
  });
  const version = (latest._max.sourceVersion ?? 1) + 1;
  const days = daysBetween(input.from, input.to);
  const run = await prisma.ingestionRun.create({
    data: {
      dataSourceCode: weather.sourceCode,
      fromDate: new Date(`${input.from}T00:00:00Z`),
      toDate: new Date(`${input.to}T00:00:00Z`),
      status: 'SUCCEEDED',
      readingsWritten: days.length * cells.length,
      note: `scenario ${JSON.stringify(input)}`,
    },
  });
  await prisma.indexReading.createMany({
    data: cells.flatMap((c) =>
      days.map((d) => ({
        gridCellId: c.id,
        obsDate: new Date(`${d}T00:00:00Z`),
        metric: 'RAIN_MM',
        dataSourceCode: weather.sourceCode,
        sourceVersion: version,
        value:
          Math.round(
            (weather.normalRainMm(c.id, d) * (input.pctOfNormal ?? 100)) / 100 * 10 + (input.extraMmPerDay ?? 0) * 10,
          ) / 10,
        ingestionRunId: run.id,
      })),
    ),
  });
  await audit({ actorType: 'STAFF', action: 'SIMULATION_RUN', entityType: 'IngestionRun', entityId: run.id, diff: input });
  const result = await evaluateAll();
  res.status(201).json({ ingestionRunId: run.id, cells: cells.length, days: days.length, sourceVersion: version, ...result });
});

adminRouter.post('/evaluations', async (_req, res) => {
  await ingest(await seasonStart());
  res.json(await evaluateAll());
});

adminRouter.get('/audit/verify', async (_req, res) => {
  const brokenAt = await verifyAuditChain();
  res.json({ valid: brokenAt === null, brokenAtSeq: brokenAt });
});
