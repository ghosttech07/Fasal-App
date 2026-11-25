import { StepBoard } from '@/components/step-board';
import { phaseName, rupees, type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { getT } from '@/i18n/server';
import type { Key, T } from '@/i18n';
import { applyBasisPoints } from '@fasalshield/shared';

/** The formula with the farmer's own numbers: cover × phase share × the payout at the middle mark. */
function WorkedSum({ p, t }: { p: Policy; t: T }) {
  const phase = p.phasePlan[0]!;
  const slab = p.slabs[Math.min(1, p.slabs.length - 1)]!;
  const flood = p.indexType === 'FLOOD_EXCESS_RAIN';
  const result = applyBasisPoints(phase.amountPaise, Math.round(slab.payoutPctOfPhase * 100));
  const ph = t(`phase.${phase.id}` as Key) || phaseName(phase.id);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <p className="small" style={{ color: 'var(--ink)', fontSize: 16 }}>
        {t('rules.example', {
          phase: ph,
          level: flood
            ? t('choose.mmDays', { mm: slab.threshold, n: p.rollingDays ?? 3 })
            : t('pol.belowNormal', { pct: slab.threshold }),
        })}
      </p>
      <div
        className="sum"
        role="img"
        aria-label={`${rupees(p.sumInsuredPaise)} × ${phase.weightPct}% × ${slab.payoutPctOfPhase}% = ${rupees(result)}`}
      >
        <span className="term">
          <b>{rupees(p.sumInsuredPaise)}</b>
          <span>{t('rules.yourCover')}</span>
        </span>
        <span className="op">×</span>
        <span className="term">
          <b>{phase.weightPct}%</b>
          <span>{t('rules.share', { phase: ph })}</span>
        </span>
        <span className="op">×</span>
        <span className="term">
          <b>{slab.payoutPctOfPhase}%</b>
          <span>{t('rules.atMark')}</span>
        </span>
        <span className="op">=</span>
        <span className="term res">
          <b>{rupees(result)}</b>
          <span>{t('rules.toUpi')}</span>
        </span>
      </div>
    </div>
  );
}

/** Plain-language payout rules, worked out on the farmer's own cover when they have one. */
export default async function PayoutRules() {
  const policies = await serverGet<Policy[]>('/policies');
  const { t } = await getT();
  const p = policies.find((x) => x.peril === 'DROUGHT') ?? policies[0];

  return (
    <main className="screen">
      <StepBoard back={{ href: '/account', label: t('c.account') }} title={t('acc.rules')} />
      <div className="work">
        {p && p.phasePlan[0] && p.slabs.length ? (
          <WorkedSum p={p} t={t} />
        ) : (
          <p className="lead" style={{ color: 'var(--ink)' }}>
            {t('rules.formula')}
          </p>
        )}
        <div className="steps">
          <div>
            <b>1</b>
            <span>{t('rules.1')}</span>
          </div>
          <div>
            <b>2</b>
            <span>{t('rules.2')}</span>
          </div>
          <div>
            <b>3</b>
            <span>{t('rules.3')}</span>
          </div>
          <div>
            <b>4</b>
            <span>{t('rules.4')}</span>
          </div>
          <div>
            <b>5</b>
            <span>{t('rules.5')}</span>
          </div>
        </div>

        {p ? (
          <>
            <h2 className="h2">
              {t('rules.yours', {
                crop: t(`crop.${p.cropCode}` as Key),
                amt: rupees(p.sumInsuredPaise),
              })}
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="pay-table">
                <thead>
                  <tr>
                    <th scope="col">{t('rules.phase')}</th>
                    {p.slabs.map((s) => (
                      <th scope="col" key={s.level}>
                        {s.threshold}
                        {p.indexType === 'FLOOD_EXCESS_RAIN' ? ' mm' : t('rules.less')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.phasePlan.map((x) => (
                    <tr key={x.id}>
                      <th scope="row">
                        {t(`phase.${x.id}` as Key) || phaseName(x.id)}
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
          <p className="small">{t('rules.buy')}</p>
        )}
      </div>
    </main>
  );
}
