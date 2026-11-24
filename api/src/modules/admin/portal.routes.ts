import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { formatPaise } from '@fasalshield/shared';
import { prisma } from '../../db';
import { env } from '../../env';
import { payments, weather } from '../../adapters';
import { audit, canonical } from '../../lib/audit';
import { requireStaff, STAFF_ROLES, type StaffRole } from '../../lib/auth';
import { decrypt, sha256 } from '../../lib/crypto';
import { body, HttpError } from '../../lib/http';
import { hashPassword } from '../../lib/staff-auth';
import { rulesSchema } from '../../rules/engine';
import { requireFreshCode } from '../staff.routes';
import { loadNormals } from '../triggers/service';
import { randomBytes } from 'node:crypto';

/**
 * Admin portal API (parts A2–A7). Every route needs a staff session that passed the authenticator code.
 * Reads are open to all staff roles (regulator and reinsurer included); writes name their roles and are
 * audited. Money moves only through maker-checker batches with a fresh code from a second person.
 */
export const portalRouter = Router();
portalRouter.use(requireStaff());

const WRITE_PRODUCTS: StaffRole[] = ['PRODUCT_MANAGER', 'SYS_ADMIN'];
const SUBMIT_PAYOUTS: StaffRole[] = ['CLAIMS_OPS', 'SYS_ADMIN'];
const APPROVE_PAYOUTS: StaffRole[] = ['PAYOUT_APPROVER', 'SYS_ADMIN'];
const LIVE_POLICY = ['IN_WAITING', 'ACTIVE', 'EXPIRED'];

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const maskPhone = (p: string) => (p.length > 6 ? `${p.slice(0, 5)}•••••${p.slice(-3)}` : '•••');
const safeName = (enc: string | null) => {
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
};
const me = (req: { principal?: { sub: string; role: string } }) => req.principal!;

async function currentSeason() {
  const now = new Date();
  return (
    (await prisma.season.findFirst({
      where: { startDate: { lte: now } },
      orderBy: { startDate: 'desc' },
    })) ?? (await prisma.season.findFirst({ orderBy: { startDate: 'desc' } }))
  );
}

async function staffNames(ids: (string | null | undefined)[]) {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map<string, string>();
  const users = await prisma.user.findMany({
    where: { id: { in: list } },
    select: { id: true, name: true, email: true },
  });
  return new Map(users.map((u) => [u.id, u.name ?? u.email]));
}

// ======================= A2: dashboard =======================

