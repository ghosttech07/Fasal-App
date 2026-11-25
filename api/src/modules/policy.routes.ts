import { placeKeys } from '@fasalshield/shared/geo';
import { Router } from 'express';
import { z } from 'zod';
import { applyBasisPoints, formatPaise } from '@fasalshield/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { payments, sms } from '../adapters';
import { audit } from '../lib/audit';
import { requireRole } from '../lib/auth';
import { body, HttpError } from '../lib/http';
import { rulesSchema } from '../rules/engine';
import { priceOf } from '../rules/pricing';
import { phaseStatus } from './triggers/service';

/** Catalogue, quotes and policies for the farmer app (FR-07, FR-13…FR-15, FR-43). */
export const policyRouter = Router();
policyRouter.use(requireRole('FARMER'));

const todayDate = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');

policyRouter.get('/catalog/crops', async (_req, res) => {
  res.json(await prisma.crop.findMany({ orderBy: { code: 'asc' } }));
});

/** Open seasons, each with the crops that have a cover open for enrolment now. */
policyRouter.get('/catalog/seasons', async (_req, res) => {
  const [seasons, versions] = await Promise.all([
    prisma.season.findMany({ where: { endDate: { gte: todayDate() } }, orderBy: { startDate: 'asc' } }),
    prisma.productVersion.findMany({
      where: { status: 'PUBLISHED', enrolmentCutoff: { gte: todayDate() } },
      select: { seasonCode: true, eligibleCrops: true },
    }),
  ]);
  res.json(
    seasons.map((s) => ({
      ...s,
      crops: [...new Set(versions.filter((v) => v.seasonCode === s.code).flatMap((v) => v.eligibleCrops))],
    })),
  );
});

// shortcut: plots saved before acreage was required count as 1 acre; drop once every plot has areaAcres.
const acresOf = (plot: { areaAcres: number | null }) => plot.areaAcres ?? 1;

/** FR-13 quote: eligible published versions for this plot, crop and season, with example payouts. */
policyRouter.post('/quotes', async (req, res) => {
  const input = body(req, z.object({ plotId: z.string().uuid(), cropCode: z.string().min(2), seasonCode: z.string().min(2) }));
  const farmerId = req.principal!.sub;
  const plot = await prisma.plot.findFirst({ where: { id: input.plotId, farmerId }, include: { farmer: true } });
  if (!plot) throw new HttpError(404, 'plot_not_found');

  const versions = await prisma.productVersion.findMany({
    where: {
      status: 'PUBLISHED',
      seasonCode: input.seasonCode,
      eligibleCrops: { has: input.cropCode },
      eligibleDistricts: { hasSome: placeKeys(plot.farmer.districtCode) }, // district, its state ('MH-*') or all India ('*')
      enrolmentCutoff: { gte: todayDate() },
    },
    include: { product: true },
  });
  // shortcut: adverse-selection block for cells already in deficit (FRD-05) is not applied yet; add with FS-0601 hardening.
  res.json(
    versions.map((v) => {
      const rules = rulesSchema.parse(v.rules);
      const firstPhase = rules.phases[0]!;
      const price = priceOf(v, acresOf(plot));
      const phaseAmount = applyBasisPoints(price.sumInsuredPaise, Math.round(firstPhase.weightPct * 100));
      return {
        productVersionId: v.id,
        productCode: v.product.code,
        names: v.product.namesI18n,
        peril: v.product.peril,
        indexType: rules.index.type,
        ...price,
        areaAcres: acresOf(plot),
        waitingPeriodDays: v.waitingPeriodDays,
        phases: rules.phases,
        examplePayouts: rules.slabs.map((s) => ({
          threshold: s.threshold,
          unit: rules.index.type === 'DROUGHT_RAIN_DEFICIT' ? 'PCT_BELOW_NORMAL' : `MM_IN_${rules.index.rollingDays}_DAYS`,
          amountPaise: applyBasisPoints(phaseAmount, Math.round(s.payoutPctOfPhase * 100)),
          phaseId: firstPhase.id,
        })),
      };
    }),
  );
});

