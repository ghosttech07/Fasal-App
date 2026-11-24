import Link from 'next/link';
import { adminGet, when } from '@/lib/admin';
import { VerifyChain } from '@/components/admin/actions';
import { PageHead, Unavailable } from '@/components/admin/ui';

type Entry = {
  seq: number;
  at: string;
  actorType: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  hash: string;
};

const ACTIONS = [
  'STAFF_LOGIN',
  'STAFF_LOGIN_FAILED',
  'BATCH_SUBMITTED',
  'BATCH_APPROVED',
  'PAYOUT_CREDITED',
  'PAYOUT_FAILED',
  'TRIGGER_DETECTED',
  'VERSION_PUBLISHED',
  'FARMER_VIEWED',
  'STAFF_CREATED',
  'STAFF_UPDATED',
];

/** A7: append-only, hash-chained record of every action. */
export default async function Audit({
  searchParams,
}: {
  searchParams: Promise<{ before?: string; action?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => !!v) as [string, string][],
  ).toString();
  const d = await adminGet<{ total: number; entries: Entry[]; nextBefore: number | null }>(
    `audit${qs ? `?${qs}` : ''}`,
  );
  if (!d) return <Unavailable />;
  return (
    <>
      <PageHead
        title="Audit log"
        sub={`${d.total.toLocaleString('en-IN')} entries. Append-only; each entry is chained to the one before, so a change anywhere breaks the chain.`}
      >
        <VerifyChain />
      </PageHead>
      <form className="adm-tools">
        <select name="action" defaultValue={sp.action ?? ''} aria-label="Action">
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a.toLowerCase().replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <button className="adm-btn" type="submit">
          Filter
        </button>
      </form>
      <section className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Item</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {d.entries.map((e) => (
                <tr key={e.seq}>
                  <td className="num adm-muted">{e.seq}</td>
                  <td>{when(e.at)}</td>
                  <td>{e.actor}</td>
                  <td>{e.action.toLowerCase().replace(/_/g, ' ')}</td>
                  <td className="adm-muted">
                    {e.entityType}
                    {e.entityId ? ` ${e.entityId.slice(0, 8)}` : ''}
                  </td>
                  <td className="adm-hash">{e.hash.slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.nextBefore ? (
          <p style={{ margin: '12px 0 0' }}>
            <Link
              className="adm-btn line"
              href={`/admin/audit?before=${d.nextBefore}${sp.action ? `&action=${sp.action}` : ''}`}
            >
              Older entries
            </Link>
          </p>
        ) : null}
      </section>
    </>
  );
}