portalRouter.get('/dashboard', async (_req, res) => {
  const season = await currentSeason();
  const code = season?.code ?? '';
  const [totals] = await prisma.$queryRaw<
    {
      policies: number;
      farmers: number;
      si: bigint;
      premium: bigint;
      subsidy: bigint;
      acres: number;
    }[]
  >`SELECT count(*)::int AS policies, count(DISTINCT p."farmerId")::int AS farmers,
           coalesce(sum(p."sumInsuredPaise"),0)::bigint AS si, coalesce(sum(p."premiumPaise"),0)::bigint AS premium,
           coalesce(sum(p."subsidyPaise"),0)::bigint AS subsidy, coalesce(sum(pl."areaAcres"),0)::float AS acres
    FROM "Policy" p JOIN "ProductVersion" v ON v.id = p."productVersionId" JOIN "Plot" pl ON pl.id = p."plotId"
    WHERE v."seasonCode" = ${code} AND p.status::text = ANY(${LIVE_POLICY})`;
  const [pay] = await prisma.$queryRaw<
    {
      paid: bigint;
      paid_count: number;
      total: number;
      p95s: number | null;
      awaiting: number;
      awaiting_paise: bigint;
      oldest: Date | null;
      failed: number;
      breached: number;
    }[]
  >`SELECT coalesce(sum(po."amountPaise") FILTER (WHERE po.status::text = 'SUCCESS'),0)::bigint AS paid,
           count(*) FILTER (WHERE po.status::text = 'SUCCESS')::int AS paid_count,
           count(*)::int AS total,
           percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(epoch FROM po."creditedAt" - te."detectedAt"))
             FILTER (WHERE po."creditedAt" IS NOT NULL) AS p95s,
           count(*) FILTER (WHERE po.status::text = 'AWAITING_BATCH')::int AS awaiting,
           coalesce(sum(po."amountPaise") FILTER (WHERE po.status::text = 'AWAITING_BATCH'),0)::bigint AS awaiting_paise,
           min(te."detectedAt") FILTER (WHERE po.status::text IN ('AWAITING_BATCH','QUEUED')) AS oldest,
           count(*) FILTER (WHERE po.status::text IN ('ACTION_REQUIRED','FAILED_RETRYABLE'))::int AS failed,
           count(*) FILTER (WHERE (po."creditedAt" IS NOT NULL AND po."creditedAt" > po."slaDueAt")
                              OR (po."creditedAt" IS NULL AND po.status::text NOT IN ('CANCELLED','REVERSED') AND now() > po."slaDueAt"))::int AS breached
    FROM "Payout" po JOIN "TriggerEvent" te ON te.id = po."triggerEventId" JOIN "ProductVersion" v ON v.id = te."productVersionId"
    WHERE v."seasonCode" = ${code}`;
  const daily = await prisma.$queryRaw<{ day: Date; paise: bigint; count: number }[]>`
    SELECT d::date AS day, coalesce(sum(po."amountPaise"),0)::bigint AS paise, count(po.id)::int AS count
    FROM generate_series(current_date - 29, current_date, interval '1 day') d
    LEFT JOIN "Payout" po ON po."creditedAt"::date = d::date AND po.status::text = 'SUCCESS'
    GROUP BY d ORDER BY d`;
  const perPolicy = await prisma.$queryRaw<
    {
      district: string | null;
      si: number;
      premium: number;
      paid: bigint;
      slab: number | null;
      events: number;
    }[]
  >`SELECT f."districtCode" AS district, p."sumInsuredPaise" AS si, p."premiumPaise" AS premium,
           (SELECT coalesce(sum(po."amountPaise"),0) FROM "TriggerEvent" te JOIN "Payout" po ON po."triggerEventId" = te.id
              WHERE te."policyId" = p.id AND po.status::text = 'SUCCESS')::bigint AS paid,
           (SELECT max(te."slabLevel") FROM "TriggerEvent" te WHERE te."policyId" = p.id) AS slab,
           (SELECT count(*) FROM "TriggerEvent" te WHERE te."policyId" = p.id)::int AS events
    FROM "Policy" p JOIN "ProductVersion" v ON v.id = p."productVersionId" JOIN "Farmer" f ON f.id = p."farmerId"
    WHERE v."seasonCode" = ${code} AND p.status::text = ANY(${LIVE_POLICY})`;
  const districts = new Map<
    string,
    {
      district: string;
      policies: number;
      sumInsuredPaise: number;
      premiumPaise: number;
      paidPaise: number;
      events: number;
      maxSlab: number;
    }
  >();
  for (const r of perPolicy) {
    const key = r.district ?? 'UNKNOWN';
    const d = districts.get(key) ?? {
      district: key,
      policies: 0,
      sumInsuredPaise: 0,
      premiumPaise: 0,
      paidPaise: 0,
      events: 0,
      maxSlab: 0,
    };
    d.policies++;
    d.sumInsuredPaise += num(r.si);
    d.premiumPaise += num(r.premium);
    d.paidPaise += num(r.paid);
    d.events += num(r.events);
    d.maxSlab = Math.max(d.maxSlab, num(r.slab));
    districts.set(key, d);
  }
  const [pendingBatches, pendingVersions, heldEvents, lastRun] = await Promise.all([
    prisma.payoutBatch.aggregate({
      where: { status: 'SUBMITTED' },
      _count: true,
      _sum: { totalPaise: true },
      _min: { submittedAt: true },
    }),
    prisma.productVersion.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.triggerEvent.count({ where: { status: 'HELD' } }),
    prisma.ingestionRun.findFirst({
      where: { status: 'SUCCEEDED' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  res.json({
    season: season
      ? { code: season.code, startDate: season.startDate, endDate: season.endDate }
      : null,
    totals: {
      policies: totals?.policies ?? 0,
      farmers: totals?.farmers ?? 0,
      acres: Math.round((totals?.acres ?? 0) * 10) / 10,
      sumInsuredPaise: num(totals?.si),
      premiumPaise: num(totals?.premium),
      sponsorPaise: num(totals?.subsidy),
      farmerPaise: num(totals?.premium) - num(totals?.subsidy),
    },
    payouts: {
      paidPaise: num(pay?.paid),
      paidCount: pay?.paid_count ?? 0,
      total: pay?.total ?? 0,
      p95Hours:
        pay?.p95s === null || pay?.p95s === undefined
          ? null
          : Math.round((num(pay.p95s) / 3600) * 10) / 10,
      awaiting: pay?.awaiting ?? 0,
      awaitingPaise: num(pay?.awaiting_paise),
      oldestWaitingSince: pay?.oldest ?? null,
      failed: pay?.failed ?? 0,
      slaBreached: pay?.breached ?? 0,
    },
    daily: daily.map((d) => ({
      day: d.day.toISOString().slice(0, 10),
      paise: num(d.paise),
      count: d.count,
    })),
    districts: [...districts.values()].sort((a, b) => b.sumInsuredPaise - a.sumInsuredPaise),
    attention: {
      batchesAwaitingApproval: pendingBatches._count,
      batchesAwaitingPaise: num(pendingBatches._sum.totalPaise),
      oldestBatchAt: pendingBatches._min.submittedAt,
      versionsAwaitingApproval: pendingVersions,
      eventsHeld: heldEvents,
      lastRain: lastRun
        ? { at: lastRun.createdAt, source: lastRun.dataSourceCode, to: lastRun.toDate }
        : null,
    },
  });
});

// ======================= A3: products =======================

portalRouter.get('/products', async (_req, res) => {
  const products = await prisma.product.findMany({
    orderBy: { code: 'asc' },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        include: { _count: { select: { policies: true } } },
      },
    },
  });
  const names = await staffNames(
    products.flatMap((p) => p.versions.flatMap((v) => [v.submittedById, v.approvedById])),
  );
  res.json({
    products: products.map((p) => ({
      id: p.id,
      code: p.code,
      name: (p.namesI18n as Record<string, string>)?.en ?? p.code,
      peril: p.peril,
      versions: p.versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        seasonCode: v.seasonCode,
        sumInsuredPaise: v.sumInsuredPaise,
        premiumRateBp: v.premiumRateBp,
        subsidyBp: v.subsidyBp,
        enrolmentCutoff: v.enrolmentCutoff,
        waitingPeriodDays: v.waitingPeriodDays,
        eligibleDistricts: v.eligibleDistricts,
        eligibleCrops: v.eligibleCrops,
        rules: v.rules,
        rulesSha256: v.rulesSha256,
        publishedAt: v.publishedAt,
        submittedBy: v.submittedById ? (names.get(v.submittedById) ?? 'Staff') : null,
        submittedById: v.submittedById,
        approvedBy: v.approvedById ? (names.get(v.approvedById) ?? 'Staff') : null,
        reviewNote: v.reviewNote,
        policies: v._count.policies,
      })),
    })),
  });
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** New DRAFT version, copied from an existing one with the changes given. Published versions never change. */
portalRouter.post('/products/:id/versions', requireStaff(...WRITE_PRODUCTS), async (req, res) => {
  const input = body(
    req,
    z.object({
      fromVersionId: z.string().uuid(),
      seasonCode: z.string().min(3).max(40),
      sumInsuredPaise: z.number().int().min(10_000).max(100_000_000),
      premiumRateBp: z.number().int().min(1).max(5000),
      subsidyBp: z.number().int().min(0).max(10_000),
      enrolmentCutoff: isoDate,
      waitingPeriodDays: z.number().int().min(0).max(60),
      phases: z
        .array(
          z.object({
            id: z.string().min(1).max(40),
            from: isoDate,
            to: isoDate,
            weightPct: z.number().min(1).max(100),
          }),
        )
        .min(1)
        .max(6),
      slabs: z
        .array(
          z.object({
            level: z.number().int().min(1).max(5),
            threshold: z.number().min(0),
            payoutPctOfPhase: z.number().min(1).max(100),
          }),
        )
        .min(1)
        .max(5),
    }),
  );
  const product = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  const from = await prisma.productVersion.findUnique({ where: { id: input.fromVersionId } });
  if (!product || !from || from.productId !== product.id)
    throw new HttpError(404, 'product_not_found');
  if (!(await prisma.season.findUnique({ where: { code: input.seasonCode } })))
    throw new HttpError(422, 'season_unknown');
  if (Math.round(input.phases.reduce((s, p) => s + p.weightPct, 0)) !== 100)
    throw new HttpError(422, 'phase_weights_must_total_100');
  const slabs = [...input.slabs].sort((a, b) => a.level - b.level);
  for (let i = 1; i < slabs.length; i++) {
    if (
      slabs[i]!.threshold <= slabs[i - 1]!.threshold ||
      slabs[i]!.payoutPctOfPhase < slabs[i - 1]!.payoutPctOfPhase
    )
      throw new HttpError(422, 'slabs_must_rise');
  }
  for (const p of input.phases) if (p.from > p.to) throw new HttpError(422, 'phase_dates_invalid');
  const rules = { ...(from.rules as Record<string, unknown>), phases: input.phases, slabs };
  const parsed = rulesSchema.safeParse(rules);
  if (!parsed.success) throw new HttpError(422, 'rules_invalid');

  const last = await prisma.productVersion.aggregate({
    where: { productId: product.id },
    _max: { version: true },
  });
  const version = await prisma.productVersion.create({
    data: {
      productId: product.id,
      version: (last._max.version ?? 0) + 1,
      status: 'DRAFT',
      rules: parsed.data as Prisma.InputJsonValue,
      premiumRateBp: input.premiumRateBp,
      subsidyBp: input.subsidyBp,
      sumInsuredPaise: input.sumInsuredPaise,
      seasonCode: input.seasonCode,
      eligibleDistricts: from.eligibleDistricts,
      eligibleCrops: from.eligibleCrops,
      enrolmentCutoff: new Date(`${input.enrolmentCutoff}T00:00:00Z`),
      waitingPeriodDays: input.waitingPeriodDays,
      submittedById: me(req).sub,
    },
  });
  await audit({
    actorType: 'STAFF',
    actorId: me(req).sub,
    action: 'VERSION_DRAFTED',
    entityType: 'ProductVersion',
    entityId: version.id,
    diff: { product: product.code, version: version.version },
  });
  res.status(201).json({ id: version.id, version: version.version });
});

portalRouter.post('/versions/:id/submit', requireStaff(...WRITE_PRODUCTS), async (req, res) => {
  const v = await prisma.productVersion.findUnique({ where: { id: String(req.params.id) } });
  if (!v) throw new HttpError(404, 'version_not_found');
  if (v.status !== 'DRAFT') throw new HttpError(409, 'version_not_draft');
  await prisma.productVersion.update({
    where: { id: v.id },
    data: { status: 'PENDING_APPROVAL', submittedById: me(req).sub, reviewNote: null },
  });
  await audit({
    actorType: 'STAFF',
    actorId: me(req).sub,
    action: 'VERSION_SUBMITTED',
    entityType: 'ProductVersion',
    entityId: v.id,
  });
  res.json({ status: 'PENDING_APPROVAL' });
});

/** Four-eyes publish: a different person approves with a fresh code; the rules are then hashed and frozen. */
portalRouter.post('/versions/:id/approve', requireStaff(...WRITE_PRODUCTS), async (req, res) => {
  const v = await prisma.productVersion.findUnique({ where: { id: String(req.params.id) } });
  if (!v) throw new HttpError(404, 'version_not_found');
  if (v.status !== 'PENDING_APPROVAL') throw new HttpError(409, 'version_not_pending');
  if (v.submittedById === me(req).sub) throw new HttpError(403, 'four_eyes_required');
  await requireFreshCode(me(req).sub, (req.body as { code?: unknown })?.code);
  const hash = sha256(canonical(v.rules));
  await prisma.$transaction(async (tx) => {
    await tx.productVersion.update({
      where: { id: v.id },
      data: {
        status: 'PUBLISHED',
        rulesSha256: hash,
        publishedAt: new Date(),
        approvedById: me(req).sub,
      },
    });
    await audit(
      {
        actorType: 'STAFF',
        actorId: me(req).sub,
        action: 'VERSION_PUBLISHED',
        entityType: 'ProductVersion',
        entityId: v.id,
        diff: { rulesSha256: hash },
      },
      tx,
    );
  });
  res.json({ status: 'PUBLISHED', rulesSha256: hash });
});

portalRouter.post('/versions/:id/reject', requireStaff(...WRITE_PRODUCTS), async (req, res) => {
  const { note } = body(req, z.object({ note: z.string().trim().min(3).max(500) }));
  const v = await prisma.productVersion.findUnique({ where: { id: String(req.params.id) } });
  if (!v) throw new HttpError(404, 'version_not_found');
  if (v.status !== 'PENDING_APPROVAL') throw new HttpError(409, 'version_not_pending');
  await prisma.productVersion.update({
    where: { id: v.id },
    data: { status: 'DRAFT', reviewNote: note },
  });
  await audit({
    actorType: 'STAFF',
    actorId: me(req).sub,
    action: 'VERSION_SENT_BACK',
    entityType: 'ProductVersion',
    entityId: v.id,
    diff: { note },
  });
  res.json({ status: 'DRAFT' });
});

// ======================= A4: payouts, batches, trigger events =======================

const payoutInclude = {
  wallet: { select: { handleMasked: true, status: true } },
  batch: { select: { code: true } },
  triggerEvent: {
    include: {
      productVersion: {
        include: { product: { select: { code: true, namesI18n: true, peril: true } } },
      },
      policy: {
        include: {
          farmer: {
            select: { id: true, nameEnc: true, phoneE164: true, districtCode: true, village: true },
          },
        },
      },
    },
  },
} satisfies Prisma.PayoutInclude;
type PayoutRow = Prisma.PayoutGetPayload<{ include: typeof payoutInclude }>;

const payoutView = (p: PayoutRow) => ({
  id: p.id,
  status: p.status,
  amountPaise: p.amountPaise,
  upi: p.wallet?.handleMasked ?? null,
  upiStatus: p.wallet?.status ?? null,
  utr: p.utr,
  failureReason: p.failureReason,
  batch: p.batch?.code ?? null,
  slaDueAt: p.slaDueAt,
  creditedAt: p.creditedAt,
  detectedAt: p.triggerEvent.detectedAt,
  triggerEventId: p.triggerEventId,
  product:
    (p.triggerEvent.productVersion.product.namesI18n as Record<string, string>)?.en ??
    p.triggerEvent.productVersion.product.code,
  peril: p.triggerEvent.peril,
  phaseId: p.triggerEvent.phaseId,
  slabLevel: p.triggerEvent.slabLevel,
  policyNumber: p.triggerEvent.policy.policyNumber,
  farmer: {
    id: p.triggerEvent.policy.farmer.id,
    name: safeName(p.triggerEvent.policy.farmer.nameEnc),
    phone: maskPhone(p.triggerEvent.policy.farmer.phoneE164),
    district: p.triggerEvent.policy.farmer.districtCode,
    village: p.triggerEvent.policy.farmer.village,
  },
});

portalRouter.get('/payouts', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const where: Prisma.PayoutWhereInput =
    status === 'failed'
      ? { status: { in: ['ACTION_REQUIRED', 'FAILED_RETRYABLE'] } }
      : status
        ? { status: status as Prisma.EnumPayoutStatusFilter['equals'] }
        : {};
  const rows = await prisma.payout.findMany({
    where,
    include: payoutInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ payouts: rows.map(payoutView) });
});

portalRouter.get('/batches', async (_req, res) => {
  const batches = await prisma.payoutBatch.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 100,
    include: { payouts: { select: { status: true } } },
  });
  const names = await staffNames(batches.flatMap((b) => [b.submittedById, b.approvedById]));
  res.json({
    batches: batches.map((b) => ({
      id: b.id,
      code: b.code,
      status: b.status,
      count: b.count,
      totalPaise: b.totalPaise,
      submittedBy: names.get(b.submittedById) ?? 'Staff',
      submittedById: b.submittedById,
      submittedAt: b.submittedAt,
      approvedBy: b.approvedById ? (names.get(b.approvedById) ?? 'Staff') : null,
      approvedAt: b.approvedAt,
      note: b.note,
      credited: b.payouts.filter((p) => p.status === 'SUCCESS').length,
      failed: b.payouts.filter(
        (p) => p.status === 'ACTION_REQUIRED' || p.status === 'FAILED_RETRYABLE',
      ).length,
    })),
  });
});

