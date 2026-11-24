import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db';
import { env } from '../env';
import { audit } from '../lib/audit';
import { isStaffRole, requireStaff, signAccessToken, type StaffRole } from '../lib/auth';
import { decrypt, encrypt, randomToken, sha256 } from '../lib/crypto';
import { body, HttpError } from '../lib/http';
import { hashPassword, MIN_PASSWORD_LENGTH, newTotpSecret, otpauthUrl, verifyPassword, verifyTotp } from '../lib/staff-auth';

/**
 * Staff portal sign-in (admin portal A1): email + password, then a 6-digit authenticator code.
 * The first sign-in enrols the authenticator. Sessions are short and end at a hard cap.
 */
export const staffRouter = Router();

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const CHALLENGE_SECONDS = 300;
const CHALLENGE_AUDIENCE = 'staff-mfa';

const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

type Staff = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
const summary = (u: Staff) => ({ id: u.id, email: u.email, name: u.name, role: u.role, mustChangePassword: u.mustChangePassword, passwordOnly: u.passwordOnly });

/** Counts a failure; locks the account for LOCK_MINUTES after MAX_FAILURES in a row. */
async function recordFailure(user: Staff, stage: 'password' | 'code') {
  const failures = user.failedLogins + 1;
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: failures, lockedUntil: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil },
  });
  await audit({ actorType: 'STAFF', actorId: user.id, action: 'STAFF_LOGIN_FAILED', entityType: 'User', entityId: user.id, diff: { stage, failures } });
}

const isLocked = (u: Staff) => !!u.lockedUntil && u.lockedUntil > new Date();

/** Step 1: email + password → a 5-minute challenge for the code step (plus the enrolment secret on first sign-in). */
staffRouter.post('/login', limiter, async (req, res) => {
  const input = body(req, z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) }));
  const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  const passwordOk = verifyPassword(input.password, user?.passwordHash); // runs even for unknown emails (timing)
  if (!user || !isStaffRole(user.role) || user.status !== 'ACTIVE') throw new HttpError(401, 'invalid_credentials');
  if (isLocked(user)) throw new HttpError(423, 'account_locked');
  if (!passwordOk) {
    await recordFailure(user, 'password');
    throw new HttpError(401, 'invalid_credentials');
  }

  let enroll: { secret: string; otpauthUrl: string } | undefined;
  if (!user.mfaEnrolledAt) {
    // A fresh secret each time until the first code is confirmed, so a leaked unconfirmed secret is useless.
    const secret = newTotpSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecretEnc: encrypt(secret), totpLastStep: null } });
    enroll = { secret, otpauthUrl: otpauthUrl(secret, user.email, env.MFA_ISSUER) };
  }
  const challenge = jwt.sign({ sub: user.id }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    audience: CHALLENGE_AUDIENCE,
    issuer: 'fasalshield',
    expiresIn: CHALLENGE_SECONDS,
  });
  res.json({ challenge, expiresIn: CHALLENGE_SECONDS, ...(enroll ? { enroll } : {}) });
});

async function issueStaffTokens(user: Staff, familyId = randomToken(), expiresAt = new Date(Date.now() + env.STAFF_SESSION_MAX_SECONDS * 1000)) {
  const refreshToken = randomToken();
  await prisma.refreshToken.create({
    data: { tokenHash: sha256(refreshToken), familyId, subjectId: user.id, role: user.role, expiresAt },
  });
  const ttl = Math.min(env.STAFF_ACCESS_TTL_SECONDS, Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role, mfa: true }, ttl),
    refreshToken,
    expiresIn: ttl,
    sessionEndsAt: expiresAt.toISOString(),
  };
}

