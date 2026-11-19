import { Banknote, Check, Clock, Satellite } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Mark } from '@/components/mark';
import { type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { Money } from '@/components/money';

export default async function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await serverGet<Policy>(`/policies/${id}`);
  if (p.status === 'PENDING_PAYMENT') redirect(`/cover/pay/${id}`);

  return (
    <main className="screen">
      <section className="board" aria-labelledby="done" style={{ paddingBottom: 26, gap: 14 }}>
        <Mark />
        <span className="stamp">
          <Check size={22} aria-hidden="true" /> COVERED
        </span>
        <h1 id="done" className="board-title">
          Your {p.cropCode.toLowerCase()} is covered up to{' '}
          <span className="gold">
            <Money paise={p.sumInsuredPaise} />
          </span>
        </h1>
        <p className="board-sub">
          Policy{' '}
          <span className="fig" style={{ color: 'var(--chalk)', fontSize: 18 }}>
            {p.policyNumber}
          </span>{' '}
          · SMS sent
        </p>
      </section>
      <div className="work">
        <h2 className="h2">What happens now</h2>
        <div className="steps">
          <div>
            <b>
              <Satellite size={20} aria-hidden="true" />
            </b>
            <span>We check the rain on your field every day.</span>
          </div>
          <div>
            <b>
              <Banknote size={20} aria-hidden="true" />
            </b>
            <span>If rain crosses a mark, money comes on its own.</span>
          </div>
          <div>
            <b>
              <Clock size={20} aria-hidden="true" />
            </b>
            <span>You get an SMS the day it is sent.</span>
          </div>
        </div>
      </div>
      <div className="action">
        <Link className="btn" href="/">
          Go to home
        </Link>
      </div>
    </main>
  );
}
