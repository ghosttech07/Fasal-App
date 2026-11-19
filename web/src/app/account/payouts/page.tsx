import { StepBoard } from '@/components/step-board';
import { phaseName, rupees, type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { applyBasisPoints } from '@fasalshield/shared';

/** The formula with the farmer's own numbers: cover × phase share × the payout at the middle mark. */
function WorkedSum({ p }: { p: Policy }) {
  const phase = p.phasePlan[0]!;
  const slab = p.slabs[Math.min(1, p.slabs.length - 1)]!;
  const flood = p.indexType === 'FLOOD_EXCESS_RAIN';
  const result = applyBasisPoints(phase.amountPaise, Math.round(slab.payoutPctOfPhase * 100));
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <p className="small" style={{ color: 'var(--ink)', fontSize: 16 }}>
        Example: rain in {phaseName(phase.id).toLowerCase()} reaches{' '}
        {flood
          ? `${slab.threshold} mm in ${p.rollingDays} days`
          : `${slab.threshold}% below normal`}
      </p>
      <div
        className="sum"
        role="img"
        aria-label={`${rupees(p.sumInsuredPaise)} cover times ${phase.weightPct}% ${phaseName(phase.id)} share times ${slab.payoutPctOfPhase}% at this mark equals ${rupees(result)}`}
      >
        <span className="term">
          <b>{rupees(p.sumInsuredPaise)}</b>
          <span>your cover</span>
        </span>
        <span className="op">×</span>
        <span className="term">
          <b>{phase.weightPct}%</b>
          <span>{phaseName(phase.id).toLowerCase()} share</span>
        </span>
        <span className="op">×</span>
        <span className="term">
          <b>{slab.payoutPctOfPhase}%</b>
          <span>at this mark</span>
        </span>
        <span className="op">=</span>
        <span className="term res">
          <b>{rupees(result)}</b>
          <span>to your UPI</span>
        </span>
      </div>
    </div>
  );
}

/** Plain-language payout rules, worked out on the farmer's own cover when they have one. */
export default async function PayoutRules() {
  const policies = await serverGet<Policy[]>('/policies');
  const p = policies.find((x) => x.peril === 'DROUGHT') ?? policies[0];

  return (
    <main className="screen">
      <StepBoard back={{ href: '/account', label: 'Account' }} title="How payouts are calculated" />
      <div className="work">
        {p && p.phasePlan[0] && p.slabs.length ? (
          <WorkedSum p={p} />
        ) : (
          <p className="lead" style={{ color: 'var(--ink)' }}>
            Payout = your cover × the phase&rsquo;s share × the payout for the mark the rain
            crossed.
          </p>
        )}
        <div className="steps">
          <div>
            <b>1</b>
            <span>Your cover grows with your field: a set amount per acre.</span>
          </div>
          <div>
            <b>2</b>
            <span>
              The season has phases (sowing, growth, grain filling). Each phase holds a share of
              your cover.
            </span>
          </div>
          <div>
            <b>3</b>
            <span>
              When rain crosses a mark in a phase, that phase pays the amount shown for the mark. A
              higher mark later pays only the difference.
            </span>
          </div>
          <div>
            <b>4</b>
            <span>
              The whole season never pays more than your cover. In a normal year nothing is paid.
            </span>
          </div>
          <div>
            <b>5</b>
            <span>
              Rain is measured by satellite for the area your field is in. Your own field can get a
              little more or less rain than the measurement.
            </span>
          </div>
        </div>

        {p ? (
          <>
            <h2 className="h2">
              Your {p.cropCode.toLowerCase()} cover, {rupees(p.sumInsuredPaise)}
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="pay-table">
                <thead>
                  <tr>
                    <th scope="col">Phase</th>
                    {p.slabs.map((s) => (
                      <th scope="col" key={s.level}>
                        {s.threshold}
                        {p.indexType === 'FLOOD_EXCESS_RAIN' ? ' mm' : '% less'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.phasePlan.map((x) => (
                    <tr key={x.id}>
                      <th scope="row">
                        {phaseName(x.id)}
                        <span>{rupees(x.amountPaise)}</span>
                      </th>
                      {p.slabs.map((s) => (
                        <td key={s.level}>
                          {rupees(
                            applyBasisPoints(x.amountPaise, Math.round(s.payoutPctOfPhase * 100)),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="small">Buy cover to see these numbers worked out for your own field.</p>
        )}
      </div>
    </main>
  );
}