/** Step 2: the 6-digit code. Each code works once; five wrong codes lock the account like wrong passwords do. */
staffRouter.post('/mfa', limiter, async (req, res) => {
  const input = body(req, z.object({ challenge: z.string().min(20).max(2000), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }));
  let sub: string;
  try {
    sub = (jwt.verify(input.challenge, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'], audience: CHALLENGE_AUDIENCE, issuer: 'fasalshield' }) as { sub: string }).sub;
  } catch {
    throw new HttpError(401, 'challenge_expired');
  }
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user || !isStaffRole(user.role) || user.status !== 'ACTIVE' || !user.totpSecretEnc) throw new HttpError(401, 'challenge_expired');
  if (isLocked(user)) throw new HttpError(423, 'account_locked');

  const step = verifyTotp(decrypt(user.totpSecretEnc), input.code);
  if (step === null || (user.totpLastStep !== null && step <= user.totpLastStep)) {
    await recordFailure(user, 'code');
    throw new HttpError(401, step === null ? 'code_invalid' : 'code_used');
  }

  const firstTime = !user.mfaEnrolledAt;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { totpLastStep: step, mfaEnrolledAt: user.mfaEnrolledAt ?? new Date(), failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  if (firstTime) await audit({ actorType: 'STAFF', actorId: user.id, action: 'STAFF_MFA_ENROLLED', entityType: 'User', entityId: user.id });
  await audit({ actorType: 'STAFF', actorId: user.id, action: 'STAFF_LOGIN', entityType: 'User', entityId: user.id });
  res.json({ ...(await issueStaffTokens(updated)), user: summary(updated) });
});

/** Rotation with reuse detection. The session never outlives its original hard cap (STAFF_SESSION_MAX_SECONDS). */
staffRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = body(req, z.object({ refreshToken: z.string().min(20) }));
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
  if (!stored || !isStaffRole(stored.role) || stored.expiresAt < new Date()) throw new HttpError(401, 'refresh_invalid');
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { familyId: stored.familyId }, data: { revokedAt: new Date() } });
    throw new HttpError(401, 'refresh_reused');
  }
  const user = await prisma.user.findUnique({ where: { id: stored.subjectId } });
  if (!user || user.status !== 'ACTIVE' || user.role !== stored.role) {
    await prisma.refreshToken.updateMany({ where: { familyId: stored.familyId }, data: { revokedAt: new Date() } });
    throw new HttpError(401, 'refresh_invalid');
  }
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  res.json(await issueStaffTokens(user, stored.familyId, stored.expiresAt));
});

staffRouter.post('/logout', async (req, res) => {
  const { refreshToken } = body(req, z.object({ refreshToken: z.string().min(20) }));
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
  if (stored && isStaffRole(stored.role)) {
    await prisma.refreshToken.updateMany({ where: { familyId: stored.familyId }, data: { revokedAt: new Date() } });
    await audit({ actorType: 'STAFF', actorId: stored.subjectId, action: 'STAFF_LOGOUT', entityType: 'User', entityId: stored.subjectId });
  }
  res.status(204).end();
});

staffRouter.get('/me', requireStaff(), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.principal!.sub } });
  if (!user || user.status !== 'ACTIVE') throw new HttpError(401, 'staff_session_required');
  res.json({ user: summary(user), role: user.role as StaffRole });
});

/**
 * Step-up check for sensitive actions (approving payouts, publishing products): a fresh authenticator code
 * from the signed-in person, which also cannot be replayed. Throws 401 code_invalid / code_used.
 */
export async function requireFreshCode(userId: string, code: unknown): Promise<void> {
  if (typeof code !== 'string' || code.length > 200) throw new HttpError(401, 'code_invalid');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== 'ACTIVE') throw new HttpError(401, 'staff_session_required');
  if (user.passwordOnly) {
    // Password-only admin confirms sensitive actions by typing the admin password again.
    if (isLocked(user)) throw new HttpError(423, 'account_locked');
    if (!verifyPassword(code, user.passwordHash)) {
      await recordFailure(user, 'password');
      throw new HttpError(401, 'invalid_credentials');
    }
    return;
  }
  if (!/^\d{6}$/.test(code) || !user.totpSecretEnc) throw new HttpError(401, 'code_invalid');
  if (isLocked(user)) throw new HttpError(423, 'account_locked');
  const step = verifyTotp(decrypt(user.totpSecretEnc!), code);
  if (step === null || (user.totpLastStep !== null && step <= user.totpLastStep)) {
    await recordFailure(user, 'code');
    throw new HttpError(401, step === null ? 'code_invalid' : 'code_used');
  }
  await prisma.user.update({ where: { id: user.id }, data: { totpLastStep: step, failedLogins: 0 } });
}

/** Staff set their own password (required after a one-time password). Ends every other session. */
staffRouter.post('/password', limiter, requireStaff(), async (req, res) => {
  const input = body(
    req,
    z.object({
      current: z.string().min(1).max(200),
      next: z
        .string()
        .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
        .max(200)
        .refine((v) => /[a-z]/i.test(v) && /\d/.test(v), 'Use letters and at least one number'),
    }),
  );
  const user = await prisma.user.findUnique({ where: { id: req.principal!.sub } });
  if (!user || user.status !== 'ACTIVE') throw new HttpError(401, 'staff_session_required');
  if (!verifyPassword(input.current, user.passwordHash)) {
    await recordFailure(user, 'password');
    throw new HttpError(401, 'invalid_credentials');
  }
  if (input.current === input.next) throw new HttpError(422, 'password_same');
  if (input.next.toLowerCase().includes(user.email.split('@')[0]!.toLowerCase())) throw new HttpError(422, 'password_weak');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(input.next), mustChangePassword: false, failedLogins: 0 } });
  await audit({ actorType: 'STAFF', actorId: user.id, action: 'STAFF_PASSWORD_CHANGED', entityType: 'User', entityId: user.id });
  res.json({ ok: true });
});

