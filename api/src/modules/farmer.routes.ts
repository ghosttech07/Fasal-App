import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { indiaLatLngSchema, languageCodeSchema, maskVpa, vpaSchema } from '@fasalshield/shared';
import { prisma } from '../db';
import { payments } from '../adapters';
import { audit } from '../lib/audit';
import { requireRole } from '../lib/auth';
import { decrypt, encrypt, hmac } from '../lib/crypto';
import { cellFor } from '../lib/grid';
import { body, HttpError } from '../lib/http';
import { findDistrict } from '@fasalshield/shared/geo';

/** Farmer self-service (FR-02…FR-07). Every route is scoped to the caller's own records (TH-09). */
export const farmerRouter = Router();
farmerRouter.use(requireRole('FARMER'));

export const NOTICE_VERSION = 'consent-v1';
const WALLET_COOLING_OFF_MS = 72 * 3_600_000;

export async function me(farmerId: string) {
  const farmer = await prisma.farmer.findUniqueOrThrow({
    where: { id: farmerId },
    include: {
      wallets: { where: { isPrimary: true } },
      consents: { where: { withdrawnAt: null } },
      plots: true,
    },
  });
  const wallet = farmer.wallets[0];
  return {
    id: farmer.id,
    farmerCode: farmer.farmerCode,
    phone: farmer.phoneE164,
    name: farmer.nameEnc ? decrypt(farmer.nameEnc) : null,
    language: farmer.language,
    stateCode: farmer.stateCode,
    districtCode: farmer.districtCode,
    village: farmer.village,
    yearOfBirth: farmer.yearOfBirth,
    kycStatus: farmer.kycStatus,
    consents: farmer.consents.map((c) => c.purpose),
    wallet: wallet
      ? {
          id: wallet.id,
          handleMasked: wallet.handleMasked,
          verifiedName: wallet.verifiedName,
          status: wallet.status,
        }
      : null,
    plotCount: farmer.plots.length,
    // Drives the app's onboarding router: first missing step wins.
    onboarding: {
      consent: farmer.consents.some((c) => c.purpose === 'INSURANCE_SERVICING'),
      profile: !!farmer.nameEnc && !!farmer.districtCode,
      plot: farmer.plots.length > 0,
      wallet: wallet?.status === 'VERIFIED',
    },
  };
}

farmerRouter.get('/', async (req, res) => {
  res.json(await me(req.principal!.sub));
});

/** FR-03 consent (DPDP): purpose, notice version, language and channel are recorded. */
farmerRouter.post('/consents', async (req, res) => {
  const input = body(
    req,
    z.object({
      purposes: z
        .array(z.enum(['INSURANCE_SERVICING', 'DATA_SHARING_REINSURER', 'MARKETING']))
        .min(1),
      language: languageCodeSchema,
    }),
  );
  const farmerId = req.principal!.sub;
  await prisma.$transaction(async (tx) => {
    for (const purpose of input.purposes) {
      await tx.consent.create({
        data: {
          farmerId,
          purpose,
          noticeVersion: NOTICE_VERSION,
          language: input.language,
          channel: 'APP',
        },
      });
    }
    await audit(
      {
        actorType: 'FARMER',
        actorId: farmerId,
        action: 'CONSENT_GRANTED',
        entityType: 'Farmer',
        entityId: farmerId,
        diff: { purposes: input.purposes, noticeVersion: NOTICE_VERSION },
      },
      tx,
    );
  });
  res.status(201).json(await me(farmerId));
});

/** FR-04 basic profile + KYC. Only last 4 digits + keyed hash of the ID number are stored. */
farmerRouter.patch('/', async (req, res) => {
  const input = body(
    req,
    z.object({
      name: z.string().trim().min(2).max(80).optional(),
      language: languageCodeSchema.optional(),
      // Any district of India, as a state-qualified code from @fasalshield/shared/geo (e.g. "MH-LATUR").
      districtCode: z
        .string()
        .refine((c) => findDistrict(c) !== null, 'Unknown district')
        .optional(),
      village: z.string().trim().min(2).max(80).optional(),
      yearOfBirth: z
        .number()
        .int()
        .min(1930)
        .max(new Date().getFullYear() - 18)
        .optional(),
      idDoc: z
        .object({
          type: z.enum(['VOTER_ID', 'RATION_CARD', 'PAN', 'AADHAAR']),
          number: z
            .string()
            .trim()
            .regex(/^[A-Za-z0-9]{6,20}$/),
        })
        .optional(),
    }),
  );
  const farmerId = req.principal!.sub;
  const idDocHash = input.idDoc
    ? hmac(`${input.idDoc.type}:${input.idDoc.number.toUpperCase()}`)
    : undefined;
  if (idDocHash) {
    const other = await prisma.farmer.findFirst({
      where: { idDocHash, NOT: { id: farmerId } },
      select: { id: true },
    });
    if (other) throw new HttpError(409, 'id_already_registered'); // FRD-02 duplicate farmer
  }
  await prisma.$transaction(async (tx) => {
    await tx.farmer.update({
      where: { id: farmerId },
      data: {
        nameEnc: input.name ? encrypt(input.name) : undefined,
        language: input.language,
        districtCode: input.districtCode,
        stateCode: input.districtCode ? findDistrict(input.districtCode)!.state.code : undefined,
        village: input.village,
        yearOfBirth: input.yearOfBirth,
        ...(input.idDoc
          ? {
              idDocType: input.idDoc.type,
              idDocLast4: input.idDoc.number.slice(-4),
              idDocHash,
              kycStatus: 'BASIC' as const,
            }
          : {}),
      },
    });
    await audit(
      {
        actorType: 'FARMER',
        actorId: farmerId,
        action: 'PROFILE_UPDATED',
        entityType: 'Farmer',
        entityId: farmerId,
        diff: { fields: Object.keys(input) },
      },
      tx,
    );
  });
  res.json(await me(farmerId));
});