/** Maker step: groups payouts awaiting a batch (all, or the ones listed) into a batch for approval. */
portalRouter.post('/batches', requireStaff(...SUBMIT_PAYOUTS), async (req, res) => {
  const { payoutIds } = body(
    req,
    z.object({ payoutIds: z.array(z.string().uuid()).max(5000).optional() }),
  );
  const batch = await prisma.$transaction(async (tx) => {
    const waiting = await tx.payout.findMany({
      where: { status: 'AWAITING_BATCH', ...(payoutIds ? { id: { in: payoutIds } } : {}) },
      select: { id: true, amountPaise: true },
    });
    if (!waiting.length) throw new HttpError(422, 'nothing_to_batch');
    const year = new Date().getUTCFullYear();
    const n = await tx.payoutBatch.count({ where: { code: { startsWith: `PB-${year}-` } } });
    const b = await tx.payoutBatch.create({
      data: {
        code: `PB-${year}-${String(n + 1).padStart(4, '0')}`,
        count: waiting.length,
        totalPaise: waiting.reduce((s, p) => s + p.amountPaise, 0),
        submittedById: me(req).sub,
      },
    });
    const moved = await tx.payout.updateMany({
      where: { id: { in: waiting.map((p) => p.id) }, status: 'AWAITING_BATCH' },
      data: { batchId: b.id, status: 'QUEUED' },
    });
    if (moved.count !== waiting.length) throw new HttpError(409, 'payouts_changed_retry');
    await audit(
      {
        actorType: 'STAFF',
        actorId: me(req).sub,
        action: 'BATCH_SUBMITTED',
        entityType: 'PayoutBatch',
        entityId: b.id,
        diff: { code: b.code, count: b.count, totalPaise: b.totalPaise },
      },
      tx,
    );
    return b;
  });
  res
    .status(201)
    .json({ id: batch.id, code: batch.code, count: batch.count, totalPaise: batch.totalPaise });
});

