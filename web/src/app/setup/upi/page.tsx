'use client';

import { Check, Landmark, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { messageFor, post } from '@/lib/client';
import type { Me } from '@/lib/format';

const VPA = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export default function UpiPage() {
  const router = useRouter();
  const [vpa, setVpa] = useState('');
  const [checked, setChecked] = useState<Me['wallet']>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!VPA.test(vpa)) {
      setError('Enter your UPI ID the way it appears in your UPI app, for example name@okaxis.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const me = await post<Me>('/api/fs/me/wallets', { vpa: vpa.trim() });
      setChecked(me.wallet);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/setup/field', label: 'Back' }}
        step={3}
        title="Where should we send money"
        sub="Payouts go only to this UPI ID"
      />
      <form className="contents" onSubmit={check} noValidate>
        <div className="work">
          <div>
            <label className="label" htmlFor="vpa">
              UPI ID
            </label>
            <div className="field text" data-invalid={!!error}>
              <input
                id="vpa"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="name@okaxis"
                value={vpa}
                readOnly={!!checked}
                onChange={(e) => {
                  setVpa(e.target.value.trim());
                  setError(null);
                }}
              />
            </div>
            {error ? <FormError>{error}</FormError> : null}
          </div>

          {checked ? (
            <>
              <div className="money quiet">
                <Landmark size={30} aria-hidden="true" color="var(--board)" />
                <div style={{ display: 'grid', gap: 2 }}>
                  <span className="s">Name at the bank</span>
                  <span className="fig" style={{ fontWeight: 600, fontSize: 23, lineHeight: 1.1 }}>
                    {checked.verifiedName}
                  </span>
                  <span className="tag" style={{ justifySelf: 'start' }}>
                    <Check size={16} aria-hidden="true" /> Account checked
                  </span>
                </div>
              </div>
              <p className="small">
                If this is not your name, change the UPI ID. Money sent to the wrong account cannot
                be taken back.
              </p>
            </>
          ) : null}
        </div>
        <div className="action">
          {checked ? (
            <>
              <button className="btn" type="button" onClick={() => router.replace('/')}>
                <Check size={22} aria-hidden="true" /> Yes, this is my account
              </button>
              <button
                className="btn btn-quiet"
                type="button"
                onClick={() => {
                  setChecked(null);
                  setVpa('');
                }}
              >
                Change UPI ID
              </button>
            </>
          ) : (
            <button className="btn" type="submit" disabled={busy || !vpa}>
              {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
              {busy ? 'Checking with your bank' : 'Check UPI ID'}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
