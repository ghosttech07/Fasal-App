import fs from 'node:fs/promises';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { formatPaise } from '@fasalshield/shared';
import { prisma } from '../../db';
import { dataDir, env } from '../../env';
import { weather } from '../../adapters';
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

/** Latest source version per day for one cell (revisions win). */
export async function rainSeries(gridCellId: number, from: string, to: string) {
  const readings = await prisma.indexReading.findMany({
    where: { gridCellId, metric: METRIC, obsDate: { gte: asDate(from), lte: asDate(to) } },
    orderBy: { sourceVersion: 'asc' },
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
  const result = evaluate({
    rules,
    asOf,
    rain: series,
    normal: (d) => weather.normalRainMm(policy.plot.gridCellId, d),
    sumInsuredPaise: policy.sumInsuredPaise,
    paid: policy.triggerEvents.map((e) => ({ phaseId: e.phaseId, slabLevel: e.slabLevel, amountPaise: e.payoutAmountPaise })),
  });
  return { rules, series, lineage, ...result };
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
    const { decisions, lineage, series, rules } = await phaseStatus(policy, asOf);
    for (const decision of decisions) {
      const phase = rules.phases.find((p) => p.id === decision.phaseId)!;
      const window = daysBetween(phase.from, asOf < phase.to ? asOf : phase.to);
      const evidence = {
        policyNumber: policy.policyNumber,
        gridCellId: policy.plot.gridCellId,
        productVersionId: policy.productVersionId,
        rulesSha256: policy.productVersion.rulesSha256,
        engineVersion: ENGINE_VERSION,
        asOf,
        phase: decision.phaseId,
        window: [window[0], window[window.length - 1]],
        readings: window.map((d) => ({ obsDate: d, value: series.get(d), ...lineage.get(d) })),
        normalMm: window.map((d) => Math.round(weather.normalRainMm(policy.plot.gridCellId, d) * 100) / 100),
        decision,
      };
      const json = canonical(evidence);
      const digest = sha256(json);
      // shortcut: local folder stands in for the S3 Object Lock bucket; move to S3 in Part 11.1.
      const file = path.join(dataDir, 'evidence', `${digest}.json`);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, json);

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
              evidencePath: path.relative(dataDir, file),
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