/** Checker step: a different person approves with a fresh code; each payout is sent once (idempotency key). */
portalRouter.post('/batches/:id/approve', requireStaff(...APPROVE_PAYOUTS), async (req, res) => {
  const id = String(req.params.id);
  const batch = await prisma.payoutBatch.findUnique({ where: { id } });
  if (!batch) throw new HttpError(404, 'batch_not_found');
  if (batch.status !== 'SUBMITTED') throw new HttpError(409, 'batch_not_pending');
  if (batch.submittedById === me(req).sub) throw new HttpError(403, 'maker_checker_required');
  await requireFreshCode(me(req).sub, (req.body as { code?: unknown })?.code);

  // Claim the batch first so two approvers clicking together cannot both send it.
  const claimed = await prisma.payoutBatch.updateMany({
    where: { id, status: 'SUBMITTED' },
    data: { status: 'APPROVED', approvedById: me(req).sub, approvedAt: new Date() },
  });
  if (claimed.count !== 1) throw new HttpError(409, 'batch_not_pending');
  await audit({
    actorType: 'STAFF',
    actorId: me(req).sub,
    action: 'BATCH_APPROVED',
    entityType: 'PayoutBatch',
    entityId: id,
    diff: { code: batch.code },
  });

  const items = await prisma.payout.findMany({
    where: { batchId: id, status: 'QUEUED' },
    include: { wallet: true, triggerEvent: { include: { policy: { include: { farmer: true } } } } },
  });
  let credited = 0;
  let failed = 0;
  for (const p of items) {
    await prisma.payout.update({ where: { id: p.id }, data: { status: 'SENT' } });
    const vpa = p.wallet ? safeName(p.wallet.handleEnc) : null;
    const result = vpa
      ? await payments.sendPayout({
          amountPaise: p.amountPaise,
          vpa,
          idempotencyKey: p.idempotencyKey,
        })
      : { status: 'FAILED' as const, reason: 'no_upi_id' };
    if (result.status === 'SUCCESS') {
      credited++;
      await prisma.$transaction(async (tx) => {
        await tx.payout.update({
          where: { id: p.id },
          data: {
            status: 'SUCCESS',
            utr: result.utr ?? null,
            creditedAt: new Date(),
            failureReason: null,
          },
        });
        await tx.triggerEvent.update({ where: { id: p.triggerEventId }, data: { status: 'PAID' } });
        await tx.notification.create({
          data: {
            farmerId: p.triggerEvent.policy.farmerId,
            templateCode: 'PAYOUT_SENT',
            channel: 'IN_APP',
            language: p.triggerEvent.policy.farmer.language,
            body: JSON.stringify({
              amount: formatPaise(p.amountPaise),
              utr: result.utr,
              policy: p.triggerEvent.policy.policyNumber,
            }),
          },
        });
        await audit(
          {
            actorType: 'SYSTEM',
            action: 'PAYOUT_CREDITED',
            entityType: 'Payout',
            entityId: p.id,
            diff: { utr: result.utr ?? null, amountPaise: p.amountPaise },
          },
          tx,
        );
      });
    } else {
      failed++;
      await prisma.payout.update({
        where: { id: p.id },
        data: { status: 'ACTION_REQUIRED', failureReason: result.reason ?? 'failed' },
      });
      await audit({
        actorType: 'SYSTEM',
        action: 'PAYOUT_FAILED',
        entityType: 'Payout',
        entityId: p.id,
        diff: { reason: result.reason ?? 'failed' },
      });
    }
  }
  await prisma.payoutBatch.update({ where: { id }, data: { status: 'SENT' } });
  res.json({ code: batch.code, credited, failed });
});

