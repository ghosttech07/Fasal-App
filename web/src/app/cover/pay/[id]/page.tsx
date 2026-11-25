import { redirect } from 'next/navigation';
import { PayButton } from '@/components/pay-button';
import { StepBoard } from '@/components/step-board';
import { day, rupees, type Me, type Policy } from '@/lib/format';
import { getT } from '@/i18n/server';
import { serverGet } from '@/lib/server-api';
import { Money } from '@/components/money';

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, me] = await Promise.all([serverGet<Policy>(`/policies/${id}`), serverGet<Me>('/me')]);
  if (p.status !== 'PENDING_PAYMENT') redirect(`/cover/done/${id}`);
  const net = p.premiumPaise - p.subsidyPaise;
  const end = p.phasePlan.at(-1)?.to;
  const { t } = await getT();

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/cover/crop', label: t('c.covers') }}
        title={<span className="sr-only">{t('pay.title')}</span>}
      >
        <p className="board-sub" style={{ marginTop: -12 }}>
          {t('pay.today')}
        </p>
        <div className="big-gold">
          <Money paise={net} />
        </div>
        <p className="board-sub">
          {t('pay.for', {
            cover: t(`prod.${p.peril}` as never),
            crop: t(`crop.${p.cropCode}` as never),
            amt: rupees(p.sumInsuredPaise),
          })}
        </p>
      </StepBoard>
      <div className="work">
        <div className="ruled">
          <div>
            <span className="k">{t('pay.full')}</span>
            <span className="v">{rupees(p.premiumPaise)}</span>
          </div>
          {p.subsidyPaise > 0 ? (
            <div>
              <span className="k">{t('pay.sponsor')}</span>
              <span className="v" style={{ color: 'var(--board)' }}>
                − {rupees(p.subsidyPaise)}
              </span>
            </div>
          ) : null}
          <div>
            <span className="k" style={{ color: 'var(--ink)', fontWeight: 600 }}>
              {t('choose.youPay')}
            </span>
            <span className="v" style={{ fontSize: 24 }}>
              {rupees(net)}
            </span>
          </div>
        </div>
        <div className="ruled" style={{ borderTop: 0 }}>
          <div>
            <span className="k">{t('pay.from')}</span>
            <span style={{ fontWeight: 500 }}>{me.wallet?.handleMasked}</span>
          </div>
          {end ? (
            <div>
              <span className="k">{t('pay.runs')}</span>
              <span style={{ fontWeight: 500 }}>{t('pay.todayTo', { date: day(end, true) })}</span>
            </div>
          ) : null}
        </div>
        <p className="small">{t('pay.insurer')}</p>
      </div>
      <div className="action">
        <PayButton
          id={id}
          label={t('pay.btn', { amt: rupees(net) })}
          waiting={t('pay.waiting')}
          opens={t('pay.opens')}
        />
      </div>
    </main>
  );
}
