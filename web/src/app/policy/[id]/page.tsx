import { Clock, Check } from 'lucide-react';
import { StepBoard } from '@/components/step-board';
import { applyBasisPoints } from '@fasalshield/shared';
import { PAYOUT_WORDS, day, daysBetween, en, num1, phaseName, rupees, todayIso, type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';

export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await serverGet<Policy>(`/policies/${id}`);
  const flood = p.indexType === 'FLOOD_EXCESS_RAIN';
  const first = p.phasePlan[0]!;
  const last = p.phasePlan.at(-1)!;
  const total = daysBetween(first.from, last.to);
  const today = todayIso();
  const todayPct = Math.min(100, Math.max(0, ((daysBetween(first.from, today) - 1) / total) * 100));

  return (
    <main className="screen">
      <StepBoard back={{ href: '/', label: 'Home' }} title={`${en(p.names)}, ${p.cropCode.toLowerCase()}`}>
        <div className="tl" role="img" aria-label={`Season timeline from ${day(first.from)} to ${day(last.to)}. ${p.phasePlan.map((x) => `${phaseName(x.id)} ${daysBetween(x.from, x.to)} days`).join(', ')}.`}>
          <div className="bar">
            {p.phasePlan.map((x) => (
              <i key={x.id} className={x.from <= today && today <= x.to ? 'now' : ''} style={{ flex: daysBetween(x.from, x.to) }} />
            ))}
            {today >= first.from && today <= last.to ? <span className="today" style={{ left: `${todayPct}%` }} /> : null}
          </div>
          <div className="lab">
            {p.phasePlan.map((x) => (
              <span key={x.id}>{day(x.from)}</span>
            ))}
            <span>{day(last.to)}</span>
          </div>
        </div>
        <p className="board-sub fig" style={{ fontSize: 15 }}>
          Policy {p.policyNumber} · cover {rupees(p.sumInsuredPaise)}
        </p>
      </StepBoard>

      <div className="work" style={{ gap: 0, paddingTop: 6 }}>
        {p.phasePlan.map((x) => {
          const s = p.phases.find((ph) => ph.phaseId === x.id);
          const paid = p.triggerEvents.filter((e) => e.phaseId === x.id).reduce((sum, e) => sum + e.payoutAmountPaise, 0);
          const passed = s?.triggeredLevel ?? 0;
          let line: string;
          if (!s || s.state === 'UPCOMING') line = `Starts in ${daysBetween(today, x.from) - 1} days · up to ${rupees(x.amountPaise)}`;
          else if (s.indexValue === null) line = 'Waiting for rain data';
          else line = `${flood ? `${num1(s.indexValue)} mm in ${p.rollingDays} days` : `${num1(s.indexValue)}% less rain`}${passed ? ` · ${passed} mark${passed > 1 ? 's' : ''} passed` : ''}`;
          const next = p.slabs.find((sl) => sl.level > passed);
          return (
            <div className="phase" key={x.id}>
              <div className="t">
                {phaseName(x.id)}
                <span>
                  {day(x.from)} – {day(x.to)}
                </span>
              </div>
              <div className="r">
                <span>{line}</span>
                {paid ? <b>{rupees(paid)}</b> : null}
              </div>
              {s && s.state === 'IN_PROGRESS' && next ? (
                <span className="small">
                  Next payout at {next.threshold}
                  {flood ? ' mm' : '% below normal'}: {rupees(applyBasisPoints(x.amountPaise, Math.round(next.payoutPctOfPhase * 100)))}
                </span>
              ) : null}
            </div>
          );
        })}

        <div style={{ display: 'grid', gap: 8, paddingTop: 16 }}>
          <h2 className="h2" style={{ fontSize: 21 }}>
            Payouts
          </h2>
          {p.triggerEvents.length === 0 ? <p className="small">No payout yet. If rain crosses a mark, it shows here the same day.</p> : null}
          {p.triggerEvents.map((e) => (
            <div className="money quiet" key={e.id}>
              <div style={{ display: 'grid', gap: 4, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span className="amt">{rupees(e.payoutAmountPaise)}</span>
                  <span className={`tag${e.payoutStatus === 'SUCCESS' ? '' : ' tag-warn'}`}>
                    {e.payoutStatus === 'SUCCESS' ? <Check size={14} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />}
                    {PAYOUT_WORDS[e.payoutStatus ?? ''] ?? 'Processing'}
                  </span>
                </div>
                <span className="s">
                  {phaseName(e.phaseId)} · {flood ? `${num1(e.indexValue)} mm` : `${num1(e.indexValue)}% below normal`} · checked {day(e.detectedAt)} by satellite
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
