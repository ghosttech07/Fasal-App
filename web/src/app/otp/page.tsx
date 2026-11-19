'use client';

import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Mark } from '@/components/mark';
import { formatPhone, handoff, messageFor, post } from '@/lib/client';

type Pending = { phone: string; requestId: string; devOtp: string | null; sentAt: number };
const RESEND_AFTER = 30;

export default function OtpPage() {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const submitted = useRef('');

  useEffect(() => {
    const raw = handoff.get('fs_otp');
    if (!raw) {
      router.replace('/login');
      return;
    }
    setPending(JSON.parse(raw) as Pending);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [router]);

  async function verify(otp: string) {
    if (!pending || busy || submitted.current === otp) return;
    submitted.current = otp;
    setBusy(true);
    setError(null);
    try {
      await post('/api/session/verify', { requestId: pending.requestId, otp });
      handoff.set('fs_otp', '');
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
      submitted.current = '';
    }
  }

  async function resend() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ requestId: string; devOtp?: string }>('/api/session/request', { phone: pending.phone });
      const next = { phone: pending.phone, requestId: res.requestId, devOtp: res.devOtp ?? null, sentAt: Date.now() };
      handoff.set('fs_otp', JSON.stringify(next));
      setPending(next);
      setCode('');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  if (!pending) return <main className="screen" />;
  const wait = Math.max(0, RESEND_AFTER - Math.floor((now - pending.sentAt) / 1000));

  return (
    <main className="screen">
      <section className="board" aria-labelledby="title">
        <Mark />
        <h1 id="title" className="board-title">
          Enter the 6-digit code
        </h1>
        <p className="board-sub">
          Sent by SMS to <span className="fig" style={{ color: 'var(--chalk)', fontSize: 19 }}>{formatPhone(pending.phone)}</span>
        </p>
      </section>

      <form
        className="contents"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) void verify(code);
        }}
      >
        <div className="work">
          <div>
            <label className="label" htmlFor="otp">
              Code from the SMS
            </label>
            <div className="field" data-invalid={!!error}>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="6 digits"
                value={code}
                aria-invalid={!!error}
                aria-describedby={error ? 'otp-error' : undefined}
                style={{ letterSpacing: code ? '0.5em' : undefined, fontSize: 28 }}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  setError(null);
                  if (v.length === 6) void verify(v); // verifies on its own at 6 digits
                }}
              />
            </div>
            {error ? (
              <p id="otp-error" className="error" role="alert">
                <AlertCircle size={20} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
                {error}
              </p>
            ) : null}
          </div>

          {pending.devOtp ? (
            <p>
              <span className="tag tag-dev">
                Test code <span className="fig" style={{ fontSize: 17, letterSpacing: '0.08em' }}>{pending.devOtp}</span>
              </span>
            </p>
          ) : null}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
            <button className="btn btn-quiet" type="button" style={{ width: 'auto' }} disabled={wait > 0 || busy} onClick={resend}>
              {wait > 0 ? (
                <>
                  Send again in <span className="fig">{wait}s</span>
                </>
              ) : (
                'Send the code again'
              )}
            </button>
            <button className="btn btn-quiet" type="button" style={{ width: 'auto' }} onClick={() => router.replace('/login')}>
              Change number
            </button>
          </div>
        </div>

        <div className="action">
          <button className="btn" type="submit" disabled={busy || code.length !== 6}>
            {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
            {busy ? 'Checking' : 'Verify and continue'}
          </button>
        </div>
      </form>
    </main>
  );
}
