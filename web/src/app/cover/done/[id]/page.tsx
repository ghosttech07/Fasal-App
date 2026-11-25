import { Banknote, Check, Clock, Satellite } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Mark } from '@/components/mark';
import { type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { Money } from '@/components/money';
import { getT } from '@/i18n/server';

export default async function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await serverGet<Policy>(`/policies/${id}`);
  if (p.status === 'PENDING_PAYMENT') redirect(`/cover/pay/${id}`);
  const { t } = await getT();

  return (
    <main className="screen">
      <section className="board" aria-labelledby="done" style={{ paddingBottom: 26, gap: 14 }}>
        <Mark />
        <span className="stamp">
          <Check size={22} aria-hidden="true" /> {t('done.covered')}
        </span>
        <h1 id="done" className="board-title">
          {t('done.title', { crop: t(`crop.${p.cropCode}` as never) })}{' '}
          <span className="gold">
            <Money paise={p.sumInsuredPaise} />
          </span>
        </h1>
        <p className="board-sub">
          {t('done.policy')}{' '}
          <span className="fig" style={{ color: 'var(--chalk)', fontSize: 18 }}>
            {p.policyNumber}
          </span>{' '}
          · {t('done.sms')}
        </p>
      </section>
      <div className="work">
        <h2 className="h2">{t('done.now')}</h2>
        <div className="steps">
          <div>
            <b>
              <Satellite size={20} aria-hidden="true" />
            </b>
            <span>{t('done.s1')}</span>
          </div>
          <div>
            <b>
              <Banknote size={20} aria-hidden="true" />
            </b>
            <span>{t('done.s2')}</span>
          </div>
          <div>
            <b>
              <Clock size={20} aria-hidden="true" />
            </b>
            <span>{t('done.s3')}</span>
          </div>
        </div>
      </div>
      <div className="action">
        <Link className="btn" href="/">
          {t('done.home')}
        </Link>
      </div>
    </main>
  );
}