/** Create a policy awaiting premium. One live policy per plot per product version. */
policyRouter.post('/policies', async (req, res) => {
  const input = body(req, z.object({ productVersionId: z.string().uuid(), plotId: z.string().uuid(), cropCode: z.string().min(2) }));
  const farmerId = req.principal!.sub;
  const [plot, version] = await Promise.all([
    prisma.plot.findFirst({ where: { id: input.plotId, farmerId }, include: { farmer: { select: { districtCode: true } } } }),
    prisma.productVersion.findFirst({ where: { id: input.productVersionId, status: 'PUBLISHED', enrolmentCutoff: { gte: todayDate() } } }),
  ]);
  if (!plot) throw new HttpError(404, 'plot_not_found');
  // Same rule as the quote: the crop and the farmer's place must be covered by this version.
  const placeOk = placeKeys(plot.farmer.districtCode).some((k) => version?.eligibleDistricts.includes(k));
  if (!version || !version.eligibleCrops.includes(input.cropCode) || !placeOk)
    throw new HttpError(422, 'product_not_eligible');

  const existing = await prisma.policy.findFirst({
    where: { plotId: plot.id, productVersionId: version.id, status: { notIn: ['CANCELLED', 'EXPIRED'] } },
  });
  if (existing?.status === 'PENDING_PAYMENT') {
    res.json(existing);
    return;
  }
  if (existing) throw new HttpError(409, 'already_insured');

  const price = priceOf(version, acresOf(plot));
  const policy = await prisma.policy.create({
    data: {
      farmerId,
      plotId: plot.id,
      productVersionId: version.id,
      cropCode: input.cropCode,
      sumInsuredPaise: price.sumInsuredPaise,
      premiumPaise: price.premiumPaise,
      subsidyPaise: price.subsidyPaise,
    },
  });
  res.status(201).json(policy);
});

/** FR-14/FR-15: pay premium via the (mock) gateway, then issue the policy. */
policyRouter.post('/policies/:id/pay', async (req, res) => {
  const farmerId = req.principal!.sub;
  const policy = await prisma.policy.findFirst({
    where: { id: String(req.params.id), farmerId },
    include: { productVersion: true, farmer: true },
  });
  if (!policy) throw new HttpError(404, 'policy_not_found');
  if (policy.status !== 'PENDING_PAYMENT') throw new HttpError(409, 'already_paid');

  const netPaise = policy.premiumPaise - policy.subsidyPaise;
  const payment = await payments.collectPremium({ amountPaise: netPaise, reference: policy.id });
  if (payment.status !== 'SUCCESS') throw new HttpError(402, 'payment_failed');

  const season = policy.productVersion.seasonCode; // e.g. RABI_2026 → "26R"
  const prefix = `FS-P-${season.slice(-2)}${season[0]}`;
  const rules = rulesSchema.parse(policy.productVersion.rules);
  const coverStart = new Date(todayDate().getTime() + policy.productVersion.waitingPeriodDays * 86_400_000);

  const issued = await prisma.$transaction(async (tx) => {
    await tx.premiumPayment.create({
      data: { policyId: policy.id, amountPaise: netPaise, gatewayRef: payment.gatewayRef, status: 'SUCCESS' },
    });
    if (policy.subsidyPaise > 0) {
      await tx.premiumPayment.create({
        data: { policyId: policy.id, payerType: 'SPONSOR', amountPaise: policy.subsidyPaise, gatewayRef: `${payment.gatewayRef}-SUB`, status: 'SUCCESS' },
      });
    }
    const seq = (await tx.policy.count({ where: { policyNumber: { startsWith: prefix } } })) + 1;
    const updated = await tx.policy.update({
      where: { id: policy.id },
      data: {
        policyNumber: `${prefix}-${String(seq).padStart(6, '0')}`,
        status: policy.productVersion.waitingPeriodDays > 0 ? 'IN_WAITING' : 'ACTIVE',
        coverStart,
        coverEnd: new Date(`${rules.phases[rules.phases.length - 1]!.to}T00:00:00Z`),
      },
    });
    await tx.notification.create({
      data: {
        farmerId,
        templateCode: 'POLICY_ISSUED',
        channel: 'IN_APP',
        language: policy.farmer.language,
        body: JSON.stringify({ policy: updated.policyNumber, amount: formatPaise(policy.sumInsuredPaise) }),
      },
    });
    await audit({ actorType: 'FARMER', actorId: farmerId, action: 'POLICY_ISSUED', entityType: 'Policy', entityId: policy.id, diff: { policyNumber: updated.policyNumber, netPaise } }, tx);
    return updated;
  });
  await sms.send(policy.farmer.phoneE164, `FasalShield: policy ${issued.policyNumber} is issued. Cover up to ${formatPaise(policy.sumInsuredPaise)}.`);
  res.json(issued);
});

