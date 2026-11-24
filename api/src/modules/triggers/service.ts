import type { Prisma } from '@prisma/client';
import { formatPaise } from '@fasalshield/shared';
import { prisma } from '../../db';
import { env } from '../../env';
import { weather } from '../../adapters';
import { CHIRPS, chirpsDay, pool, POWER, powerRange, type RainRow } from '../../adapters/rain';
import { audit, canonical } from '../../lib/audit';
import { sha256 } from '../../lib/crypto';
import { logger } from '../../lib/logger';
import { daysBetween, ENGINE_VERSION, evaluate, rulesSchema } from '../../rules/engine';

const METRIC = 'RAIN_MM';
const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

/** Cells that matter = cells with at least one paid-up policy. */
async function activeCells() {
  const plots = await prisma.plot.findMany({
    where: { policies: { some: { status: { in: ['ACTIVE', 'IN_WAITING'] } } } },
    select: { gridCellId: true },
    distinct: ['gridCellId'],
  });
  return plots.map((p) => p.gridCellId);
}

/**
 * Ingestion job (FS-0702 / brief 5.2): writes daily readings for every active cell from `from` to
 * yesterday, skipping days already ingested. Idempotent - safe to run on every schedule tick.
 */
export async function ingest(from: string, to = yesterday()) {
  if (env.WEATHER_PROVIDER === 'chirps') return ingestReal(from, to);
  const cells = await activeCells();
  if (cells.length === 0 || from > to) return 0;
  const existing = await prisma.indexReading.findMany({
    where: { gridCellId: { in: cells }, metric: METRIC, dataSourceCode: weather.sourceCode, obsDate: { gte: asDate(from), lte: asDate(to) } },
    select: { gridCellId: true, obsDate: true },
  });
  const have = new Set(existing.map((r) => `${r.gridCellId}:${r.obsDate.toISOString().slice(0, 10)}`));
  const rows = cells.flatMap((cell) =>
    daysBetween(from, to)
      .filter((d) => !have.has(`${cell}:${d}`))
      .map((d) => ({ gridCellId: cell, obsDate: asDate(d), value: weather.dailyRainMm(cell, d) })),
  );
  if (rows.length === 0) return 0;
  const run = await prisma.ingestionRun.create({
    data: { dataSourceCode: weather.sourceCode, fromDate: asDate(from), toDate: asDate(to), status: 'SUCCEEDED', readingsWritten: rows.length },
  });
  await prisma.indexReading.createMany({
    data: rows.map((r) => ({ ...r, metric: METRIC, dataSourceCode: weather.sourceCode, sourceVersion: 1, ingestionRunId: run.id })),
    skipDuplicates: true,
  });
  logger.info({ cells: cells.length, readings: rows.length }, 'ingestion complete');
  return rows.length;
}

/**
 * Real rain (WEATHER_PROVIDER=chirps): CHIRPS for published days (oldest missing first, a few per run),
 * NASA POWER for days that still have no reading. Bounded so one daily run fits the 60 s function limit;
 * whatever is left is picked up by the next run. Idempotent: existing (cell, day, source) rows are skipped.
 */
