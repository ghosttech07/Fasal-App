import { Router } from 'express';
import { z } from 'zod';
import { languageCodeSchema, phoneE164IndiaSchema, vpaSchema } from '@fasalshield/shared';
import { findDistrict } from '@fasalshield/shared/geo';
import { prisma } from '../db';
import { audit } from '../lib/audit';
import { requireRole } from '../lib/auth';
import { decrypt, encrypt } from '../lib/crypto';
import { body, HttpError } from '../lib/http';
import { createPlot, linkWallet, NOTICE_VERSION, plotInputSchema } from './farmer.routes';

/**
 * Field agents / FPO staff: assisted enrolment (FR-02 agent channel). An agent enrols a farmer, pins the field
 * standing in it and links the farmer's UPI. The farmer signs in on their own phone to buy and pay, so money
 * never passes through the agent. An agent sees and changes only farmers they enrolled; every action is audited.
 */
export const agentRouter = Router();
agentRouter.use(requireRole('AGENT'));

const maskPhone = (p: string) => `${p.slice(0, 3)} ••••• ${p.slice(-4)}`;
const safeName = (enc: string | null) => {
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
};

/** The agent's own farmer, or 404 (never reveals other agents' farmers). */
async function ownFarmer(agentId: string, farmerId: string) {
  const f = await prisma.farmer.findFirst({ where: { id: farmerId, onboardedByAgentId: agentId } });
  if (!f) throw new HttpError(404, 'not_found');
  return f;
}

agentRouter.get('/me', async (req, res) => {
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: req.principal!.sub }, include: { org: true } });
  const [farmers, withField, withUpi, covered] = await Promise.all([
    prisma.farmer.count({ where: { onboardedByAgentId: agent.id } }),
    prisma.farmer.count({ where: { onboardedByAgentId: agent.id, plots: { some: {} } } }),
    prisma.farmer.count({ where: { onboardedByAgentId: agent.id, wallets: { some: { status: 'VERIFIED' } } } }),
    prisma.farmer.count({
      where: { onboardedByAgentId: agent.id, policies: { some: { status: { in: ['ACTIVE', 'IN_WAITING'] } } } },
    }),
  ]);
  res.json({ id: agent.id, name: agent.name, code: agent.agentCode, org: agent.org.name, counts: { farmers, withField, withUpi, covered } });
});

agentRouter.get('/farmers', async (req, res) => {
  const farmers = await prisma.farmer.findMany({
    where: { onboardedByAgentId: req.principal!.sub },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      plots: { select: { id: true, areaAcres: true, verificationStatus: true } },
      wallets: { where: { isPrimary: true }, select: { handleMasked: true, status: true } },
      policies: { where: { status: { in: ['ACTIVE', 'IN_WAITING'] } }, select: { id: true } },
    },
  });
  res.json(
    farmers.map((f) => ({
      id: f.id,
      code: f.farmerCode,
      name: safeName(f.nameEnc),
      phone: maskPhone(f.phoneE164),
      village: f.village,
      districtCode: f.districtCode,
      fields: f.plots.length,
      acres: f.plots.reduce((s, p) => s + (p.areaAcres ?? 0), 0),
      upi: f.wallets[0]?.handleMasked ?? null,
      covers: f.policies.length,
      createdAt: f.createdAt,
    })),
  );
});

agentRouter.get('/farmers/:id', async (req, res) => {
  const f = await ownFarmer(req.principal!.sub, String(req.params.id));
  const [plots, wallet] = await Promise.all([
    prisma.plot.findMany({ where: { farmerId: f.id }, orderBy: { createdAt: 'desc' } }),
    prisma.wallet.findFirst({ where: { farmerId: f.id, isPrimary: true } }),
  ]);
  res.json({
    id: f.id,
    code: f.farmerCode,
    name: safeName(f.nameEnc),
    phone: maskPhone(f.phoneE164),
    village: f.village,
    districtCode: f.districtCode,
    language: f.language,
    plots: plots.map((p) => ({ id: p.id, areaAcres: p.areaAcres, gpsAccuracyM: p.gpsAccuracyM, surveyNo: p.surveyNo, status: p.verificationStatus, createdAt: p.createdAt })),
    wallet: wallet ? { handleMasked: wallet.handleMasked, verifiedName: wallet.verifiedName, status: wallet.status } : null,
  });
});

/**
 * Enrol a farmer. The agent confirms the farmer agreed to the data notice (read out in the farmer's language);
 * that consent is stored as agent-assisted with the agent's id. A number already registered is refused.
 */
agentRouter.post('/farmers', async (req, res) => {
  const input = body(
    req,
    z.object({
      phone: phoneE164IndiaSchema,
      name: z.string().trim().min(2).max(80),
      districtCode: z.string().refine((c) => findDistrict(c) !== null, 'Unknown district'),
      village: z.string().trim().min(2).max(80),
      language: languageCodeSchema,
      consentGiven: z.literal(true),
    }),
  );
  const agentId = req.principal!.sub;
  const taken = await prisma.farmer.findUnique({ where: { phoneE164: input.phone }, select: { id: true } });
  if (taken) throw new HttpError(409, 'farmer_exists');
  if (await prisma.agent.findUnique({ where: { phoneE164: input.phone }, select: { id: true } }))
    throw new HttpError(409, 'farmer_exists');

  const farmer = await prisma.$transaction(async (tx) => {
    const count = await tx.farmer.count();
    const created = await tx.farmer.create({
      data: {
        phoneE164: input.phone,
        farmerCode: `FS-F-${String(count + 1).padStart(6, '0')}`,
        nameEnc: encrypt(input.name),
        districtCode: input.districtCode,
        stateCode: findDistrict(input.districtCode)!.state.code,
        village: input.village,
        language: input.language,
        onboardedByAgentId: agentId,
      },
    });
    await tx.consent.create({
      data: { farmerId: created.id, purpose: 'INSURANCE_SERVICING', noticeVersion: NOTICE_VERSION, language: input.language, channel: 'AGENT' },
    });
    await audit(
      { actorType: 'AGENT', actorId: agentId, action: 'FARMER_ENROLLED', entityType: 'Farmer', entityId: created.id, diff: { districtCode: input.districtCode, consent: 'AGENT_ASSISTED' } },
      tx,
    );
    return created;
  });
  res.status(201).json({ id: farmer.id, code: farmer.farmerCode });
});

agentRouter.post('/farmers/:id/plots', async (req, res) => {
  const agentId = req.principal!.sub;
  const f = await ownFarmer(agentId, String(req.params.id));
  const input = body(req, plotInputSchema);
  const plot = await createPlot(f.id, input, { type: 'AGENT', id: agentId });
  res.status(201).json({ id: plot.id, status: plot.verificationStatus });
});

agentRouter.post('/farmers/:id/wallets', async (req, res) => {
  const agentId = req.principal!.sub;
  const f = await ownFarmer(agentId, String(req.params.id));
  const { vpa } = body(req, z.object({ vpa: vpaSchema }));
  await linkWallet(f.id, vpa, { type: 'AGENT', id: agentId });
  const wallet = await prisma.wallet.findFirst({ where: { farmerId: f.id, isPrimary: true } });
  res.status(201).json({ handleMasked: wallet?.handleMasked, verifiedName: wallet?.verifiedName });
});
