'use client';

import Link from 'next/link';
import { Check, LoaderCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { get, messageFor, post } from '@/lib/client';
import { useT } from '@/i18n/client';
import type { Key } from '@/i18n';

type Grievance = {
  id: string;
  ticketNo: string;
  category: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  response: string | null;
  dueAt: string;
  createdAt: string;
};

const CATEGORIES = ['NO_PAYOUT', 'LATE_PAYOUT', 'WRONG_DETAILS', 'PRIVACY', 'OTHER'] as const;
const day = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function Help() {
  const { t } = useT();
  const policyId = useSearchParams().get('policy') ?? undefined;
  const [items, setItems] = useState<Grievance[] | null>(null);
  const [category, setCategory] = useState(policyId ? 'NO_PAYOUT' : '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Grievance | null>(null);

  useEffect(() => {
    get<Grievance[]>('/api/fs/me/grievances').then(setItems, () => setItems([]));
  }, [sent]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return setError(t('help.chooseErr'));
    if (message.trim().length < 10) return setError(t('help.moreErr'));
    setBusy(true);
    setError(null);
    try {
      const g = await post<Grievance>('/api/fs/me/grievances', {
        category,
        message: message.trim(),
        policyId,
      });
      setSent(g);
      setMessage('');
      setCategory('');
    } catch (err) {
      setError(messageFor(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/account', label: t('c.account') }}
        title={t('acc.problem')}
        sub={t('help.sub')}
      />
      <form className="contents" onSubmit={send} noValidate>
        <div className="work">
          {sent ? (
            <div className="money quiet" role="status">
              <Check size={28} aria-hidden="true" color="var(--board)" />
              <div style={{ display: 'grid', gap: 2 }}>
                <span className="fig" style={{ fontWeight: 600, fontSize: 20 }}>
                  {t('help.got', { ticket: sent.ticketNo })}
                </span>
                <span className="s">{t('help.by', { date: day(sent.dueAt) })}</span>
              </div>
            </div>
          ) : null}

          <fieldset className="choice-list">
            <legend className="label">{t('help.about')}</legend>
            {CATEGORIES.map((v) => (
              <label key={v} className="choice" data-on={category === v}>
                <input
                  type="radio"
                  name="category"
                  value={v}
                  checked={category === v}
                  onChange={() => {
                    setCategory(v);
                    setError(null);
                  }}
                />
                {t(`cat.${v}` as Key)}
              </label>
            ))}
          </fieldset>

          <div>
            <label className="label" htmlFor="msg">
              {t('help.what')}
            </label>
            <div className="field text area" data-invalid={!!error}>
              <textarea
                id="msg"
                rows={4}
                maxLength={1000}
                placeholder={t('help.eg')}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError(null);
                }}
              />
            </div>
            {error ? <FormError>{error}</FormError> : null}
          </div>

          {items && items.length ? (
            <section className="g-list" aria-label="Your earlier problems">
              <h2 className="label">{t('help.earlier')}</h2>
              {items.map((g) => (
                <article key={g.id} className="g-item">
                  <div className="g-head">
                    <b>{g.ticketNo}</b>
                    <span className={`tag ${g.status === 'RESOLVED' ? '' : 'tag-wait'}`}>
                      {t(`gs.${g.status}` as Key)}
                    </span>
                  </div>
                  <p className="small">{g.message}</p>
                  {g.response ? (
                    <p className="g-answer">{g.response}</p>
                  ) : (
                    <p className="small">{t('help.answerBy', { date: day(g.dueAt) })}</p>
                  )}
                </article>
              ))}
            </section>
          ) : null}

          <p className="small">
            {t('help.notHappy')} <Link href="/legal/grievance">{t('help.how')}</Link>.
          </p>
        </div>
        <div className="action">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
            {busy ? t('help.sending') : t('help.send')}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function HelpPage() {
  return (
    <Suspense>
      <Help />
    </Suspense>
  );
}
