import { StepBoard } from '@/components/step-board';
import { phaseName, rupees, type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { applyBasisPoints } from '@fasalshield/shared';

/** Plain-language payout rules, worked out on the farmer's own cover when they have one. */
export default async function PayoutRules() {
  const policies = await serverGet<Policy[]>('/policies');
  const p = policies.find((x) => x.peril === 'DROUGHT') ?? policies[0];

  return (
    <main className="screen">
      <StepBoard back={{ href: '/account', label: 'Account' }} title="How payouts are calculated" />
      <div className="work">
        <p className="lead" style={{ color: 'var(--ink)' }}>
          Payout = your cover × the phase&rsquo;s share × the payout for the mark the rain crossed.
        </p>
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
