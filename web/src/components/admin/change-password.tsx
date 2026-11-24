'use client';

import { useState } from 'react';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Your current password is not right.',
  password_same: 'Choose a password different from the current one.',
  password_weak: 'Do not use your email name in the password.',
  validation_failed: 'Use at least 12 characters, with letters and at least one number.',
  account_locked: 'Too many wrong tries. Your account is locked for 15 minutes.',
  staff_session_required: 'Your session ended. Sign in again.',
  network: 'No connection. Check your internet and try again.',
};

/** Set your own password. Shown on first sign-in (after a one-time password) and on My account. */
export function ChangePassword({ first = false }: { first?: boolean }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const longEnough = next.length >= 12;
  const mixed = /[a-z]/i.test(next) && /\d/.test(next);
  const same = next.length > 0 && next === again;

  if (done)
    return (
      <div className="adm-ok" role="status">
        Password changed. Use it next time you sign in, together with your authenticator code.
        {first ? (
          <p style={{ margin: '10px 0 0' }}>
            <a className="adm-btn" href="/admin">
              Open the portal
            </a>
          </p>
        ) : null}
      </div>
    );

  return (
    <form
      className="adm-form"
      style={{ maxWidth: 460 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await fetch('/api/staff/password', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ current, next }),
          });
          if (!r.ok) {
            const code = ((await r.json().catch(() => ({}))) as { code?: string }).code ?? '';
            throw new Error(code);
          }
          setDone(true);
        } catch (err) {
          setError(
            MESSAGES[(err as Error).message] ?? 'Something went wrong. Try again in a minute.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {first ? (
        <p className="adm-note" style={{ margin: 0 }}>
          You signed in with a one-time password. Choose your own password to continue.
        </p>
      ) : null}
      <label>
        {first ? 'One-time password' : 'Current password'}
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </label>
      <label>
        New password
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          aria-describedby="pw-rules"
        />
      </label>
      <ul id="pw-rules" className="adm-muted" style={{ margin: 0, paddingLeft: 18 }}>
        <li style={{ color: longEnough ? '#15803d' : undefined }}>
          {longEnough ? '✓ ' : ''}At least 12 characters
        </li>
        <li style={{ color: mixed ? '#15803d' : undefined }}>
          {mixed ? '✓ ' : ''}Letters and at least one number
        </li>
      </ul>
      <label>
        New password again
        <input
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          required
        />
      </label>
      {again && !same ? (
        <p className="adm-err" style={{ margin: 0 }}>
          The two new passwords are different.
        </p>
      ) : null}
      {error ? (
        <p className="adm-err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
      <button
        className="adm-btn"
        type="submit"
        disabled={busy || !current || !longEnough || !mixed || !same}
        style={{ justifySelf: 'start' }}
      >
        {busy ? 'Saving…' : 'Save new password'}
      </button>
    </form>
  );
}
