import { randomInt } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { otpSchema, phoneE164IndiaSchema } from '@fasalshield/shared';
import type { Role } from '@prisma/client';
import { prisma } from '../db';
import { env } from '../env';
import { sms } from '../adapters';
import { audit } from '../lib/audit';
import { isStaffRole, signAccessToken } from '../lib/auth';
import { hmac, randomToken, sha256 } from '../lib/crypto';
import { body, HttpError } from '../lib/http';

export const authRouter = Router();

const otpLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

const MAX_OTPS_PER_HOUR = 5;
const MAX_ATTEMPTS = 3;

/** FR-01: request OTP. Mock SMS prints it to the API log; local env also returns it for the demo. */
authRouter.post('/otp/request', otpLimiter, async (req, res) => {
  const { phone } = body(req, z.object({ phone: phoneE164IndiaSchema }));
  const recent = await prisma.otpRequest.count({
    where: { phoneE164: phone, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (recent >= MAX_OTPS_PER_HOUR) throw new HttpError(429, 'otp_rate_limited');

  const otp = String(randomInt(100_000, 1_000_000));
  const request = await prisma.otpRequest.create({
    data: { phoneE164: phone, otpHash: hmac(otp, env.OTP_HMAC_SECRET), expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000) },
  });
  await sms.send(phone, `FasalShield OTP: ${otp}. Valid ${Math.round(env.OTP_TTL_SECONDS / 60)} min. Do not share.`);
  res.status(201).json({
    requestId: request.id,
    expiresIn: env.OTP_TTL_SECONDS,
    ...(env.APP_ENV === 'local' || env.DEMO_SHOW_OTP ? { devOtp: otp } : {}),
  });
});

async function issueTokens(subjectId: string, role: Role, deviceId?: string, familyId = randomToken()) {
  const refreshToken = randomToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(refreshToken),
      familyId,
      subjectId,
      role,
      deviceId: deviceId ?? null,
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000),
    },
  });
  return { accessToken: signAccessToken({ sub: subjectId, role }), refreshToken, expiresIn: env.JWT_ACCESS_TTL_SECONDS };
}

/** FR-01: verify OTP → tokens. Agents are recognised by phone; everyone else becomes a Farmer. */
authRouter.post('/otp/verify', otpLimiter, async (req, res) => {
  const input = body(req, z.object({ requestId: z.string().uuid(), otp: otpSchema, deviceId: z.string().max(100).optional() }));
  const request = await prisma.otpRequest.findUnique({ where: { id: input.requestId } });
  if (!request || request.usedAt || request.expiresAt < new Date()) throw new HttpError(400, 'otp_expired');
  if (request.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'otp_attempts_exceeded');

  const ok = request.otpHash === hmac(input.otp, env.OTP_HMAC_SECRET);
  await prisma.otpRequest.update({
    where: { id: request.id },
    data: ok ? { usedAt: new Date() } : { attempts: { increment: 1 } },
  });
  if (!ok) throw new HttpError(400, 'otp_invalid');

  const agent = await prisma.agent.findUnique({ where: { phoneE164: request.phoneE164 } });
  if (agent) {
    await audit({ actorType: 'AGENT', actorId: agent.id, action: 'LOGIN', entityType: 'Agent', entityId: agent.id });
    res.json({ ...(await issueTokens(agent.id, 'AGENT', input.deviceId)), user: { id: agent.id, role: 'AGENT', isNew: false } });
    return;
  }

  let farmer = await prisma.farmer.findUnique({ where: { phoneE164: request.phoneE164 } });
  const isNew = !farmer;
  if (!farmer) {
    const count = await prisma.farmer.count();
    farmer = await prisma.farmer.create({
      data: { phoneE164: request.phoneE164, farmerCode: `FS-F-${String(count + 1).padStart(6, '0')}` },
    });
  }
  await audit({ actorType: 'FARMER', actorId: farmer.id, action: isNew ? 'SIGNUP' : 'LOGIN', entityType: 'Farmer', entityId: farmer.id });
  res.json({ ...(await issueTokens(farmer.id, 'FARMER', input.deviceId)), user: { id: farmer.id, role: 'FARMER', isNew } });
});

/** Rotating refresh tokens with reuse detection: replaying an old token revokes the whole family. */
authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = body(req, z.object({ refreshToken: z.string().min(20) }));
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
  if (!stored || stored.expiresAt < new Date()) throw new HttpError(401, 'refresh_invalid');
  if (isStaffRole(stored.role)) throw new HttpError(401, 'refresh_invalid'); // staff renew via /staff/refresh (hard session cap)
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { familyId: stored.familyId }, data: { revokedAt: new Date() } });
    throw new HttpError(401, 'refresh_reused');
  }
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  res.json(await issueTokens(stored.subjectId, stored.role, stored.deviceId ?? undefined, stored.familyId));
});

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = body(req, z.object({ refreshToken: z.string().min(20) }));
  await prisma.refreshToken.updateMany({ where: { tokenHash: sha256(refreshToken) }, data: { revokedAt: new Date() } });
  res.status(204).end();
});
