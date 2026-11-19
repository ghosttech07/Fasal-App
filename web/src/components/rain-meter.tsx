import { applyBasisPoints } from '@fasalshield/shared';
import { num1, rupees, type PhaseStatus, type Slab } from '@/lib/format';

/**
 * The signature: today's rain reading against the posted payout marks, each mark labelled with its rupees.
 * Drought: fill = % below normal (0–100). Flood: fill = heaviest N-day rain on a scale 15% past the top mark.
 */
export function RainMeter({ phase, slabs, phaseAmountPaise, flood, rollingDays }: { phase: PhaseStatus; slabs: Slab[]; phaseAmountPaise: number; flood: boolean; rollingDays: number }) {
  if (phase.indexValue === null) {
    return (
      <div className="meter">
        <div className="read">
          <span className="big fig" style={{ fontSize: 30 }}>
            Waiting for rain data
          </span>
        </div>
        <p className="board-sub">Satellite readings for your field arrive within a day.</p>
      </div>
    );
  }
  const index = phase.indexValue;
  const top = flood ? (slabs.at(-1)?.threshold ?? 100) * 1.15 : 100;
  const pos = (v: number) => `${Math.min(100, (v / top) * 100)}%`;
  const passed = (t: number) => index >= t;
  const summary = flood
    ? `Heaviest ${rollingDays}-day rain is ${num1(index)} mm.`
    : `Rain is ${num1(index)}% below normal.`;
  const marks = slabs.map((s) => `${s.threshold}${flood ? ' mm' : '%'} pays ${rupees(applyBasisPoints(phaseAmountPaise, Math.round(s.payoutPctOfPhase * 100)))}${passed(s.threshold) ? ', passed' : ''}`).join('; ');

  return (
    <div className={`meter${flood ? ' flood' : ''}`} role="img" aria-label={`${summary} Payout marks: ${marks}.`}>
      <div className="read">
        <span className="big fig">{flood ? `${num1(index)} mm` : `${num1(index)}%`}</span>
        <span className="unit">{flood ? `heaviest rain in ${rollingDays} days` : 'less rain than normal'}</span>
      </div>
      <div className="track" aria-hidden="true">
        <div className="fill" style={{ width: pos(index) }} />
        {slabs.map((s) => (
          <div key={s.level} className={`tk${passed(s.threshold) ? ' hit' : ''}`} style={{ left: pos(s.threshold) }}>
            <span>
              {s.threshold}
              {flood ? ' mm' : '%'}
              <b>{rupees(applyBasisPoints(phaseAmountPaise, Math.round(s.payoutPctOfPhase * 100)))}</b>
            </span>
          </div>
        ))}
      </div>
      <p className="board-sub" style={{ fontSize: 15 }}>
        {flood ? `${num1(phase.observedMm)} mm fell so far this season` : `${num1(phase.observedMm)} mm fell · normal by now is ${num1(phase.normalMm)} mm`}
      </p>
    </div>
  );
}
