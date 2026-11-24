'use client';

import Link from 'next/link';
import { Check, LoaderCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { get, messageFor, post } from '@/lib/client';

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

const CATEGORIES: [string, string][] = [
  ['NO_PAYOUT', 'My crop was hurt but no money came'],
  ['LATE_PAYOUT', 'Money is late'],
  ['WRONG_DETAILS', 'My details are wrong'],
  ['PRIVACY', 'My data or privacy'],
  ['OTHER', 'Something else'],
];
const STATUS: Record<Grievance['status'], string> = {
  OPEN: 'Received',
  IN_PROGRESS: 'Being checked',
  RESOLVED: 'Answered',
};
const day = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function Help() {
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
    if (!category) return setError('Choose what the problem is about.');
    if (message.trim().length < 10)
      return setError('Tell us a little more, at least one full sentence.');
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
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/account', label: 'Account' }}
        title="Tell us a problem"
        sub="We answer within 14 days, usually in 2"
      />
      <form className="contents" onSubmit={send} noValidate>
        <div className="work">
          {sent ? (
            <div className="money quiet" role="status">
              <Check size={28} aria-hidden="true" color="var(--board)" />
              <div style={{ display: 'grid', gap: 2 }}>
                <span className="fig" style={{ fontWeight: 600, fontSize: 20 }}>
                  We got it: {sent.ticketNo}
                </span>
                <span className="s">The answer will come to your inbox by {day(sent.dueAt)}.</span>
              </div>
            </div>
          ) : null}

          <fieldset className="choice-list">
            <legend className="label">What is it about</legend>
            {CATEGORIES.map(([v, label]) => (
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
                {label}
              </label>
            ))}
          </fieldset>

          <div>
            <label className="label" htmlFor="msg">
              What happened
            </label>
            <div className="field text area" data-invalid={!!error}>
              <textarea
                id="msg"
                rows={4}
                maxLength={1000}
                placeholder="For example: heavy rain on 12 July flattened my soybean, but no money came."
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
              <h2 className="label">Earlier</h2>
              {items.map((g) => (
                <article key={g.id} className="g-item">
                  <div className="g-head">
                    <b>{g.ticketNo}</b>
                    <span className={`tag ${g.status === 'RESOLVED' ? '' : 'tag-wait'}`}>
                      {STATUS[g.status]}
                    </span>
                  </div>
                  <p className="small">{g.message}</p>
                  {g.response ? (
                    <p className="g-answer">{g.response}</p>
                  ) : (
                    <p className="small">Answer by {day(g.dueAt)}</p>
                  )}
                </article>
              ))}
            </section>
          ) : null}

          <p className="small">
            Not happy with our answer? See{' '}
            <Link href="/legal/grievance">how to complain to the insurer or IRDAI</Link>.
          </p>
        </div>
        <div className="action">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
            {busy ? 'Sending' : 'Send'}
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
