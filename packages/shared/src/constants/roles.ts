/**
 * Roles from docs/03-Security-and-Access.md §1.
 * Keep these identifiers stable: they are stored in the DB, carried in JWTs and used by the RBAC matrix.
 */
export const ROLES = [
  'FARMER',
  'AGENT',
  'FPO_ADMIN',
  'PRODUCT_MANAGER',
  'CLAIMS_OPS',
  'PAYOUT_APPROVER',
  'SYS_ADMIN',
  'REINSURER',
  'REGULATOR',
] as const;

export type Role = (typeof ROLES)[number];

/** Roles that log in with phone OTP on the mobile app. */
export const MOBILE_ROLES = ['FARMER', 'AGENT'] as const satisfies readonly Role[];

/** Roles that log in with email + MFA on the admin dashboard. */
export const STAFF_ROLES = [
  'FPO_ADMIN',
  'PRODUCT_MANAGER',
  'CLAIMS_OPS',
  'PAYOUT_APPROVER',
  'SYS_ADMIN',
  'REINSURER',
  'REGULATOR',
] as const satisfies readonly Role[];

/** Read-only oversight roles (no mutations anywhere). */
export const READ_ONLY_ROLES = ['REINSURER', 'REGULATOR'] as const satisfies readonly Role[];

/**
 * Separation-of-duties: pairs of roles a single user must never hold together (SoD-3).
 */
export const INCOMPATIBLE_ROLE_PAIRS: ReadonlyArray<readonly [Role, Role]> = [
  ['SYS_ADMIN', 'PAYOUT_APPROVER'],
  ['SYS_ADMIN', 'CLAIMS_OPS'],
  ['CLAIMS_OPS', 'PAYOUT_APPROVER'],
];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: Role): boolean {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}

export function isMobileRole(role: Role): boolean {
  return (MOBILE_ROLES as readonly Role[]).includes(role);
}

/** Returns the first SoD conflict in a set of roles, or null if the combination is allowed. */
export function findRoleConflict(roles: readonly Role[]): readonly [Role, Role] | null {
  const set = new Set(roles);
  for (const pair of INCOMPATIBLE_ROLE_PAIRS) {
    if (set.has(pair[0]) && set.has(pair[1])) return pair;
  }
  return null;
}
