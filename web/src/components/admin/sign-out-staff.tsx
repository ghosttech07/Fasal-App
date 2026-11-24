'use client';

import { useState } from 'react';

/** Ends the staff session everywhere (server revokes the refresh family) and returns to sign-in. */
export function SignOutStaff() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="adm-signout"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/staff/logout', { method: 'POST' }).catch(() => undefined);
        window.location.assign('/admin/login');
      }}
    >
      {busy ? 'Signing out' : 'Sign out'}
    </button>
  );
}
