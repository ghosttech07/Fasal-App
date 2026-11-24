import Link from 'next/link';
import { rupees } from '@/lib/format';
import { adminGet, can, currentStaff, districtName, FAILURE_LABEL, since, when } from '@/lib/admin';
import { BatchDecision, SubmitBatch } from '@/components/admin/actions';
import { PageHead, Status, Unavailable } from '@/components/admin/ui';

type Payout = {
  id: string;
  status: string;
  amountPaise: number;
  upi: string | null;
  utr: string | null;
  failureReason: string | null;
  batch: string | null;
  slaDueAt: string;
  creditedAt: string | null;
  detectedAt: string;
  triggerEventId: string;
  product: string;
  phaseId: string;
  slabLevel: number;
  policyNumber: string | null;
  farmer: {
    id: string;
    name: string | null;
    phone: string;
    district: string | null;
    village: string | null;
  };
};
type Batch = {
  id: string;
  code: string;
  status: string;
  count: number;
  totalPaise: number;
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  note: string | null;
  credited: number;
  failed: number;
};

const FILTERS = [
  ['', 'All'],
  ['AWAITING_BATCH', 'Waiting for batch'],
  ['QUEUED', 'In a batch'],
  ['SUCCESS', 'Credited'],
  ['failed', 'Failed'],
] as const;

/** A4: maker-checker payouts. Claims ops submit; a different payout approver approves with a fresh code. */
export default async function Payouts({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = '' } = await searchParams;
  const [me, list, waiting, batches] = await Promise.all([
    currentStaff(),
    adminGet<{ payouts: Payout[] }>(
      `payouts${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),
    adminGet<{ payouts: Payout[] }>('payouts?status=AWAITING_BATCH'),
    adminGet<{ batches: Batch[] }>('batches'),
  ]);
  if (!me || !list || !waiting || !batches) return <Unavailable />;
  const waitingTotal = waiting.payouts.reduce((s, p) => s + p.amountPaise, 0);
  const pending = batches.batches.filter((b) => b.status === 'SUBMITTED');

  return (
    <>
      <PageHead
        title="Payouts"
        sub="One person submits a batch; a different person approves it with a fresh code. Every step is in the audit log."
      >
        {can.submitPayouts(me.role) ? (
          <SubmitBatch waiting={waiting.payouts.length} totalLabel={rupees(waitingTotal)} />
        ) : null}
      </PageHead>

      <section className="adm-card" aria-labelledby="b-h">
        <h2 id="b-h">
          Batches <small>{pending.length} waiting for approval</small>
        </h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th className="num">Farmers</th>
                <th className="num">Amount</th>
                <th>Submitted</th>
                <th>Approved</th>
                <th>Result</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {batches.batches.length ? (
                batches.batches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <b>{b.code}</b>
                      <br />
                      <Status value={b.status} />
                    </td>
                    <td className="num">{b.count}</td>
                    <td className="num">{rupees(b.totalPaise)}</td>
                    <td>
                      {b.submittedBy}
                      <br />
                      <span className="adm-muted">{when(b.submittedAt)}</span>
                    </td>
                    <td>
                      {b.approvedBy ?? '—'}
                      {b.approvedAt ? (
                        <>
                          <br />
                          <span className="adm-muted">{when(b.approvedAt)}</span>
                        </>
                      ) : null}
                      {b.note ? (
                        <>
                          <br />
                          <span className="adm-muted">“{b.note}”</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {b.status === 'SENT' ? (
                        <>
                          {b.credited} credited
                          {b.failed ? (
                            <>
                              , <span className="adm-err">{b.failed} need action</span>
                            </>
                          ) : null}
                        </>
                      ) : b.status === 'SUBMITTED' ? (
                        `waiting ${since(b.submittedAt)}`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {b.status === 'SUBMITTED' && can.approvePayouts(me.role) ? (
                        b.submittedById === me.id ? (
                          <span className="adm-muted">
                            You submitted this; another approver must approve
                          </span>
                        ) : (
                          <BatchDecision
                            id={b.id}
                            code={b.code}
                            count={b.count}
                            totalLabel={rupees(b.totalPaise)}
                          />
                        )
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="adm-empty">
                    No batches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adm-card adm-stack" aria-labelledby="p-h">
        <h2 id="p-h">Payouts</h2>
        <nav className="adm-tools" aria-label="Filter payouts">
          {FILTERS.map(([v, l]) => (
            <Link
              key={v}
              href={v ? `/admin/payouts?status=${v}` : '/admin/payouts'}
              className={`adm-btn ${status === v ? '' : 'line'}`}
              aria-current={status === v ? 'page' : undefined}
            >
              {l}
            </Link>
          ))}
        </nav>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Cover</th>
                <th className="num">Amount</th>
                <th>UPI ID</th>
                <th>Status</th>
                <th>Detected</th>
                <th>Credited / due</th>
              </tr>
            </thead>
            <tbody>
              {list.payouts.length ? (
                list.payouts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/farmers/${p.farmer.id}`}>
                        {p.farmer.name ?? 'Unnamed farmer'}
                      </Link>
                      <br />
                      <span className="adm-muted">
                        {p.farmer.village ? `${p.farmer.village}, ` : ''}
                        {districtName(p.farmer.district)} · {p.farmer.phone}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/triggers/${p.triggerEventId}`}>{p.product}</Link>
                      <br />
                      <span className="adm-muted">
                        {p.phaseId.replace(/^P\d_/, '').toLowerCase()} · mark {p.slabLevel}
                      </span>
                    </td>
                    <td className="num">{rupees(p.amountPaise)}</td>
                    <td>{p.upi ?? <span className="adm-err">None</span>}</td>
                    <td>
                      <Status value={p.status} />
                      {p.failureReason ? (
                        <>
                          <br />
                          <span className="adm-err">
                            {FAILURE_LABEL[p.failureReason] ?? p.failureReason}
                          </span>
                        </>
                      ) : null}
                      {p.batch ? (
                        <>
                          <br />
                          <span className="adm-muted">{p.batch}</span>
                        </>
                      ) : null}
                    </td>
                    <td className="adm-muted">{when(p.detectedAt)}</td>
                    <td>
                      {p.creditedAt ? (
                        <>
                          {when(p.creditedAt)}
                          <br />
                          <span className="adm-muted">UTR {p.utr}</span>
                        </>
                      ) : (
                        <span className="adm-muted">due by {when(p.slaDueAt)}</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="adm-empty">
                    No payouts here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
