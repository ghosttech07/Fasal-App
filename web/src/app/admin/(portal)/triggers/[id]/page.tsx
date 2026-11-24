import Link from 'next/link';
import { rupees } from '@/lib/format';
import { adminGet, districtName, FAILURE_LABEL, when } from '@/lib/admin';
import { PageHead, Peril, Status, Unavailable } from '@/components/admin/ui';

type Detail = {
  event: {
    id: string;
    detectedAt: string;
    status: string;
    peril: string;
    phaseId: string;
    slabLevel: number;
    indexValue: number;
    threshold: number;
    amountPaise: number;
    engineVersion: string;
    evidenceSha256: string;
    evidenceOk: boolean | null;
    evidence: unknown;
  };
  rule: {
    product: string;
    code: string;
    version: number;
    rulesSha256: string | null;
    rulesOk: boolean | null;
    rules: {
      phases?: { id: string; weightPct: number; from: string; to: string }[];
      slabs?: { level: number; threshold: number; payoutPctOfPhase: number }[];
    };
  };
  policy: {
    number: string | null;
    cropCode: string;
    sumInsuredPaise: number;
    acres: number | null;
    gridCell: { id: number; lat: number; lng: number };
  };
  farmer: {
    id: string;
    name: string | null;
    phone: string;
    district: string | null;
    village: string | null;
  };
  payout: {
    status: string;
    amountPaise: number;
    upi: string | null;
    utr: string | null;
    creditedAt: string | null;
    slaDueAt: string;
    batch: string | null;
    failureReason: string | null;
  } | null;
  timeline: { at: string; action: string; actor: string }[];
};

const ACTION: Record<string, string> = {
  TRIGGER_DETECTED: 'Mark passed, detected by the daily check',
  BATCH_SUBMITTED: 'Put in a payout batch',
  BATCH_APPROVED: 'Batch approved',
  BATCH_REJECTED: 'Batch rejected',
  PAYOUT_CREDITED: 'Money credited to UPI',
  PAYOUT_FAILED: 'Payment failed',
};

/** Why a farmer was paid: the numbers, the rule, the hashes and the full timeline. */
export default async function TriggerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await adminGet<Detail>(`triggers/${encodeURIComponent(id)}`);
  if (!d) return <Unavailable />;
  const { event: e, rule, policy, farmer, payout } = d;
  const phase = rule.rules.phases?.find((p) => p.id === e.phaseId);
  const slab = rule.rules.slabs?.find((s) => s.level === e.slabLevel);
  const drought = e.peril === 'DROUGHT';
  return (
    <>
      <PageHead
        title={`Trigger event`}
        sub="Why this farmer was paid: the evidence was stored and hashed when the event was detected."
      >
        <Link href="/admin/triggers" className="adm-btn line">
          All events
        </Link>
      </PageHead>
      <div className="adm-two" style={{ marginTop: 0 }}>
        <section className="adm-card">
          <h2>
            <Link href={`/admin/farmers/${farmer.id}`}>{farmer.name ?? 'Unnamed farmer'}</Link>{' '}
            <small>
              {policy.cropCode.toLowerCase()} · {policy.acres ?? '?'} acres ·{' '}
              {farmer.village ? `${farmer.village}, ` : ''}
              {districtName(farmer.district)}
            </small>
          </h2>
          <p style={{ margin: '0 0 10px' }}>
            <Peril value={e.peril} /> <Status value={e.status} />{' '}
            <span className="adm-muted">policy {policy.number}</span>
          </p>
          <div className="adm-evidence">
            <div>
              <small>{drought ? 'Rain below normal' : 'Rain in 3 days'}</small>
              <b>{drought ? `${e.indexValue.toFixed(1)}%` : `${e.indexValue.toFixed(1)} mm`}</b>
            </div>
            <div>
              <small>Mark {e.slabLevel} at</small>
              <b>{drought ? `${e.threshold}%` : `${e.threshold} mm`}</b>
            </div>
            <div>
              <small>Paid</small>
              <b>{rupees(e.amountPaise)}</b>
            </div>
          </div>
          <table className="adm-table">
            <tbody>
              <tr>
                <td className="adm-muted">Rule</td>
                <td>
                  {rule.product} v{rule.version} ·{' '}
                  {phase
                    ? `${e.phaseId.replace(/^P\d_/, '').toLowerCase()} phase (${phase.weightPct}%, ${phase.from} to ${phase.to})`
                    : e.phaseId}
                  {slab ? ` · mark ${slab.level} pays ${slab.payoutPctOfPhase}%` : ''}
                </td>
              </tr>
              <tr>
                <td className="adm-muted">Working</td>
                <td>
                  {rupees(policy.sumInsuredPaise)} cover
                  {phase ? ` × ${phase.weightPct}% phase` : ''}
                  {slab ? ` × ${slab.payoutPctOfPhase}%` : ''} = {rupees(e.amountPaise)}
                </td>
              </tr>
              <tr>
                <td className="adm-muted">Grid cell</td>
                <td>
                  {policy.gridCell.lat.toFixed(2)}° N, {policy.gridCell.lng.toFixed(2)}° E · 0.05°
                  (about 5 km)
                </td>
              </tr>
              <tr>
                <td className="adm-muted">Engine</td>
                <td>{e.engineVersion}</td>
              </tr>
              <tr>
                <td className="adm-muted">Rule hash</td>
                <td className="adm-hash">
                  {rule.rulesSha256 ?? 'not hashed'}{' '}
                  {rule.rulesOk === true ? '✓ matches' : rule.rulesOk === false ? '✗ CHANGED' : ''}
                </td>
              </tr>
              <tr>
                <td className="adm-muted">Evidence hash</td>
                <td className="adm-hash">
                  {e.evidenceSha256}{' '}
                  {e.evidenceOk === true
                    ? '✓ verified now'
                    : e.evidenceOk === false
                      ? '✗ DOES NOT MATCH'
                      : ''}
                </td>
              </tr>
            </tbody>
          </table>
          {e.evidenceOk === false || rule.rulesOk === false ? (
            <p className="adm-note" role="alert">
              A hash does not match. Stop payouts for this event and report it.
            </p>
          ) : null}
        </section>
        <section className="adm-card">
          <h2>Payout</h2>
          {payout ? (
            <dl className="adm-kv" style={{ marginBottom: 16 }}>
              <dt>Status</dt>
              <dd>
                <Status value={payout.status} />
                {payout.failureReason ? (
                  <>
                    {' '}
                    <span className="adm-err">
                      {FAILURE_LABEL[payout.failureReason] ?? payout.failureReason}
                    </span>
                  </>
                ) : null}
              </dd>
              <dt>To</dt>
              <dd>{payout.upi ?? 'No UPI ID'}</dd>
              <dt>Batch</dt>
              <dd>{payout.batch ?? '—'}</dd>
              <dt>Credited</dt>
              <dd>
                {payout.creditedAt
                  ? `${when(payout.creditedAt)} · UTR ${payout.utr}`
                  : `due by ${when(payout.slaDueAt)}`}
              </dd>
            </dl>
          ) : (
            <p className="adm-muted">No payout recorded.</p>
          )}
          <h2>Timeline</h2>
          {d.timeline.map((t, i) => (
            <div className="adm-alert" key={i}>
              <i
                style={{
                  background:
                    t.action.includes('FAIL') || t.action.includes('REJECT')
                      ? 'var(--danger)'
                      : '#15803d',
                }}
              />
              <div>
                <b>{ACTION[t.action] ?? t.action}</b>
                <br />
                <span className="adm-muted">
                  {when(t.at)} · {t.actor}
                </span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
