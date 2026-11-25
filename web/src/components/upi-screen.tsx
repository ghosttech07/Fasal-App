'use client';

import { Check, Landmark, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { messageFor, post } from '@/lib/client';
import type { Me } from '@/lib/format';
import { useT } from '@/i18n/client';

const VPA = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

/** Link and name-check a UPI ID. Used by the farmer's own setup and by an agent for an enrolled farmer. */
export function UpiScreen({
  postUrl,
  backHref,
  next,
  step,
}: {
  postUrl: string;
  backHref: string;
  next: string;
  step?: 1 | 2 | 3;
}) {
  const router = useRouter();
  const { t } = useT();
  const [vpa, setVpa] = useState('');
  const [checked, setChecked] = useState<Me['wallet']>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!VPA.test(vpa)) {
      setError(t('upi.invalid'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // The farmer endpoint answers with the whole profile; the agent endpoint with just the wallet.
      const res = await post<Me | NonNullable<Me['wallet']>>(postUrl, { vpa: vpa.trim() });
      setChecked('onboarding' in res ? res.wallet : res);
    } catch (err) {
      setError(messageFor(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <StepBoard
        back={{ href: backHref, label: t('c.back') }}
        step={step}
        title={t('upi.title')}
        sub={t('upi.sub')}
      />
      <form className="contents" onSubmit={check} noValidate>
        <div className="work">
          <div>
            <label className="label" htmlFor="vpa">
              {t('upi.label')}
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
                  <span className="s">{t('upi.bankName')}</span>
                  <span className="fig" style={{ fontWeight: 600, fontSize: 23, lineHeight: 1.1 }}>
                    {checked.verifiedName}
                  </span>
                  <span className="tag" style={{ justifySelf: 'start' }}>
                    <Check size={16} aria-hidden="true" /> {t('upi.checked')}
                  </span>
                </div>
              </div>
              <p className="small">{t('upi.notYou')}</p>
            </>
          ) : null}
        </div>
        <div className="action">
          {checked ? (
            <>
              <button className="btn" type="button" onClick={() => router.replace(next)}>
                <Check size={22} aria-hidden="true" /> {t('upi.yes')}
              </button>
              <button
                className="btn btn-quiet"
                type="button"
                onClick={() => {
                  setChecked(null);
                  setVpa('');
                }}
              >
                {t('upi.change')}
              </button>
            </>
          ) : (
            <button className="btn" type="submit" disabled={busy || !vpa}>
              {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
              {busy ? t('upi.checking') : t('upi.check')}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
