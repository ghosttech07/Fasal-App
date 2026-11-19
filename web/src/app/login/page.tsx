'use client';

import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mark } from '@/components/mark';
import { handoff, messageFor, post } from '@/lib/client';

// shortcut: mirrors the seeded Dry Spell Cover (FS-DRT-MH-RB, ₹15,000, sowing phase); serve it from a public catalog endpoint before launch.
const POSTED_RATES = [
  { rain: '40% below normal', amount: '₹1,500' },
  { rain: '60% below normal', amount: '₹3,600' },
  { rain: '80% below normal', amount: '₹6,000' },
];

const VALID = /^[6-9]\d{9}$/;

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = VALID.test(phone);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError('Enter a 10-digit mobile number starting with 6, 7, 8 or 9.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ requestId: string; devOtp?: string }>('/api/session/request', {
        phone,
      });
      handoff.set(
        'fs_otp',
        JSON.stringify({
          phone,
          requestId: res.requestId,
          devOtp: res.devOtp ?? null,
          sentAt: Date.now(),
        }),
      );
      router.push('/otp');
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <section className="board board-signin" aria-labelledby="pitch">
        <Mark />
        <h1 id="pitch" className="board-title">
          Crop cover that pays when the rain fails
        </h1>
        <table className="rates rates-tight">
          <caption className="sr-only">Dry Spell Cover, sowing phase, for ₹15,000 of cover</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">If rain this phase is</th>
              <th scope="col">You get</th>
            </tr>
          </thead>
          <tbody>
            {POSTED_RATES.map((r) => (
              <tr key={r.rain}>
                <td>{r.rain}</td>
                <td className="amt">{r.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form className="contents" onSubmit={submit} noValidate>
        <div className="work">
          <div>
            <label className="label" htmlFor="phone">
              Your mobile number
            </label>
            <div className="field" data-invalid={!!error}>
              <span className="prefix" aria-hidden="true">
                +91
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10 digits"
                maxLength={10}
                value={phone}
                aria-invalid={!!error}
                aria-describedby={error ? 'phone-error' : 'phone-hint'}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setError(null);
                }}
              />
            </div>
            {error ? (
              <p id="phone-error" className="error" role="alert">
                <AlertCircle size={20} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
                {error}
              </p>
            ) : (
              <p id="phone-hint" className="sr-only">
                We send a 6-digit code by SMS. No password needed.
              </p>
            )}
          </div>
        </div>

        <div className="action">
          <button className="btn" type="submit" disabled={busy || !valid}>
            {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
            {busy ? 'Sending code' : 'Send code'}
            {busy ? null : <ArrowRight size={22} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </main>
  );
}