async function ingestReal(from: string, to: string) {
  const started = Date.now();
  const cells = await prisma.gridCell.findMany({ where: { id: { in: await activeCells() } }, select: { id: true, minLat: true, minLng: true } });
  if (cells.length === 0 || from > to) return 0;
  const dates = daysBetween(from, to);
  const existing = await prisma.indexReading.findMany({
    where: { gridCellId: { in: cells.map((c) => c.id) }, metric: METRIC, dataSourceCode: { in: [CHIRPS.code, POWER.code] }, obsDate: { gte: asDate(from), lte: asDate(to) } },
    select: { gridCellId: true, obsDate: true, dataSourceCode: true },
  });
  const key = (cell: number, d: string) => `${cell}:${d}`;
  const chirpsHave = new Set(existing.filter((r) => r.dataSourceCode === CHIRPS.code).map((r) => key(r.gridCellId, r.obsDate.toISOString().slice(0, 10))));
  const anyHave = new Set(existing.map((r) => key(r.gridCellId, r.obsDate.toISOString().slice(0, 10))));

  // CHIRPS: oldest days first; stop at the first day not yet published (files come out in order).
  const chirpsDays = dates.filter((d) => cells.some((c) => !chirpsHave.has(key(c.id, d)))).slice(0, 8);
  const chirpsRows: RainRow[] = [];
  const results = await pool(chirpsDays, 4, (d) => chirpsDay(d, cells));
  for (const rows of results) {
    if (rows === null) break;
    if (rows) chirpsRows.push(...rows.filter((r) => !chirpsHave.has(key(r.gridCellId, r.date))));
  }

  // NASA POWER: per cell, the days with no reading from either source (and not just filled by CHIRPS).
  const filled = new Set([...anyHave, ...chirpsRows.map((r) => key(r.gridCellId, r.date))]);
  const powerRows: RainRow[] = [];
  if (Date.now() - started < 35_000) {
    const needs = cells
      .map((c) => ({ c, days: dates.filter((d) => !filled.has(key(c.id, d))) }))
      .filter((n) => n.days.length > 0);
    const got = await pool(needs, 4, (n) => powerRange(n.c, n.days[0]!, n.days[n.days.length - 1]!));
    for (const [i, rows] of got.entries()) {
      const want = new Set(needs[i]!.days);
      if (rows) powerRows.push(...rows.filter((r) => want.has(r.date)));
    }
  }

  let written = 0;
  for (const [src, rows] of [[CHIRPS, chirpsRows], [POWER, powerRows]] as const) {
    if (rows.length === 0) continue;
    const ds = rows.map((r) => r.date).sort();
    const run = await prisma.ingestionRun.create({
      data: { dataSourceCode: src.code, fromDate: asDate(ds[0]!), toDate: asDate(ds[ds.length - 1]!), status: 'SUCCEEDED', readingsWritten: rows.length },
    });
    await prisma.indexReading.createMany({
      data: rows.map((r) => ({ gridCellId: r.gridCellId, obsDate: asDate(r.date), value: r.mm, metric: METRIC, dataSourceCode: src.code, sourceVersion: src.version, ingestionRunId: run.id })),
      skipDuplicates: true,
    });
    written += rows.length;
  }
  logger.info({ cells: cells.length, chirps: chirpsRows.length, power: powerRows.length, ms: Date.now() - started }, 'real rain ingestion');
  return written;
}

/** Latest source version per day for one cell (revisions win). */
export async function rainSeries(gridCellId: number, from: string, to: string) {
  const readings = await prisma.indexReading.findMany({
    where: {
      gridCellId,
      metric: METRIC,
      obsDate: { gte: asDate(from), lte: asDate(to) },
      // With real rain, the simulator's made-up baseline is ignored; admin-run scenarios (v2+) still apply.
      ...(env.WEATHER_PROVIDER === 'chirps' ? { NOT: { dataSourceCode: 'SIMULATOR', sourceVersion: 1 } } : {}),
    },
    orderBy: [{ sourceVersion: 'asc' }, { ingestionRun: { createdAt: 'asc' } }], // later load wins a tie
  });
  const series = new Map<string, number>();
  const lineage = new Map<string, { sourceVersion: number; ingestionRunId: string; source: string }>();
  for (const r of readings) {
    const d = r.obsDate.toISOString().slice(0, 10);
    series.set(d, r.value);
    lineage.set(d, { sourceVersion: r.sourceVersion, ingestionRunId: r.ingestionRunId, source: r.dataSourceCode });
  }
  return { series, lineage };
}

type PolicyWithRules = Prisma.PolicyGetPayload<{ include: { productVersion: true; plot: true; triggerEvents: true; farmer: true } }>;

export async function phaseStatus(policy: PolicyWithRules, asOf = yesterday()) {
  const rules = rulesSchema.parse(policy.productVersion.rules);
  const first = rules.phases[0]!.from;
  const last = rules.phases[rules.phases.length - 1]!.to;
  const { series, lineage } = await rainSeries(policy.plot.gridCellId, first, asOf < last ? asOf : last);
  // Real rain arrives days late: judge up to the last day that has data, never across the gap.
  const latest = [...series.keys()].sort().at(-1);
  if (latest && latest >= first && latest < asOf) asOf = latest;
  const result = evaluate({
    rules,
    asOf,
    rain: series,
    normal: (d) => weather.normalRainMm(policy.plot.gridCellId, d),
    sumInsuredPaise: policy.sumInsuredPaise,
    paid: policy.triggerEvents.map((e) => ({ phaseId: e.phaseId, slabLevel: e.slabLevel, amountPaise: e.payoutAmountPaise })),
  });
  return { rules, series, lineage, asOf, ...result };
}

/**
 * Trigger evaluation job (FS-0801/0802/0803). For each live policy: evaluate rules, and for each new
 * slab breach write an evidence snapshot (sha256), a TriggerEvent (unique per slab = idempotent),
 * a Payout awaiting batch, an audit entry and an in-app notification - in one transaction.
 */
