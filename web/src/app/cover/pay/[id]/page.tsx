import { redirect } from 'next/navigation';
import { PayButton } from '@/components/pay-button';
import { StepBoard } from '@/components/step-board';
import { day, en, rupees, type Me, type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { Money } from '@/components/money';

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, me] = await Promise.all([serverGet<Policy>(`/policies/${id}`), serverGet<Me>('/me')]);
  if (p.status !== 'PENDING_PAYMENT') redirect(`/cover/done/${id}`);
  const net = p.premiumPaise - p.subsidyPaise;
  const end = p.phasePlan.at(-1)?.to;

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/cover/crop', label: 'Covers' }}
        title={<span className="sr-only">Pay premium</span>}
      >
        <p className="board-sub" style={{ marginTop: -12 }}>
          You pay today
        </p>
        <div className="big-gold">
          <Money paise={net} />
        </div>
        <p className="board-sub">
          {en(p.names)} for {p.cropCode.toLowerCase()}, up to {rupees(p.sumInsuredPaise)}
        </p>
      </StepBoard>
      <div className="work">
        <div className="ruled">
          <div>
            <span className="k">Full premium</span>
            <span className="v">{rupees(p.premiumPaise)}</span>
          </div>
          {p.subsidyPaise > 0 ? (
            <div>
              <span className="k">Sponsor share</span>
              <span className="v" style={{ color: 'var(--board)' }}>
                − {rupees(p.subsidyPaise)}
              </span>
            </div>
          ) : null}
          <div>
            <span className="k" style={{ color: 'var(--ink)', fontWeight: 600 }}>
              You pay
            </span>
            <span className="v" style={{ fontSize: 24 }}>
              {rupees(net)}
            </span>
          </div>
        </div>
        <div className="ruled" style={{ borderTop: 0 }}>
          <div>
            <span className="k">Pay from</span>
            <span style={{ fontWeight: 500 }}>{me.wallet?.handleMasked}</span>
          </div>
          {end ? (
            <div>
              <span className="k">Cover runs</span>
              <span style={{ fontWeight: 500 }}>Today to {day(end, true)}</span>
            </div>
          ) : null}
        </div>
        <p className="small">
          The premium goes to the insurer. FasalShield never holds your money.
        </p>
      </div>
      <div className="action">
        <PayButton id={id} label={`Pay ${rupees(net)} with UPI`} />
      </div>
    </main>
  );
}
