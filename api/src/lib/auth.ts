import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../env';
import { HttpError } from './http';

export interface Principal {
  sub: string; // farmerId | agentId | userId
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    principal?: Principal;
  }
}

export function signAccessToken(principal: Principal): string {
  return jwt.sign(principal, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_ACCESS_TTL_SECONDS,
    issuer: 'fasalshield',
  });
}

/** RBAC guard: authenticates the bearer token and checks the role (Security §2 matrix). */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new HttpError(401, 'unauthenticated');
    let principal: Principal;
    try {
      principal = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        algorithms: ['HS256'],
        issuer: 'fasalshield',
      }) as Principal;
    } catch {
      throw new HttpError(401, 'token_invalid');
    }
    if (!roles.includes(principal.role)) throw new HttpError(403, 'forbidden');
    req.principal = { sub: principal.sub, role: principal.role };
    next();
  };

/** Demo/admin guard until staff login + MFA (Part 9.1). Constant-time compare. */
export const requireAdminKey: RequestHandler = (req, _res, next) => {
  const given = Buffer.from(String(req.headers['x-admin-key'] ?? ''));
  const expected = Buffer.from(env.ADMIN_API_KEY ?? '');
  const ok =
    expected.length > 0 &&
    given.length === expected.length &&
    timingSafeEqual(given, expected);
  if (!ok) throw new HttpError(401, 'admin_key_required');
  next();
};