const detailInclude = {
  productVersion: { include: { product: true } },
  plot: true,
  farmer: true,
  triggerEvents: { include: { payout: true }, orderBy: { detectedAt: 'desc' } },
} satisfies Prisma.PolicyInclude;

async function present(policy: Prisma.PolicyGetPayload<{ include: typeof detailInclude }>) {
  const live = policy.status === 'ACTIVE' || policy.status === 'IN_WAITING';
  const status = live ? await phaseStatus(policy) : null;
  const rules = rulesSchema.parse(policy.productVersion.rules);
  return {
    id: policy.id,
    policyNumber: policy.policyNumber,
    status: policy.status,
    cropCode: policy.cropCode,
    productCode: policy.productVersion.product.code,
    names: policy.productVersion.product.namesI18n,
    peril: policy.productVersion.product.peril,
    indexType: rules.index.type,
    rollingDays: rules.index.type === 'FLOOD_EXCESS_RAIN' ? rules.index.rollingDays : null,
    // Season plan with each phase's rupee share, available before payment too (pay and detail screens).
    phasePlan: rules.phases.map((p) => ({ id: p.id, from: p.from, to: p.to, weightPct: p.weightPct, amountPaise: applyBasisPoints(policy.sumInsuredPaise, Math.round(p.weightPct * 100)) })),
    sumInsuredPaise: policy.sumInsuredPaise,
    premiumPaise: policy.premiumPaise,
    subsidyPaise: policy.subsidyPaise,
    // Only money actually credited counts as "paid"; approved-but-unsent shows as "on the way".
    paidOutPaise: policy.triggerEvents.reduce((s, e) => s + (e.payout?.status === 'SUCCESS' ? e.payoutAmountPaise : 0), 0),
    coverStart: policy.coverStart,
    coverEnd: policy.coverEnd,
    plot: { lat: policy.plot.lat, lng: policy.plot.lng, areaAcres: policy.plot.areaAcres, gridCellId: policy.plot.gridCellId },
    phases: status?.phases ?? [],
    slabs: rules.slabs,
    triggerEvents: policy.triggerEvents.map((e) => ({
      id: e.id,
      phaseId: e.phaseId,
      slabLevel: e.slabLevel,
      indexValue: e.indexValue,
      threshold: e.threshold,
      payoutAmountPaise: e.payoutAmountPaise,
      status: e.status,
      payoutStatus: e.payout?.status ?? null,
      detectedAt: e.detectedAt,
      slaDueAt: e.payout?.slaDueAt ?? null,
      evidenceSha256: e.evidenceSha256,
    })),
  };
}

policyRouter.get('/policies', async (req, res) => {
  const policies = await prisma.policy.findMany({
    where: { farmerId: req.principal!.sub, status: { not: 'PENDING_PAYMENT' } },
    include: detailInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(await Promise.all(policies.map(present)));
});

policyRouter.get('/policies/:id', async (req, res) => {
  const policy = await prisma.policy.findFirst({ where: { id: String(req.params.id), farmerId: req.principal!.sub }, include: detailInclude });
  if (!policy) throw new HttpError(404, 'policy_not_found');
  res.json(await present(policy));
});