/** A field pin (FR-06); shared by the farmer's own app and agent-assisted enrolment. */
export const plotInputSchema = indiaLatLngSchema.extend({
  accuracyM: z.number().nonnegative().max(500),
  areaAcres: z.number().positive().max(50),
  captureMethod: z.enum(['GPS_PIN', 'WALK', 'DRAW']).default('GPS_PIN'),
  boundary: z.array(indiaLatLngSchema).min(4).max(200).optional(),
  surveyNo: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z/ -]{1,20}$/, 'Survey number: digits, letters, / or -')
    .optional(),
});

export type Actor = { type: 'FARMER' | 'AGENT'; id: string };

/** Saves a field pin → 0.05° grid cell (FR-19), with the duplicate-field checks; audited with who did it. */
export async function createPlot(farmerId: string, input: z.infer<typeof plotInputSchema>, actor: Actor) {
  if (input.accuracyM >= 50) throw new HttpError(422, 'gps_accuracy_too_low');
  const farmer = await prisma.farmer.findUniqueOrThrow({ where: { id: farmerId } });
  const cell = cellFor(input.lat, input.lng);
  const flag = await duplicateCheck(farmerId, cell.id, input.lat, input.lng, input.surveyNo);
  return prisma.$transaction(async (tx) => {
    await tx.gridCell.upsert({
      where: { id: cell.id },
      create: {
        id: cell.id,
        minLat: cell.minLat,
        minLng: cell.minLng,
        districtCode: farmer.districtCode,
      },
      update: {},
    });
    const created = await tx.plot.create({
      data: {
        farmerId,
        lat: input.lat,
        lng: input.lng,
        gpsAccuracyM: input.accuracyM,
        areaAcres: input.areaAcres,
        captureMethod: input.captureMethod,
        boundary: input.boundary
          ? {
              type: 'Polygon',
              coordinates: [[...input.boundary, input.boundary[0]!].map((p) => [p.lng, p.lat])],
            }
          : undefined,
        gridCellId: cell.id,
        surveyNo: input.surveyNo?.toUpperCase(),
        verificationStatus: flag ? 'FLAGGED' : 'UNVERIFIED',
        checkNote: flag,
      },
    });
    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'PLOT_CREATED',
        entityType: 'Plot',
        entityId: created.id,
        diff: { farmerId, gridCellId: cell.id, flagged: !!flag },
      },
      tx,
    );
    return created;
  });
}

farmerRouter.post('/plots', async (req, res) => {
  const input = body(req, plotInputSchema);
  const farmerId = req.principal!.sub;
  res.status(201).json(await createPlot(farmerId, input, { type: 'FARMER', id: farmerId }));
});

/** Fraud checks on a new field: the same survey number, or a pin within 30 m, already used by another farmer. */
async function duplicateCheck(
  farmerId: string,
  gridCellId: number,
  lat: number,
  lng: number,
  surveyNo?: string,
) {
  const others = await prisma.plot.findMany({
    where: { gridCellId, NOT: { farmerId } },
    select: { lat: true, lng: true, surveyNo: true },
  });
  if (surveyNo && others.some((o) => o.surveyNo === surveyNo.toUpperCase()))
    return 'Same survey number as another farmer’s field';
  const metres = (a: number, b: number) =>
    Math.hypot((a - lat) * 111_320, (b - lng) * 111_320 * Math.cos((lat * Math.PI) / 180));
  if (others.some((o) => metres(o.lat, o.lng) < 30))
    return 'Pin within 30 m of another farmer’s field';
  return null;
}

