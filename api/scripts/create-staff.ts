/**
 * Creates (or resets) a staff account for the admin portal. Prints a random password ONCE; the
 * person enrols their authenticator app at first sign-in. There are no default staff credentials.
 *
 *   npm run staff:create -w api -- --email priya@insurer.in --name "Priya Deshmukh" --role PAYOUT_APPROVER
 *   npm run staff:create -w api -- --email priya@insurer.in --reset     (new password + re-enrol authenticator)
 */
import { randomBytes } from 'node:crypto';
import { prisma } from '../src/db';
import { audit } from '../src/lib/audit';
import { STAFF_ROLES, type StaffRole } from '../src/lib/auth';
import { hashPassword } from '../src/lib/staff-auth';

const INSURER_ORG_ID = '00000000-0000-0000-0000-000000000001'; // seeded insurer (prisma/seed.ts)

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg('email')?.trim().toLowerCase();
  const reset = process.argv.includes('--reset');
  const role = arg('role') as StaffRole | undefined;
  const name = arg('name');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('--email is required');
  if (!reset && (!role || !STAFF_ROLES.includes(role))) throw new Error(`--role must be one of ${STAFF_ROLES.join(', ')}`);

  const password = randomBytes(18).toString('base64url'); // 24 characters
  const fields = { passwordHash: hashPassword(password), mustChangePassword: true, totpSecretEnc: null, totpLastStep: null, mfaEnrolledAt: null, failedLogins: 0, lockedUntil: null };

  const existing = await prisma.user.findUnique({ where: { email } });
  let id: string;
  if (existing) {
    if (!reset) throw new Error(`${email} already exists. Add --reset to issue a new password.`);
    id = (await prisma.user.update({ where: { email }, data: { ...fields, ...(role ? { role } : {}), ...(name ? { name } : {}), status: 'ACTIVE' } })).id;
    await prisma.refreshToken.updateMany({ where: { subjectId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  } else {
    if (reset) throw new Error(`${email} does not exist.`);
    id = (await prisma.user.create({ data: { email, name: name ?? null, role: role!, orgId: INSURER_ORG_ID, ...fields } })).id;
  }
  await audit({ actorType: 'SYSTEM', action: existing ? 'STAFF_RESET' : 'STAFF_CREATED', entityType: 'User', entityId: id, diff: { email, role: role ?? existing?.role } });

  process.stdout.write(
    `\n  Staff account ${existing ? 'reset' : 'created'}: ${email} (${role ?? existing?.role})\n` +
      `  One-time password: ${password}\n` +
      '  Share it privately. At first sign-in they scan the authenticator code shown on screen.\n\n',
  );
}

main()
  .catch((e) => {
    console.error(`\n  ${e instanceof Error ? e.message : e}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
