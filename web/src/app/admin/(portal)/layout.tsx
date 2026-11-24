import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { StaffNav } from '@/components/admin/staff-nav';
import { SignOutStaff } from '@/components/admin/sign-out-staff';
import { ChangePassword } from '@/components/admin/change-password';
import { ROLE_LABEL, STAFF_ACCESS_COOKIE, staffApi, type StaffUser } from '@/lib/staff-session';

/** Every portal page renders inside this shell, and only for a live staff session (checked against the API). */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(STAFF_ACCESS_COOKIE)?.value;
  const me = await staffApi<{ user: StaffUser }>('staff/me', token);
  if (!me) redirect('/admin/login');
  const { user } = me;
  return (
    <div className="adm-shell">
      <aside className="adm-nav" aria-label="Admin">
        <div className="adm-brand">
          <ShieldCheck size={26} color="var(--marigold)" aria-hidden="true" />
          <div>
            FasalShield<small>Insurer admin</small>
          </div>
        </div>
        <StaffNav role={user.role} />
        <div className="adm-me">
          <div>
            <b>{user.name ?? user.email}</b>
            {ROLE_LABEL[user.role]} · {user.passwordOnly ? 'password sign-in' : 'two-step on'}
          </div>
          <SignOutStaff />
        </div>
      </aside>
      <main className="adm-main">
        {user.mustChangePassword ? (
          <>
            <header className="adm-head">
              <div>
                <h1>Choose your password</h1>
                <p>One last step before you use the portal.</p>
              </div>
            </header>
            <section className="adm-card">
              <ChangePassword first />
            </section>
          </>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