portalRouter.post('/batches/:id/reject', requireStaff(...APPROVE_PAYOUTS), async (req, res) => {
  const { note } = body(req, z.object({ note: z.string().trim().min(3).max(500) }));
  const id = String(req.params.id);
  const batch = await prisma.payoutBatch.findUnique({ where: { id } });
  if (!batch) throw new HttpError(404, 'batch_not_found');
  if (batch.status !== 'SUBMITTED') throw new HttpError(409, 'batch_not_pending');
  await prisma.$transaction(async (tx) => {
    await tx.payoutBatch.update({
      where: { id },
      data: { status: 'REJECTED', note, approvedById: me(req).sub, approvedAt: new Date() },
    });
    await tx.payout.updateMany({
      where: { batchId: id, status: 'QUEUED' },
      data: { status: 'AWAITING_BATCH', batchId: null },
    });
    await audit(
      {
        actorType: 'STAFF',
        actorId: me(req).sub,
        action: 'BATCH_REJECTED',
        entityType: 'PayoutBatch',
        entityId: id,
        diff: { note },
      },
      tx,
    );
  });
  res.json({ status: 'REJECTED' });
});

portalRouter.get('/triggers', async (_req, res) => {
  const events = await prisma.triggerEvent.findMany({
    orderBy: { detectedAt: 'desc' },
    take: 200,
    include: {
      payout: { select: { status: true, amountPaise: true } },
      productVersion: { include: { product: { select: { code: true, namesI18n: true } } } },
      policy: {
        include: { farmer: { select: { nameEnc: true, districtCode: true, village: true } } },
      },
    },
  });
  res.json({
    events: events.map((e) => ({
      id: e.id,
      detectedAt: e.detectedAt,
      status: e.status,
      peril: e.peril,
      phaseId: e.phaseId,
      slabLevel: e.slabLevel,
      indexValue: e.indexValue,
      threshold: e.threshold,
      amountPaise: e.payoutAmountPaise,
      payoutStatus: e.payout?.status ?? null,
      product:
        (e.productVersion.product.namesI18n as Record<string, string>)?.en ??
        e.productVersion.product.code,
      farmer: safeName(e.policy.farmer.nameEnc),
      district: e.policy.farmer.districtCode,
      village: e.policy.farmer.village,
      policyNumber: e.policy.policyNumber,
    })),
  });
});

/** Why a farmer was paid: evidence snapshot, a fresh hash check, the rule version and the audit timeline. */
portalRouter.get('/triggers/:id', async (req, res) => {
  const e = await prisma.triggerEvent.findUnique({
    where: { id: String(req.params.id) },
    include: {
      payout: {
        include: {
          wallet: { select: { handleMasked: true } },
          batch: { select: { code: true, id: true } },
        },
      },
      productVersion: { include: { product: true } },
      policy: { include: { farmer: true, plot: { include: { gridCell: true } } } },
    },
  });
  if (!e) throw new HttpError(404, 'event_not_found');
  const evidenceOk = e.evidence ? sha256(canonical(e.evidence)) === e.evidenceSha256 : null;
  const rulesOk = e.productVersion.rulesSha256
    ? sha256(canonical(e.productVersion.rules)) === e.productVersion.rulesSha256
    : null;
  const ids = [e.id, e.payout?.id, e.payout?.batch?.id].filter((x): x is string => !!x);
  const log = await prisma.auditLog.findMany({
    where: { entityId: { in: ids } },
    orderBy: { seq: 'asc' },
  });
  const names = await staffNames(log.map((l) => l.actorId));
  res.json({
    event: {
      id: e.id,
      detectedAt: e.detectedAt,
      status: e.status,
      peril: e.peril,
      phaseId: e.phaseId,
      slabLevel: e.slabLevel,
      indexValue: e.indexValue,
      threshold: e.threshold,
      amountPaise: e.payoutAmountPaise,
      engineVersion: e.engineVersion,
      evidenceSha256: e.evidenceSha256,
      evidenceOk,
      evidence: e.evidence,
    },
    rule: {
      product:
        (e.productVersion.product.namesI18n as Record<string, string>)?.en ??
        e.productVersion.product.code,
      code: e.productVersion.product.code,
      version: e.productVersion.version,
      rulesSha256: e.productVersion.rulesSha256,
      rulesOk,
      rules: e.productVersion.rules,
    },
    policy: {
      number: e.policy.policyNumber,
      cropCode: e.policy.cropCode,
      sumInsuredPaise: e.policy.sumInsuredPaise,
      acres: e.policy.plot.areaAcres,
      gridCell: {
        id: e.policy.plot.gridCellId,
        lat: e.policy.plot.gridCell.minLat,
        lng: e.policy.plot.gridCell.minLng,
      },
    },
    farmer: {
      id: e.policy.farmer.id,
      name: safeName(e.policy.farmer.nameEnc),
      phone: maskPhone(e.policy.farmer.phoneE164),
      district: e.policy.farmer.districtCode,
      village: e.policy.farmer.village,
    },
    payout: e.payout
      ? {
          status: e.payout.status,
          amountPaise: e.payout.amountPaise,
          upi: e.payout.wallet?.handleMasked ?? null,
          utr: e.payout.utr,
          creditedAt: e.payout.creditedAt,
          slaDueAt: e.payout.slaDueAt,
          batch: e.payout.batch?.code ?? null,
          failureReason: e.payout.failureReason,
        }
      : null,
    timeline: log.map((l) => ({
      at: l.at,
      action: l.action,
      actor:
        l.actorType === 'STAFF'
          ? (names.get(l.actorId ?? '') ?? 'Staff')
          : l.actorType === 'SYSTEM'
            ? 'System'
            : l.actorType,
    })),
  });
});

