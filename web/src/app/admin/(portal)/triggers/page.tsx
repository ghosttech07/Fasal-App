import Link from 'next/link';
import { rupees } from '@/lib/format';
import { adminGet, districtName, when } from '@/lib/admin';
import { PageHead, Peril, Status, Unavailable } from '@/components/admin/ui';

type Ev = {
  id: string;
  detectedAt: string;
  status: string;
  peril: string;
  phaseId: string;
  slabLevel: number;
  indexValue: number;
  threshold: number;
  amountPaise: number;
  payoutStatus: string | null;
  product: string;
  farmer: string | null;
  district: string | null;
  village: string | null;
  policyNumber: string | null;
};

/** A4: every mark passed, newest first. Each opens to its evidence. */
export default async function Triggers() {
  const data = await adminGet<{ events: Ev[] }>('triggers');
  if (!data) return <Unavailable />;
  return (
    <>
      <PageHead
        title="Trigger events"
        sub="Each time a policy's rain passed a mark. Open one to see the evidence and why it paid."
      />
      <section className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Detected</th>
                <th>Farmer</th>
                <th>Cover</th>
                <th className="num">Index</th>
                <th className="num">Amount</th>
                <th>Event</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody>
              {data.events.length ? (
                data.events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/admin/triggers/${e.id}`}>{when(e.detectedAt)}</Link>
                    </td>
                    <td>
                      {e.farmer ?? 'Unnamed farmer'}
                      <br />
                      <span className="adm-muted">
                        {e.village ? `${e.village}, ` : ''}
                        {districtName(e.district)}
                      </span>
                    </td>
                    <td>
                      <Peril value={e.peril} /> {e.phaseId.replace(/^P\d_/, '').toLowerCase()}
                      <br />
                      <span className="adm-muted">
                        {e.policyNumber} · mark {e.slabLevel}
                      </span>
                    </td>
                    <td className="num">
                      {e.indexValue.toFixed(1)}
                      <br />
                      <span className="adm-muted">mark {e.threshold}</span>
                    </td>
                    <td className="num">{rupees(e.amountPaise)}</td>
                    <td>
                      <Status value={e.status} />
                    </td>
                    <td>
                      <Status value={e.payoutStatus} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="adm-empty">
                    No marks passed yet this season.
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
