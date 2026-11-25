import { Check, ChevronRight, CircleDashed, MapPin, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Mark } from '@/components/mark';
import { SignOut } from '@/components/sign-out';
import { serverGet } from '@/lib/server-api';

type Me = {
  name: string;
  code: string;
  org: string;
  counts: { farmers: number; withField: number; withUpi: number; covered: number };
};
type Row = {
  id: string;
  code: string;
  name: string | null;
  phone: string;
  village: string | null;
  fields: number;
  acres: number;
  upi: string | null;
  covers: number;
};

function Step({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`ag-step${ok ? ' ok' : ''}`}>
      {ok ? <Check size={14} aria-hidden="true" /> : <CircleDashed size={14} aria-hidden="true" />}
      {label}
    </span>
  );
}

/** Field agent home: their numbers and every farmer they enrolled, with what is still missing. */
export default async function AgentHome() {
  const [me, farmers] = await Promise.all([
    serverGet<Me>('/agent/me'),
    serverGet<Row[]>('/agent/farmers'),
  ]);
  return (
    <main className="screen">
      <section className="board" aria-labelledby="ag-h">
        <Mark />
        <h1 id="ag-h" className="board-title">
          {me.name}
        </h1>
        <p className="board-sub">
          Field agent {me.code} · {me.org}
        </p>
        <dl className="tally">
          <div>
            <dt>Farmers</dt>
            <dd>{me.counts.farmers}</dd>
          </div>
          <div>
            <dt>Field pinned</dt>
            <dd>{me.counts.withField}</dd>
          </div>
          <div>
            <dt>Covered</dt>
            <dd>{me.counts.covered}</dd>
          </div>
        </dl>
      </section>

      <div className="work" style={{ gap: 16 }}>
        <h2 className="h2">Your farmers</h2>
        {farmers.length === 0 ? (
          <div className="empty">
            <UserPlus size={32} aria-hidden="true" />
            <p>No farmers yet. Enrol the first one: it takes about three minutes with them.</p>
          </div>
        ) : (
          <div className="acc-list">
            {farmers.map((f) => (
              <Link key={f.id} href={`/agent/farmers/${f.id}`} className="acc-row">
                <span className="acc-ic">
                  <MapPin size={20} />
                </span>
                <span className="acc-txt">
                  <span className="acc-l">{f.name ?? f.code}</span>
                  <span className="acc-d">
                    {f.village ?? '—'} · {f.phone}
                  </span>
                  <span className="ag-steps">
                    <Step
                      ok={f.fields > 0}
                      label={f.fields ? `${f.acres.toFixed(1)} acres` : 'Field'}
                    />
                    <Step ok={!!f.upi} label="UPI" />
                    <Step ok={f.covers > 0} label="Cover" />
                  </span>
                </span>
                <ChevronRight size={20} aria-hidden="true" color="var(--ink-2)" />
              </Link>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', justifyItems: 'center' }}>
          <SignOut />
        </div>
      </div>

      <div className="action">
        <Link className="btn" href="/agent/new">
          <UserPlus size={22} aria-hidden="true" /> Enrol a farmer
        </Link>
      </div>
    </main>
  );
}