/**
 * One-time setup for a fresh deployment, so the first accounts can be made without database access.
 * Works ONLY with the server's CRON_SECRET and ONLY while no staff account exists; afterwards it is gone (404).
 * Creates the main system admin (one-time password, must choose their own) and, outside prod, team TEST
 * accounts per role with a shared password and authenticator setup key so several testers can use them.
 */
staffRouter.post('/bootstrap', limiter, async (req, res) => {
  const given = Buffer.from((req.headers.authorization ?? '').replace(/^Bearer /, ''));
  const expected = Buffer.from(env.CRON_SECRET ?? '');
  if (!expected.length || given.length !== expected.length || !timingSafeEqual(given, expected)) throw new HttpError(404, 'not_found');
  const input = body(req, z.object({ adminEmail: z.string().email().max(200), adminName: z.string().trim().min(2).max(80), team: z.boolean().default(false), passwordOnly: z.boolean().default(false) }));

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(515151)`;
    if ((await tx.user.count()) > 0) throw new HttpError(404, 'not_found'); // already set up: this door is closed
    const org = await tx.organisation.findFirst({ where: { type: 'INSURER' }, orderBy: { id: 'asc' } });
    if (!org) throw new HttpError(409, 'run_seed_first');
    // Password-only admin gets a long random password (no email/code step), so it must be unguessable.
    const oneTime = input.passwordOnly ? `Fasal-Admin-${randomBytes(9).toString('base64url')}` : randomBytes(18).toString('base64url');
    const admin = await tx.user.create({
      data: {
        email: input.adminEmail.toLowerCase(),
        name: input.adminName,
        role: 'SYS_ADMIN',
        orgId: org.id,
        passwordHash: hashPassword(oneTime),
        mustChangePassword: !input.passwordOnly,
        passwordOnly: input.passwordOnly,
      },
    });
    await audit({ actorType: 'SYSTEM', action: 'STAFF_BOOTSTRAP', entityType: 'User', entityId: admin.id, diff: { role: 'SYS_ADMIN' } }, tx);

    const team: { email: string; role: string; password: string; setupKey: string }[] = [];
    if (input.team && env.APP_ENV !== 'prod') {
      const roles: [string, StaffRole][] = [
        ['Test Claims Ops', 'CLAIMS_OPS'],
        ['Test Payout Approver', 'PAYOUT_APPROVER'],
        ['Test Product Manager', 'PRODUCT_MANAGER'],
        ['Test Regulator', 'REGULATOR'],
      ];
      const password = `Fasal-Test-${randomBytes(4).toString('hex')}`; // one shared test password for the team
      for (const [name, role] of roles) {
        const setupKey = newTotpSecret();
        const email = `${role.toLowerCase().replace('_', '.')}@test.fasalshield.app`;
        const u = await tx.user.create({
          data: { email, name, role, orgId: org.id, passwordHash: hashPassword(password), totpSecretEnc: encrypt(setupKey), mfaEnrolledAt: new Date(), mustChangePassword: false },
        });
        await audit({ actorType: 'SYSTEM', action: 'STAFF_TEST_ACCOUNT', entityType: 'User', entityId: u.id, diff: { role } }, tx);
        team.push({ email, role, password, setupKey });
      }
    }
    return { admin: { email: admin.email, oneTimePassword: oneTime }, team };
  });
  res.status(201).json(result);
});

/**
 * Quick login (owner's choice): the main admin enters only the admin password. Only accounts marked
 * passwordOnly can use it; same lockout, rate limit, short session and audit as the full sign-in.
 */
staffRouter.post('/quick-login', limiter, async (req, res) => {
  const { password } = body(req, z.object({ password: z.string().min(1).max(200) }));
  const candidates = await prisma.user.findMany({ where: { passwordOnly: true, status: 'ACTIVE' } });
  const user = candidates.find((u) => verifyPassword(password, u.passwordHash));
  if (!candidates.length) verifyPassword(password, null); // same timing when none exist
  if (!user) {
    for (const u of candidates) await recordFailure(u, 'password');
    throw new HttpError(401, 'invalid_credentials');
  }
  if (isLocked(user)) throw new HttpError(423, 'account_locked');
  const updated = await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await audit({ actorType: 'STAFF', actorId: user.id, action: 'STAFF_LOGIN', entityType: 'User', entityId: user.id, diff: { method: 'password_only' } });
  res.json({ ...(await issueStaffTokens(updated)), user: summary(updated) });
});