export async function evaluateAll(asOf = yesterday()) {
  // Waiting period over → cover starts (FR-15).
  await prisma.policy.updateMany({ where: { status: 'IN_WAITING', coverStart: { lte: asDate(today()) } }, data: { status: 'ACTIVE' } });
  const policies = await prisma.policy.findMany({
    where: { status: { in: ['ACTIVE', 'IN_WAITING'] } },
    include: { productVersion: true, plot: true, triggerEvents: true, farmer: { include: { wallets: { where: { isPrimary: true, status: 'VERIFIED' } } } } },
  });
  let created = 0;
  for (const policy of policies) {
    const { decisions, lineage, series, rules, asOf: dataTo } = await phaseStatus(policy, asOf);
    for (const decision of decisions) {
      const phase = rules.phases.find((p) => p.id === decision.phaseId)!;
      const window = daysBetween(phase.from, dataTo < phase.to ? dataTo : phase.to);
      const evidence = {
        policyNumber: policy.policyNumber,
        gridCellId: policy.plot.gridCellId,
        productVersionId: policy.productVersionId,
        rulesSha256: policy.productVersion.rulesSha256,
        engineVersion: ENGINE_VERSION,
        asOf: dataTo,
        phase: decision.phaseId,
        window: [window[0], window[window.length - 1]],
        readings: window.map((d) => ({ obsDate: d, value: series.get(d), ...lineage.get(d) })),
        normalMm: window.map((d) => Math.round(weather.normalRainMm(policy.plot.gridCellId, d) * 100) / 100),
        decision,
      };
      const json = canonical(evidence);
      const digest = sha256(json);
      // shortcut: the snapshot lives in the TriggerEvent row (hash-checked); move to an S3 Object Lock bucket before launch.

      try {
        await prisma.$transaction(async (tx) => {
          const event = await tx.triggerEvent.create({
            data: {
              policyId: policy.id,
              productVersionId: policy.productVersionId,
              peril: rules.index.type.startsWith('DROUGHT') ? 'DROUGHT' : 'FLOOD',
              phaseId: decision.phaseId,
              slabLevel: decision.slabLevel,
              indexValue: decision.indexValue,
              threshold: decision.threshold,
              payoutAmountPaise: decision.payoutAmountPaise,
              evidencePath: `db:${digest}`,
              evidence: JSON.parse(json),
              evidenceSha256: digest,
              engineVersion: ENGINE_VERSION,
              status: 'APPROVED', // fraud pre-check arrives with Phase 6 / FS-1402
            },
          });
          await tx.payout.create({
            data: {
              triggerEventId: event.id,
              walletId: policy.farmer.wallets[0]?.id ?? null,
              amountPaise: decision.payoutAmountPaise,
              idempotencyKey: sha256(event.id),
              slaDueAt: new Date(event.detectedAt.getTime() + env.PAYOUT_SLA_HOURS * 3_600_000),
            },
          });
          await tx.notification.create({
            data: {
              farmerId: policy.farmerId,
              templateCode: 'PAYOUT_TRIGGERED',
              channel: 'IN_APP',
              language: policy.farmer.language,
              body: JSON.stringify({ amount: formatPaise(decision.payoutAmountPaise), index: decision.indexValue, policy: policy.policyNumber }),
            },
          });
          await audit({ actorType: 'SYSTEM', action: 'TRIGGER_DETECTED', entityType: 'TriggerEvent', entityId: event.id, diff: { evidenceSha256: digest, ...decision } }, tx);
        });
        created++;
      } catch (error) {
        // P2002 = unique violation: another run already recorded this slab (idempotency, NFR-16).
        if ((error as { code?: string }).code !== 'P2002') throw error;
      }
    }
  }
  logger.info({ policies: policies.length, created, asOf }, 'trigger evaluation complete');
  return { policies: policies.length, triggerEventsCreated: created };
}

/** Earliest phase start among live policies, so ingestion backfills the whole season. */
export async function seasonStart() {
  const versions = await prisma.productVersion.findMany({ where: { status: 'PUBLISHED' }, select: { rules: true } });
  const starts = versions.map((v) => rulesSchema.parse(v.rules).phases[0]!.from).sort();
  return starts[0] ?? today();
}

/** In-process scheduler. shortcut: setInterval instead of BullMQ repeatable jobs (no Redis locally); move to BullMQ in Part 11.1. */
export function startScheduler(everyMs = 6 * 3_600_000) {
  const tick = async () => {
    try {
      await ingest(await seasonStart());
      await evaluateAll();
    } catch (error) {
      logger.error({ err: error }, 'scheduled job failed');
    }
  };
  void tick();
  return setInterval(tick, everyMs);
}
