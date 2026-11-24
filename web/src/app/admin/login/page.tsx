'use client';

import { AlertCircle, ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ApiError, post } from '@/lib/client';

type Enroll = { secret: string; otpauthUrl: string } | null;

function staffMessage(e: unknown): string {
  const code = e instanceof ApiError ? e.code : 'unknown';
  switch (code) {
    case 'invalid_credentials':
      return 'Email or password is not right.';
    case 'account_locked':
      return 'Too many wrong tries. This account is locked for 15 minutes.';
    case 'code_invalid':
      return 'That code is not right. Use the newest code in your authenticator app.';
    case 'code_used':
      return 'That code was already used. Wait for the next code (every 30 seconds).';
    case 'challenge_expired':
      return 'Sign-in took too long. Enter your password again.';
    case 'validation_failed':
      return 'Please check what you entered.';
    case 'network':
      return 'No connection. Check your internet and try again.';
    default:
      return e instanceof ApiError && e.status === 429
        ? 'Too many tries. Wait a few minutes.'
        : 'Something went wrong. Try again in a minute.';
  }
}

/** Groups the setup key in fours so it is easy to type into an authenticator app. */
const grouped = (s: string) => s.match(/.{1,4}/g)?.join(' ') ?? s;

export default function StaffLogin() {
  const [step, setStep] = useState<'quick' | 'password' | 'code'>('quick');
  const [adminPw, setAdminPw] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [enroll, setEnroll] = useState<Enroll>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post('/api/staff/quick', { password: adminPw });
      window.location.assign('/admin');
    } catch (err) {
      setError(staffMessage(err));
      setAdminPw('');
      setBusy(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await post<{ enroll: Enroll }>('/api/staff/login', { email, password });
      setEnroll(r.enroll);
      setPassword(''); // never keep the password in memory longer than needed
      setStep('code');
    } catch (err) {
      setError(staffMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post('/api/staff/mfa', { code });
      window.location.assign('/admin'); // full load so the new session cookies are used everywhere
    } catch (err) {
      setError(staffMessage(err));
      setCode('');
      if (err instanceof ApiError && err.code === 'challenge_expired') setStep('password');
      setBusy(false);
    }
  }

  return (
    <main className="adm-auth">
      <section className="adm-auth-side" aria-label="FasalShield admin">
        <div className="adm-brand" style={{ padding: 0 }}>
          <ShieldCheck size={28} color="var(--marigold)" aria-hidden="true" />
          <div>
            FasalShield<small>Insurer admin</small>
          </div>
        </div>
        <div>
          <h1>Staff sign-in</h1>
          <p>
            For insurer and FasalShield staff only. Every sign-in needs your password and a code
            from your authenticator app, and every action is recorded.
          </p>
        </div>
        <p style={{ fontSize: 13 }}>Farmers sign in at the app, not here.</p>
      </section>

      {step === 'quick' ? (
        <form className="adm-auth-form" onSubmit={submitQuick} noValidate>
          <h2>Admin sign-in</h2>
          <label className="label" htmlFor="adminpw">
            Admin password
            <input
              id="adminpw"
              className="adm-input"
              type="password"
              autoComplete="current-password"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              autoFocus
              required
            />
          </label>
          {error ? (
            <p className="error" role="alert">
              <AlertCircle size={20} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
              {error}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={busy || !adminPw}>
            {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
            {busy ? 'Checking' : 'Open admin'}
            {busy ? null : <ArrowRight size={22} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="adm-back"
            onClick={() => {
              setStep('password');
              setError(null);
            }}
          >
            Staff with an email account? Sign in here
          </button>
        </form>
      ) : step === 'password' ? (
        <form className="adm-auth-form" onSubmit={submitPassword} noValidate>
          <h2>Sign in</h2>
          <label className="label" htmlFor="email">
            Work email
            <input
              id="email"
              className="adm-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="label" htmlFor="password">
            Password
            <input
              id="password"
              className="adm-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="error" role="alert">
              <AlertCircle size={20} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
              {error}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={busy || !email || !password}>
            {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
            {busy ? 'Checking' : 'Continue'}
            {busy ? null : <ArrowRight size={22} aria-hidden="true" />}
          </button>
        </form>
      ) : (
        <form className="adm-auth-form" onSubmit={submitCode} noValidate>
          <h2>{enroll ? 'Set up two-step sign-in' : 'Enter your code'}</h2>
          {enroll ? (
            <div className="adm-enrol">
              <ol>
                <li>
                  Open an authenticator app on your phone (Google Authenticator, Microsoft
                  Authenticator or similar).
                </li>
                <li>Choose “Enter a setup key” and type this key, time-based:</li>
              </ol>
              <div className="adm-secret" aria-label="Setup key">
                {grouped(enroll.secret)}
              </div>
              <a href={enroll.otpauthUrl} className="hint">
                On this phone? Tap here to add it directly.
              </a>
              <ol start={3}>
                <li>Enter the 6-digit code the app shows.</li>
              </ol>
            </div>
          ) : (
            <p className="hint">
              Open your authenticator app and enter the 6-digit code for FasalShield.
            </p>
          )}
          <label className="label" htmlFor="code">
            6-digit code
            <input
              id="code"
              className="adm-input adm-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
            />
          </label>
          {error ? (
            <p className="error" role="alert">
              <AlertCircle size={20} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
              {error}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={busy || code.length !== 6}>
            {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
            {busy ? 'Verifying' : 'Sign in'}
            {busy ? null : <ArrowRight size={22} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="adm-back"
            onClick={() => {
              setStep('password');
              setError(null);
              setCode('');
            }}
          >
            Use a different account
          </button>
        </form>
      )}
    </main>
  );
}
