import { currentStaff } from '@/lib/admin';
import { ROLE_LABEL } from '@/lib/staff-session';
import { ChangePassword } from '@/components/admin/change-password';
import { PageHead, Unavailable } from '@/components/admin/ui';

/** My account: who you are signed in as, and change your password. */
export default async function Account() {
  const me = await currentStaff();
  if (!me) return <Unavailable />;
  return (
    <>
      <PageHead
        title="My account"
        sub="Your sign-in uses your password and a code from your authenticator app."
      />
      <div className="adm-grid">
        <section className="adm-card">
          <h2>You</h2>
          <dl className="adm-kv">
            <dt>Name</dt>
            <dd>{me.name ?? '—'}</dd>
            <dt>Email</dt>
            <dd>{me.email}</dd>
            <dt>Role</dt>
            <dd>{ROLE_LABEL[me.role]}</dd>
            <dt>Two-step sign-in</dt>
            <dd>
              <span className="adm-tag">On</span>
            </dd>
            <dt>Lost your phone?</dt>
            <dd>Ask a system admin to reset your sign-in.</dd>
          </dl>
        </section>
        <section className="adm-card">
          <h2>Change password</h2>
          <ChangePassword />
        </section>
      </div>
    </>
  );
}