// ======================= A5: farmers & policies =======================

portalRouter.get('/farmers', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
  const district = typeof req.query.district === 'string' ? req.query.district : '';
  const kyc = typeof req.query.kyc === 'string' ? req.query.kyc : '';
  const digits = q.replace(/\D/g, '');
  const where: Prisma.FarmerWhereInput = {
    ...(district ? { districtCode: district } : {}),
    ...(kyc ? { kycStatus: kyc as Prisma.EnumKycStatusFilter['equals'] } : {}),
    ...(q
      ? {
          OR: [
            { farmerCode: { contains: q, mode: 'insensitive' } },
            { village: { contains: q, mode: 'insensitive' } },
            ...(digits.length >= 4 ? [{ phoneE164: { endsWith: digits } }] : []),
            { policies: { some: { policyNumber: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };
  const farmers = await prisma.farmer.findMany({
    where,
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: {
      wallets: { where: { isPrimary: true }, select: { handleMasked: true, status: true } },
      policies: {
        select: {
          status: true,
          plot: { select: { areaAcres: true } },
          productVersion: { select: { product: { select: { peril: true } } } },
        },
      },
    },
  });
  const paid = await prisma.$queryRaw<{ farmerId: string; paise: bigint }[]>`
    SELECT p."farmerId", coalesce(sum(po."amountPaise"),0)::bigint AS paise
    FROM "Policy" p JOIN "TriggerEvent" te ON te."policyId" = p.id JOIN "Payout" po ON po."triggerEventId" = te.id
    WHERE po.status::text = 'SUCCESS' GROUP BY p."farmerId"`;
  const paidBy = new Map(paid.map((r) => [r.farmerId, num(r.paise)]));
  const total = await prisma.farmer.count({ where });
  res.json({
    total,
    farmers: farmers.map((f) => ({
      id: f.id,
      code: f.farmerCode,
      name: safeName(f.nameEnc),
      phone: maskPhone(f.phoneE164),
      district: f.districtCode,
      village: f.village,
      kyc: f.kycStatus,
      upi: f.wallets[0]?.handleMasked ?? null,
      upiStatus: f.wallets[0]?.status ?? null,
      activePolicies: f.policies.filter((p) => LIVE_POLICY.includes(p.status)).length,
      perils: [...new Set(f.policies.map((p) => p.productVersion.product.peril))],
      acres: Math.round(f.policies.reduce((s, p) => s + (p.plot.areaAcres ?? 0), 0) * 10) / 10,
      paidPaise: paidBy.get(f.id) ?? 0,
    })),
  });
});

portalRouter.get('/farmers/:id', async (req, res) => {
  const f = await prisma.farmer.findUnique({
    where: { id: String(req.params.id) },
    include: {
      wallets: {
        select: {
          handleMasked: true,
          status: true,
          verifiedName: true,
          isPrimary: true,
          createdAt: true,
        },
      },
      plots: {
        select: {
          id: true,
          areaAcres: true,
          lat: true,
          lng: true,
          gridCellId: true,
          gpsAccuracyM: true,
          createdAt: true,
        },
      },
      policies: {
        orderBy: { createdAt: 'desc' },
        include: {
          productVersion: {
            include: { product: { select: { code: true, namesI18n: true, peril: true } } },
          },
          triggerEvents: {
            include: {
              payout: { select: { status: true, amountPaise: true, creditedAt: true, utr: true } },
            },
          },
        },
      },
      consents: {
        select: { purpose: true, noticeVersion: true, grantedAt: true, withdrawnAt: true },
      },
    },
  });
  if (!f) throw new HttpError(404, 'farmer_not_found');
  await audit({
    actorType: 'STAFF',
    actorId: me(req).sub,
    action: 'FARMER_VIEWED',
    entityType: 'Farmer',
    entityId: f.id,
  });
  res.json({
    farmer: {
      id: f.id,
      code: f.farmerCode,
      name: safeName(f.nameEnc),
      phone: maskPhone(f.phoneE164),
      language: f.language,
      district: f.districtCode,
      village: f.village,
      kyc: f.kycStatus,
      createdAt: f.createdAt,
    },
    wallets: f.wallets,
    plots: f.plots.map((p) => ({
      ...p,
      lat: Math.round(p.lat * 1000) / 1000,
      lng: Math.round(p.lng * 1000) / 1000,
    })),
    consents: f.consents,
    policies: f.policies.map((p) => ({
      id: p.id,
      number: p.policyNumber,
      status: p.status,
      cropCode: p.cropCode,
      product:
        (p.productVersion.product.namesI18n as Record<string, string>)?.en ??
        p.productVersion.product.code,
      peril: p.productVersion.product.peril,
      version: p.productVersion.version,
      sumInsuredPaise: p.sumInsuredPaise,
      premiumPaise: p.premiumPaise,
      subsidyPaise: p.subsidyPaise,
      coverStart: p.coverStart,
      coverEnd: p.coverEnd,
      events: p.triggerEvents.map((e) => ({
        id: e.id,
        phaseId: e.phaseId,
        slabLevel: e.slabLevel,
        amountPaise: e.payoutAmountPaise,
        detectedAt: e.detectedAt,
        payout: e.payout,
      })),
    })),
  });
});

// ======================= A6: rain data =======================

portalRouter.get('/rain', async (req, res) => {
  const districtRows = await prisma.gridCell.findMany({
    where: { districtCode: { not: null }, plots: { some: {} } },
    distinct: ['districtCode'],
    select: { districtCode: true },
  });
  const districts = districtRows.map((d) => d.districtCode!).sort();
  const district =
    typeof req.query.district === 'string' && districts.includes(req.query.district)
      ? req.query.district
      : districts[0];
  const season = await currentSeason();
  const from = season
    ? season.startDate.toISOString().slice(0, 10)
    : new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const cells = district
    ? await prisma.gridCell.findMany({
        where: { districtCode: district },
        select: { id: true, minLat: true, minLng: true, _count: { select: { plots: true } } },
      })
    : [];
  const sums = cells.length
    ? await prisma.$queryRaw<{ gridCellId: number; mm: number; days: number }[]>`
        SELECT r."gridCellId", sum(r.value)::float AS mm, count(*)::int AS days FROM (
          SELECT DISTINCT ON (ir."gridCellId", ir."obsDate") ir."gridCellId", ir.value
          FROM "IndexReading" ir
          WHERE ir."gridCellId" = ANY(${cells.map((c) => c.id)}) AND ir.metric = 'RAIN_MM'
            AND ir."obsDate" BETWEEN ${new Date(`${from}T00:00:00Z`)} AND ${new Date(`${to}T00:00:00Z`)}
            AND NOT (${env.WEATHER_PROVIDER === 'chirps'} AND ir."dataSourceCode" = 'SIMULATOR' AND ir."sourceVersion" = 1)
          ORDER BY ir."gridCellId", ir."obsDate", ir."sourceVersion" DESC, ir."ingestionRunId" DESC
        ) r GROUP BY r."gridCellId"`
    : [];
  const byCell = new Map(sums.map((s) => [s.gridCellId, s]));
  await loadNormals(cells.map((c) => c.id));
  const dayList: string[] = [];
  for (
    let t = new Date(`${from}T00:00:00Z`).getTime();
    t <= new Date(`${to}T00:00:00Z`).getTime();
    t += 86_400_000
  )
    dayList.push(new Date(t).toISOString().slice(0, 10));
  const runs = await prisma.ingestionRun.findMany({ orderBy: { createdAt: 'desc' }, take: 12 });
  res.json({
    districts,
    district: district ?? null,
    from,
    to,
    source: env.WEATHER_PROVIDER === 'chirps' ? 'REAL' : weather.sourceCode,
    cells: cells.map((c) => {
      const s = byCell.get(c.id);
      const normal = dayList.reduce((acc, d) => acc + weather.normalRainMm(c.id, d), 0);
      const mm = s?.mm ?? null;
      return {
        id: c.id,
        lat: c.minLat,
        lng: c.minLng,
        plots: c._count.plots,
        rainMm: mm === null ? null : Math.round(mm * 10) / 10,
        normalMm: Math.round(normal * 10) / 10,
        pctBelow:
          mm === null || normal <= 0 ? null : Math.round(Math.max(0, (1 - mm / normal) * 100)),
        days: s?.days ?? 0,
      };
    }),
    runs: runs.map((r) => ({
      id: r.id,
      at: r.createdAt,
      source: r.dataSourceCode,
      from: r.fromDate,
      to: r.toDate,
      status: r.status,
      readings: r.readingsWritten,
      note: r.note,
    })),
  });
});

// ======================= A7: audit log and staff =======================

portalRouter.get('/audit', async (req, res) => {
  const before = Number(req.query.before) || undefined;
  const action =
    typeof req.query.action === 'string' && req.query.action ? req.query.action : undefined;
  const rows = await prisma.auditLog.findMany({
    where: { ...(before ? { seq: { lt: before } } : {}), ...(action ? { action } : {}) },
    orderBy: { seq: 'desc' },
    take: 50,
  });
  const names = await staffNames(rows.map((r) => (r.actorType === 'STAFF' ? r.actorId : null)));
  const total = await prisma.auditLog.count();
  res.json({
    total,
    entries: rows.map((r) => ({
      seq: r.seq,
      at: r.at,
      actorType: r.actorType,
      actor:
        r.actorType === 'STAFF'
          ? (names.get(r.actorId ?? '') ?? 'Staff')
          : r.actorType === 'SYSTEM'
            ? 'System'
            : r.actorType === 'FARMER'
              ? 'Farmer'
              : r.actorType,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      hash: r.hash,
    })),
    nextBefore: rows.length === 50 ? rows[rows.length - 1]!.seq : null,
  });
});

portalRouter.get('/staff', requireStaff('SYS_ADMIN'), async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({
    staff: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      mfa: !!u.mfaEnrolledAt,
      locked: !!u.lockedUntil && u.lockedUntil > new Date(),
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
  });
});

const newPassword = () => randomBytes(18).toString('base64url');
const resetFields = () => ({
  mustChangePassword: true,
  totpSecretEnc: null,
  totpLastStep: null,
  mfaEnrolledAt: null,
  failedLogins: 0,
  lockedUntil: null,
});

/** Invite: creates the account and returns a one-time password ONCE. The person enrols the authenticator at first sign-in. */
portalRouter.post('/staff', requireStaff('SYS_ADMIN'), async (req, res) => {
  const input = body(
    req,
    z.object({
      email: z.string().email().max(200),
      name: z.string().trim().min(2).max(80),
      role: z.enum(STAFF_ROLES),
    }),
  );
  const email = input.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, 'staff_exists');
  const admin = await prisma.user.findUnique({ where: { id: me(req).sub } });
  const password = newPassword();
  const user = await prisma.user.create({
    data: {
      email,
      name: input.name,
      role: input.role,
      orgId: admin!.orgId,
      passwordHash: hashPassword(password),
      ...resetFields(),
    },
  });
  await audit({
    actorType: 'STAFF',
    actorId: me(req).sub,
    action: 'STAFF_CREATED',
    entityType: 'User',
    entityId: user.id,
    diff: { email, role: input.role },
  });
  res.status(201).json({ id: user.id, email, oneTimePassword: password });
});

portalRouter.patch('/staff/:id', requireStaff('SYS_ADMIN'), async (req, res) => {
  const input = body(
    req,
    z.object({
      role: z.enum(STAFF_ROLES).optional(),
      status: z.enum(['ACTIVE', 'DISABLED']).optional(),
    }),
  );
  const id = String(req.params.id);
  if (id === me(req).sub) throw new HttpError(403, 'cannot_change_self');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'staff_not_found');
  await prisma.user.update({ where: { id }, data: input });
  // Any change to role or status ends their open sessions, so new rights apply at once.
  await prisma.refreshToken.updateMany({
    where: { subjectId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await audit({
    actorType: 'STAFF',
    actorId: me(req).sub,
    action: 'STAFF_UPDATED',
    entityType: 'User',
    entityId: id,
    diff: input,
  });
  res.json({ ok: true });
});

portalRouter.post('/staff/:id/reset', requireStaff('SYS_ADMIN'), async (req, res) => {
  const id = String(req.params.id);
  if (id === me(req).sub) throw new HttpError(403, 'cannot_change_self');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'staff_not_found');
  const password = newPassword();
  await prisma.user.update({
    where: { id },
    data: { passwordHash: hashPassword(password), status: 'ACTIVE', ...resetFields() },
  });
  await prisma.refreshToken.updateMany({
    where: { subjectId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await audit({
    actorType: 'STAFF',
    actorId: me(req).sub,
    action: 'STAFF_RESET',
    entityType: 'User',
    entityId: id,
  });
  res.json({ oneTimePassword: password });
});

// ---------- Complaints (grievance redressal) and land checks ----------
const HANDLE_CASES: StaffRole[] = ['CLAIMS_OPS', 'SYS_ADMIN'];
const READ_CASES: StaffRole[] = ['CLAIMS_OPS', 'SYS_ADMIN', 'REGULATOR'];

/** Complaints queue, oldest deadline first. Messages are personal data: claims, admin and regulator only. */
portalRouter.get('/grievances', requireStaff(...READ_CASES), async (req, res) => {
  const status =
    typeof req.query.status === 'string' &&
    ['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(req.query.status)
      ? req.query.status
      : undefined;
  const items = await prisma.grievance.findMany({
    where: status ? { status } : { status: { not: 'RESOLVED' } },
    orderBy: status === 'RESOLVED' ? { resolvedAt: 'desc' } : { dueAt: 'asc' },
    take: 200,
    include: {
      farmer: {
        select: { id: true, farmerCode: true, nameEnc: true, phoneE164: true, districtCode: true },
      },
    },
  });
  const policyIds = items.map((g) => g.policyId).filter((x): x is string => !!x);
  const policies = await prisma.policy.findMany({
    where: { id: { in: policyIds } },
    select: { id: true, policyNumber: true },
  });
  const pn = new Map(policies.map((p) => [p.id, p.policyNumber]));
  await audit({
    actorType: 'STAFF',
    actorId: me(req).sub,
    action: 'GRIEVANCES_VIEWED',
    entityType: 'Grievance',
    entityId: null,
    diff: { status: status ?? 'OPEN_ALL', count: items.length },
  });
  res.json(
    items.map((g) => ({
      id: g.id,
      ticketNo: g.ticketNo,
      category: g.category,
      message: safeName(g.messageEnc),
      status: g.status,
      response: g.response,
      dueAt: g.dueAt,
      createdAt: g.createdAt,
      resolvedAt: g.resolvedAt,
      policyNumber: g.policyId ? (pn.get(g.policyId) ?? null) : null,
      farmer: {
        id: g.farmer.id,
        code: g.farmer.farmerCode,
        name: safeName(g.farmer.nameEnc),
        phone: maskPhone(g.farmer.phoneE164),
        district: g.farmer.districtCode,
      },
    })),
  );
});

/** Answer or progress a complaint; the farmer sees the answer in the app inbox. */
portalRouter.patch('/grievances/:id', requireStaff(...HANDLE_CASES), async (req, res) => {
  const input = body(
    req,
    z.object({
      status: z.enum(['IN_PROGRESS', 'RESOLVED']),
      response: z.string().trim().min(5).max(1000),
    }),
  );
  const g = await prisma.grievance.findUnique({
    where: { id: String(req.params.id) },
    include: { farmer: { select: { language: true } } },
  });
  if (!g) throw new HttpError(404, 'not_found');
  if (g.status === 'RESOLVED') throw new HttpError(409, 'already_resolved');
  await prisma.$transaction(async (tx) => {
    await tx.grievance.update({
      where: { id: g.id },
      data: {
        status: input.status,
        response: input.response,
        handledById: me(req).sub,
        resolvedAt: input.status === 'RESOLVED' ? new Date() : null,
      },
    });
    await tx.notification.create({
      data: {
        farmerId: g.farmerId,
        templateCode: 'GRIEVANCE_UPDATE',
        channel: 'IN_APP',
        language: g.farmer.language,
        body: JSON.stringify({
          ticket: g.ticketNo,
          status: input.status,
          response: input.response,
        }),
      },
    });
    await audit(
      {
        actorType: 'STAFF',
        actorId: me(req).sub,
        action: 'GRIEVANCE_UPDATED',
        entityType: 'Grievance',
        entityId: g.id,
        diff: { status: input.status },
      },
      tx,
    );
  });
  res.json({ ok: true });
});

/** Land-check queue: fields flagged by the duplicate checks first, then unchecked ones. */
portalRouter.get('/fields', requireStaff(...READ_CASES), async (req, res) => {
  const status =
    typeof req.query.status === 'string' &&
    ['FLAGGED', 'UNVERIFIED', 'VERIFIED', 'REJECTED'].includes(req.query.status)
      ? req.query.status
      : undefined;
  const plots = await prisma.plot.findMany({
    where: status
      ? { verificationStatus: status }
      : { verificationStatus: { in: ['FLAGGED', 'UNVERIFIED'] } },
    orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: {
      farmer: {
        select: { id: true, farmerCode: true, nameEnc: true, districtCode: true, village: true },
      },
    },
  });
  res.json(
    plots.map((p) => ({
      id: p.id,
      status: p.verificationStatus,
      surveyNo: p.surveyNo,
      note: p.checkNote,
      acres: p.areaAcres,
      lat: Number(p.lat.toFixed(5)),
      lng: Number(p.lng.toFixed(5)),
      accuracyM: p.gpsAccuracyM,
      gridCellId: p.gridCellId,
      createdAt: p.createdAt,
      checkedAt: p.checkedAt,
      farmer: {
        id: p.farmer.id,
        code: p.farmer.farmerCode,
        name: safeName(p.farmer.nameEnc),
        district: p.farmer.districtCode,
        village: p.farmer.village,
      },
    })),
  );
});

/** Staff record the land-record check: the 7/12 name, survey number and area match (VERIFIED) or not (REJECTED). */
portalRouter.post('/fields/:id/check', requireStaff(...HANDLE_CASES), async (req, res) => {
  const input = body(
    req,
    z.object({
      decision: z.enum(['VERIFIED', 'REJECTED']),
      note: z.string().trim().min(3).max(300),
    }),
  );
  const plot = await prisma.plot.findUnique({ where: { id: String(req.params.id) } });
  if (!plot) throw new HttpError(404, 'not_found');
  await prisma.$transaction(async (tx) => {
    await tx.plot.update({
      where: { id: plot.id },
      data: {
        verificationStatus: input.decision,
        checkNote: input.note,
        checkedById: me(req).sub,
        checkedAt: new Date(),
      },
    });
    await audit(
      {
        actorType: 'STAFF',
        actorId: me(req).sub,
        action: 'FIELD_CHECKED',
        entityType: 'Plot',
        entityId: plot.id,
        diff: { decision: input.decision, from: plot.verificationStatus },
      },
      tx,
    );
  });
  res.json({ ok: true });
});