farmerRouter.get('/plots', async (req, res) => {
  res.json(
    await prisma.plot.findMany({
      where: { farmerId: req.principal!.sub },
      orderBy: { createdAt: 'desc' },
    }),
  );
});

/** FR-05 UPI link with mock name verification; a changed wallet gets a 72h cooling-off (FRD-07). */
export async function linkWallet(farmerId: string, vpa: string, actor: Actor) {
  const result = await payments.verifyVpa(vpa);
  if (!result.valid) throw new HttpError(422, 'vpa_invalid');

  const handleHash = hmac(vpa);
  const sharedWith = await prisma.wallet.count({ where: { handleHash, NOT: { farmerId } } });
  const hadWallet = (await prisma.wallet.count({ where: { farmerId } })) > 0;
  await prisma.$transaction(async (tx) => {
    await tx.wallet.updateMany({ where: { farmerId }, data: { isPrimary: false } });
    const wallet = await tx.wallet.create({
      data: {
        farmerId,
        handleEnc: encrypt(vpa),
        handleMasked: maskVpa(vpa),
        handleHash,
        verifiedName: result.registeredName ?? null,
        status: 'VERIFIED',
        coolingOffUntil: hadWallet ? new Date(Date.now() + WALLET_COOLING_OFF_MS) : null,
      },
    });
    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'WALLET_LINKED',
        entityType: 'Wallet',
        entityId: wallet.id,
        diff: { farmerId, sharedWithOtherFarmers: sharedWith },
      },
      tx,
    );
  });
}

farmerRouter.post('/wallets', async (req, res) => {
  const { vpa } = body(req, z.object({ vpa: vpaSchema }));
  const farmerId = req.principal!.sub;
  await linkWallet(farmerId, vpa, { type: 'FARMER', id: farmerId });
  res.status(201).json(await me(farmerId));
});

farmerRouter.get('/notifications', async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { farmerId: req.principal!.sub },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(items.map((n) => ({ ...n, body: JSON.parse(n.body) })));
});

/** Marks the farmer's notifications as read (opening the inbox). */
farmerRouter.post('/notifications/read', async (req, res) => {
  await prisma.notification.updateMany({
    where: { farmerId: req.principal!.sub, readAt: null },
    data: { readAt: new Date() },
  });
  res.status(204).end();
});

const GRIEVANCE_DAYS = 14;
const grievanceView = (g: {
  id: string;
  ticketNo: string;
  category: string;
  messageEnc: string;
  status: string;
  response: string | null;
  dueAt: Date;
  createdAt: Date;
  resolvedAt: Date | null;
  policyId: string | null;
}) => ({
  id: g.id,
  ticketNo: g.ticketNo,
  category: g.category,
  message: decrypt(g.messageEnc),
  status: g.status,
  response: g.response,
  policyId: g.policyId,
  dueAt: g.dueAt,
  createdAt: g.createdAt,
  resolvedAt: g.resolvedAt,
});

/** Grievance redressal: the farmer tells us what went wrong; staff answer within 14 days. */
farmerRouter.post('/grievances', async (req, res) => {
  const input = body(
    req,
    z.object({
      category: z.enum(['NO_PAYOUT', 'LATE_PAYOUT', 'WRONG_DETAILS', 'PRIVACY', 'OTHER']),
      message: z.string().trim().min(10, 'Tell us a little more').max(1000),
      policyId: z.string().uuid().optional(),
    }),
  );
  const farmerId = req.principal!.sub;
  if (input.policyId) {
    const owns = await prisma.policy.count({ where: { id: input.policyId, farmerId } });
    if (!owns) throw new HttpError(404, 'policy_not_found');
  }
  const open = await prisma.grievance.count({ where: { farmerId, status: { not: 'RESOLVED' } } });
  if (open >= 5) throw new HttpError(429, 'too_many_open_grievances');
  const g = await prisma.$transaction(async (tx) => {
    const created = await tx.grievance.create({
      data: {
        ticketNo: `FS-G-${randomBytes(4).toString('hex').toUpperCase()}`,
        farmerId,
        policyId: input.policyId,
        category: input.category,
        messageEnc: encrypt(input.message),
        dueAt: new Date(Date.now() + GRIEVANCE_DAYS * 86_400_000),
      },
    });
    await audit(
      {
        actorType: 'FARMER',
        actorId: farmerId,
        action: 'GRIEVANCE_RAISED',
        entityType: 'Grievance',
        entityId: created.id,
        diff: { category: input.category },
      },
      tx,
    );
    return created;
  });
  res.status(201).json(grievanceView(g));
});

farmerRouter.get('/grievances', async (req, res) => {
  const items = await prisma.grievance.findMany({
    where: { farmerId: req.principal!.sub },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(items.map(grievanceView));
});
