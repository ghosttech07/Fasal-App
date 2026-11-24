import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../env';
import { HttpError } from './http';

export interface Principal {
  sub: string; // farmerId | agentId | userId
  role: Role;
  /** Staff only: set when the two-step code was passed for this session. */
  mfa?: boolean;
}

/** Roles that sign in through the staff portal (email + password + authenticator code). */
export const STAFF_ROLES = ['PRODUCT_MANAGER', 'CLAIMS_OPS', 'PAYOUT_APPROVER', 'SYS_ADMIN', 'REINSURER', 'REGULATOR'] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];
export const isStaffRole = (r: Role): r is StaffRole => (STAFF_ROLES as readonly Role[]).includes(r);

declare module 'express-serve-static-core' {
  interface Request {
    principal?: Principal;
  }
}

export function signAccessToken(principal: Principal, ttlSeconds = env.JWT_ACCESS_TTL_SECONDS): string {
  return jwt.sign(principal, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: ttlSeconds,
    issuer: 'fasalshield',
  });
}

function readPrincipal(header: string | undefined): Principal {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'unauthenticated');
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'], issuer: 'fasalshield' }) as Principal;
  } catch {
    throw new HttpError(401, 'token_invalid');
  }
}

/** RBAC guard: authenticates the bearer token and checks the role (Security §2 matrix). */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    const principal = readPrincipal(req.headers.authorization);
    if (!roles.includes(principal.role)) throw new HttpError(403, 'forbidden');
    req.principal = { sub: principal.sub, role: principal.role };
    next();
  };

/** Staff guard: a staff role AND a session that passed the two-step code. Defaults to any staff role. */
export const requireStaff =
  (...roles: StaffRole[]): RequestHandler =>
  (req, _res, next) => {
    const principal = readPrincipal(req.headers.authorization);
    const allowed: readonly Role[] = roles.length ? roles : STAFF_ROLES;
    if (!isStaffRole(principal.role) || principal.mfa !== true) throw new HttpError(401, 'staff_session_required');
    if (!allowed.includes(principal.role)) throw new HttpError(403, 'forbidden');
    req.principal = { sub: principal.sub, role: principal.role, mfa: true };
    next();
  };
