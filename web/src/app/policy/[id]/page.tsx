import { Clock, Check } from 'lucide-react';
import { StepBoard } from '@/components/step-board';
import { applyBasisPoints } from '@fasalshield/shared';
import {
  PAYOUT_WORDS,
  day,
  daysBetween,
  en,
  num1,
  phaseName,
  rupees,
  todayIso,
  type Policy,
} from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { getT } from '@/i18n/server';
import type { Key } from '@/i18n';

export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await serverGet<Policy>(`/policies/${id}`);
  const flood = p.indexType === 'FLOOD_EXCESS_RAIN';
  const first = p.phasePlan[0]!;
  const last = p.phasePlan.at(-1)!;
  const total = daysBetween(first.from, last.to);
  const today = todayIso();
  const { t, lang } = await getT();
  const ph = (id: string) => t(`phase.${id}` as Key) || phaseName(id);
  const todayPct = Math.min(100, Math.max(0, ((daysBetween(first.from, today) - 1) / total) * 100));

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/', label: t('c.home') }}
        title={`${t(`prod.${p.peril}` as Key)}, ${t(`crop.${p.cropCode}` as Key)}`}
      >
        <div
          className="tl"
          role="img"
          aria-label={`Season timeline from ${day(first.from, false, lang)} to ${day(last.to, false, lang)}. ${p.phasePlan.map((x) => `${ph(x.id)} ${daysBetween(x.from, x.to)} days`).join(', ')}.`}
        >
          <div className="bar">
            {p.phasePlan.map((x) => (
              <i
                key={x.id}
                className={x.from <= today && today <= x.to ? 'now' : ''}
                style={{ flex: daysBetween(x.from, x.to) }}
              />
            ))}
            {today >= first.from && today <= last.to ? (
              <span className="today" style={{ left: `${todayPct}%` }} />
            ) : null}
          </div>
          <div className="lab">
            {p.phasePlan.map((x) => (
              <span key={x.id}>{day(x.from, false, lang)}</span>
            ))}
            <span>{day(last.to, false, lang)}</span>
          </div>
        </div>
        <p className="board-sub fig" style={{ fontSize: 15 }}>
          {t('pol.policy', { no: p.policyNumber ?? '', amt: rupees(p.sumInsuredPaise) })}
        </p>
      </StepBoard>

      <div className="work" style={{ gap: 0, paddingTop: 6 }}>
        {p.phasePlan.map((x) => {
          const s = p.phases.find((ph) => ph.phaseId === x.id);
          const paid = p.triggerEvents
            .filter((e) => e.phaseId === x.id)
            .reduce((sum, e) => sum + e.payoutAmountPaise, 0);
          const passed = s?.triggeredLevel ?? 0;
          let line: string;
          if (!s || s.state === 'UPCOMING')
            line = t('pol.startsIn', {
              n: daysBetween(today, x.from) - 1,
              amt: rupees(x.amountPaise),
            });
          else if (s.indexValue === null) line = t('meter.wait');
          else
            line = `${flood ? t('choose.mmDays', { mm: num1(s.indexValue), n: p.rollingDays ?? 3 }) : t('pol.lessRain', { pct: num1(s.indexValue) })}${passed ? ` · ${passed > 1 ? t('pol.marks', { n: passed }) : t('pol.mark1')}` : ''}`;
          const next = p.slabs.find((sl) => sl.level > passed);
          return (
            <div className="phase" key={x.id}>
              <div className="t">
                {ph(x.id)}
                <span>
                  {day(x.from, false, lang)} – {day(x.to, false, lang)}
                </span>
              </div>
              <div className="r">
                <span>{line}</span>
                {paid ? <b>{rupees(paid)}</b> : null}
              </div>
              {s && s.state === 'IN_PROGRESS' && next ? (
                <span className="small">
                  {t('pol.next', {
                    mark: flood
                      ? `${next.threshold} mm`
                      : t('pol.belowNormal', { pct: next.threshold }),
                    amt: rupees(
                      applyBasisPoints(x.amountPaise, Math.round(next.payoutPctOfPhase * 100)),
                    ),
                  })}
                </span>
              ) : null}
            </div>
          );
        })}

        <div style={{ display: 'grid', gap: 8, paddingTop: 16 }}>
          <h2 className="h2" style={{ fontSize: 21 }}>
            {t('pol.payouts')}
          </h2>
          {p.triggerEvents.length === 0 ? <p className="small">{t('pol.none')}</p> : null}
          {p.triggerEvents.map((e) => (
            <div className="money quiet" key={e.id}>
              <div style={{ display: 'grid', gap: 4, flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span className="amt">{rupees(e.payoutAmountPaise)}</span>
                  <span className={`tag${e.payoutStatus === 'SUCCESS' ? '' : ' tag-warn'}`}>
                    {e.payoutStatus === 'SUCCESS' ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      <Clock size={14} aria-hidden="true" />
                    )}
                    {PAYOUT_WORDS[e.payoutStatus ?? '']
                      ? t(`pw.${e.payoutStatus}` as Key)
                      : t('pw.other')}
                  </span>
                </div>
                <span className="s">
                  {ph(e.phaseId)} ·{' '}
                  {flood
                    ? `${num1(e.indexValue)} mm`
                    : t('pol.belowNormal', { pct: num1(e.indexValue) })}{' '}
                  · {t('pol.checked', { date: day(e.detectedAt, false, lang) })}
                </span>
              </div>
            </div>
          ))}
          <a
            className="small"
            href={`/help?policy=${p.id}`}
            style={{
              color: 'var(--board)',
              fontWeight: 600,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {t('pol.help')}
          </a>
        </div>
      </div>
    </main>
  );
}
