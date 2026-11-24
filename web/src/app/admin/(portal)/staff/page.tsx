import { redirect } from 'next/navigation';
import { adminGet, can, currentStaff, when } from '@/lib/admin';
import { ROLE_LABEL, type StaffRole } from '@/lib/staff-session';
import { InviteStaff, StaffRow } from '@/components/admin/actions';
import { PageHead, Status, Unavailable } from '@/components/admin/ui';

type Staff = {
  id: string;
  email: string;
  name: string | null;
  role: StaffRole;
  status: string;
  mfa: boolean;
  locked: boolean;
  lastLoginAt: string | null;
};

/** A7: staff accounts and roles (system admin only). New accounts get a one-time password shown once. */
export default async function StaffPage() {
  const me = await currentStaff();
  if (!me) return <Unavailable />;
  if (!can.manageStaff(me.role)) redirect('/admin');
  const d = await adminGet<{ staff: Staff[] }>('staff');
  if (!d) return <Unavailable />;
  return (
    <>
      <PageHead
        title="Staff & roles"
        sub="Every account uses two-step sign-in. Changing a role or disabling an account ends their sessions at once."
      />
      <section className="adm-card">
        <h2>Add a staff member</h2>
        <InviteStaff />
      </section>
      <section className="adm-card adm-stack">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Two-step</th>
                <th>Status</th>
                <th>Last sign-in</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.name ?? s.email}</b>
                    <br />
                    <span className="adm-muted">{s.email}</span>
                  </td>
                  <td>{ROLE_LABEL[s.role] ?? s.role}</td>
                  <td>
                    {s.mfa ? (
                      <span className="adm-tag">On</span>
                    ) : (
                      <span className="adm-tag warn">Not set up yet</span>
                    )}
                  </td>
                  <td>
                    <Status value={s.status} />
                    {s.locked ? (
                      <>
                        {' '}
                        <span className="adm-tag bad">Locked</span>
                      </>
                    ) : null}
                  </td>
                  <td className="adm-muted">{when(s.lastLoginAt)}</td>
                  <td>
                    <StaffRow id={s.id} status={s.status} role={s.role} self={s.id === me.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
