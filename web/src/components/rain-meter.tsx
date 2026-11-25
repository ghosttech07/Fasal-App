import { applyBasisPoints } from '@fasalshield/shared';
import { num1, rupees, type PhaseStatus, type Slab } from '@/lib/format';
import type { T } from '@/i18n';

/**
 * The signature: today's rain reading against the posted payout marks, each mark labelled with its rupees.
 * Drought: fill = % below normal (0–100). Flood: fill = heaviest N-day rain on a scale 15% past the top mark.
 */
export function RainMeter({
  phase,
  slabs,
  phaseAmountPaise,
  flood,
  rollingDays,
  t,
}: {
  phase: PhaseStatus;
  slabs: Slab[];
  phaseAmountPaise: number;
  flood: boolean;
  rollingDays: number;
  t: T;
}) {
  if (phase.indexValue === null) {
    return (
      <div className="meter">
        <div className="read">
          <span className="big fig" style={{ fontSize: 30 }}>
            {t('meter.wait')}
          </span>
        </div>
        <p className="board-sub">{t('meter.waitSub')}</p>
      </div>
    );
  }
  const index = phase.indexValue;
  const top = flood ? (slabs.at(-1)?.threshold ?? 100) * 1.15 : 100;
  const pos = (v: number) => `${Math.min(100, (v / top) * 100)}%`;
  const passed = (t: number) => index >= t;
  const summary = flood
    ? `${num1(index)} mm, ${t('meter.heaviest', { n: rollingDays })}.`
    : `${num1(index)}%, ${t('meter.less')}.`;
  const marks = slabs
    .map(
      (s) =>
        `${s.threshold}${flood ? ' mm' : '%'} pays ${rupees(applyBasisPoints(phaseAmountPaise, Math.round(s.payoutPctOfPhase * 100)))}${passed(s.threshold) ? ', passed' : ''}`,
    )
    .join('; ');

  return (
    <div className={`meter${flood ? ' flood' : ''}`} role="img" aria-label={`${summary} ${marks}.`}>
      <div className="read">
        <span className="big fig">{flood ? `${num1(index)} mm` : `${num1(index)}%`}</span>
        <span className="unit">
          {flood ? t('meter.heaviest', { n: rollingDays }) : t('meter.less')}
        </span>
      </div>
      <div className="track" aria-hidden="true">
        <div className="fill" style={{ width: pos(index) }} />
        {slabs.map((s) => (
          <div
            key={s.level}
            className={`tk${passed(s.threshold) ? ' hit' : ''}`}
            style={{ left: pos(s.threshold) }}
          >
            <span>
              {s.threshold}
              {flood ? ' mm' : '%'}
              <b>
                {rupees(applyBasisPoints(phaseAmountPaise, Math.round(s.payoutPctOfPhase * 100)))}
              </b>
            </span>
          </div>
        ))}
      </div>
      <p className="board-sub" style={{ fontSize: 15 }}>
        {flood
          ? t('meter.fellSeason', { mm: num1(phase.observedMm) })
          : t('meter.fellNormal', { mm: num1(phase.observedMm), normal: num1(phase.normalMm) })}
      </p>
    </div>
  );
}
