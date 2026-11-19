// Seed: insurer + FPO + demo agent, crops, current season and two published demo products.
// Idempotent (upserts) - safe to re-run.
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { canonical } from '../src/lib/audit';
import { sha256 } from '../src/lib/crypto';
import { rulesSchema } from '../src/rules/engine';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
const prisma = new PrismaClient();

const crops = [
  { code: 'SOYBEAN', icon: 'grass', namesI18n: { en: 'Soybean', hi: 'सोयाबीन', mr: 'सोयाबीन' } },
  { code: 'COTTON', icon: 'cloud', namesI18n: { en: 'Cotton', hi: 'कपास', mr: 'कापूस' } },
  { code: 'TUR', icon: 'spa', namesI18n: { en: 'Tur (Pigeon pea)', hi: 'अरहर', mr: 'तूर' } },
  { code: 'JOWAR', icon: 'agriculture', namesI18n: { en: 'Jowar', hi: 'ज्वार', mr: 'ज्वारी' } },
  { code: 'WHEAT', icon: 'eco', namesI18n: { en: 'Wheat', hi: 'गेहूं', mr: 'गहू' } },
  { code: 'GRAM', icon: 'local_florist', namesI18n: { en: 'Gram (Chana)', hi: 'चना', mr: 'हरभरा' } },
];

const DISTRICTS = ['LATUR', 'BEED', 'DHARASHIV', 'NANDED'];

async function main() {
  const insurer = await prisma.organisation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: { id: '00000000-0000-0000-0000-000000000001', type: 'INSURER', name: 'Demo General Insurance Ltd' },
    update: {},
  });
  const fpo = await prisma.organisation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    create: { id: '00000000-0000-0000-0000-000000000002', type: 'FPO', name: 'Latur Farmers Producer Co.' },
    update: {},
  });
  await prisma.agent.upsert({
    where: { phoneE164: '+919000000001' },
    create: { orgId: fpo.id, phoneE164: '+919000000001', name: 'Demo Agent', agentCode: 'AG-0001' },
    update: {},
  });

  for (const crop of crops) {
    await prisma.crop.upsert({ where: { code: crop.code }, create: crop, update: crop });
  }

  await prisma.season.upsert({
    where: { code: 'RABI_2026' },
    create: {
      code: 'RABI_2026',
      namesI18n: { en: 'Rabi 2026-27', hi: 'रबी 2026-27', mr: 'रब्बी 2026-27' },
      startDate: new Date('2026-11-01'),
      endDate: new Date('2027-03-31'),
    },
    update: {},
  });

  const products = [
    {
      code: 'FS-DRT-MH-RB',
      peril: 'DROUGHT',
      namesI18n: { en: 'Dry Spell Cover', hi: 'सूखा सुरक्षा', mr: 'कोरडा काळ संरक्षण' },
      sumInsuredPaise: 750_000, // ₹7,500 per acre
      premiumRateBp: 500,
      rules: {
        schema: 'fasalshield.rules/v1',
        index: { type: 'DROUGHT_RAIN_DEFICIT', metric: 'RAIN_MM' },
        phases: [
          { id: 'P1_SOWING', from: '2026-11-01', to: '2026-12-15', weightPct: 40 },
          { id: 'P2_GROWTH', from: '2026-12-16', to: '2027-01-31', weightPct: 30 },
          { id: 'P3_GRAIN', from: '2027-02-01', to: '2027-03-15', weightPct: 30 },
        ],
        slabs: [
          { level: 1, threshold: 40, payoutPctOfPhase: 25 },
          { level: 2, threshold: 60, payoutPctOfPhase: 60 },
          { level: 3, threshold: 80, payoutPctOfPhase: 100 },
        ],
      },
    },
    {
      code: 'FS-FLD-MH-RB',
      peril: 'FLOOD',
      namesI18n: { en: 'Heavy Rain Cover', hi: 'भारी बारिश सुरक्षा', mr: 'अतिवृष्टी संरक्षण' },
      sumInsuredPaise: 500_000, // ₹5,000 per acre
      premiumRateBp: 400,
      rules: {
        schema: 'fasalshield.rules/v1',
        index: { type: 'FLOOD_EXCESS_RAIN', metric: 'RAIN_MM', rollingDays: 3 },
        phases: [{ id: 'P1_SEASON', from: '2026-11-01', to: '2027-03-31', weightPct: 100 }],
        slabs: [
          { level: 1, threshold: 75, payoutPctOfPhase: 30 },
          { level: 2, threshold: 120, payoutPctOfPhase: 60 },
          { level: 3, threshold: 180, payoutPctOfPhase: 100 },
        ],
      },
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      create: { code: p.code, peril: p.peril, namesI18n: p.namesI18n, insurerOrgId: insurer.id },
      update: { namesI18n: p.namesI18n },
    });
    const rules = rulesSchema.parse(p.rules);
    await prisma.productVersion.upsert({
      where: { productId_version: { productId: product.id, version: 1 } },
      create: {
        productId: product.id,
        version: 1,
        status: 'PUBLISHED',
        rules,
        rulesSha256: sha256(canonical(rules)),
        premiumRateBp: p.premiumRateBp,
        subsidyBp: 4_000, // sponsor pays 40% of premium
        sumInsuredPaise: p.sumInsuredPaise,
        seasonCode: 'RABI_2026',
        eligibleDistricts: DISTRICTS,
        eligibleCrops: crops.map((c) => c.code),
        enrolmentCutoff: new Date('2027-01-31'),
        waitingPeriodDays: 0, // demo only: docs default is 7 days (FR-15)
        publishedAt: new Date(),
      },
      update: {},
    });
  }
  console.warn('Seed complete: 2 products, 6 crops, season RABI_2026, demo agent +919000000001');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
