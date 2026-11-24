import Link from 'next/link';
import { adminGet, can, currentStaff, districtName, when } from '@/lib/admin';
import { AnswerGrievance } from '@/components/admin/actions';
import { PageHead, Status, Unavailable } from '@/components/admin/ui';

type Row = {
  id: string;
  ticketNo: string;
  category: string;
  message: string | null;
  status: string;
  response: string | null;
  dueAt: string;
  createdAt: string;
  policyNumber: string | null;
  farmer: { id: string; code: string; name: string | null; phone: string; district: string | null };
};

const CATEGORY: Record<string, string> = {
  NO_PAYOUT: 'Crop hurt, no payout',
  LATE_PAYOUT: 'Payout late',
  WRONG_DETAILS: 'Wrong details',
  PRIVACY: 'Data / privacy',
  OTHER: 'Other',
};

/** Complaints queue: nearest deadline first. Answers reach the farmer's in-app messages. */
export default async function Grievances({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [rows, staff] = await Promise.all([
    adminGet<Row[]>(`grievances${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    currentStaff(),
  ]);
  if (!rows) return <Unavailable />;
  const mayAnswer = !!staff && can.handleCases(staff.role);
  const now = Date.now();
  return (
    <>
      <PageHead
        title="Complaints"
        sub="Farmers’ problems, answered within 14 days. Opening this list is recorded."
      />
      <nav className="adm-tools" aria-label="Filter">
        {[
          ['', 'Open'],
          ['RESOLVED', 'Answered'],
        ].map(([v, l]) => (
          <Link
            key={l}
            href={v ? `/admin/grievances?status=${v}` : '/admin/grievances'}
            className={`adm-btn${(status ?? '') === v ? '' : ' line'}`}
          >
            {l}
          </Link>
        ))}
      </nav>
      <section className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Farmer</th>
                <th>Problem</th>
                <th>Status</th>
                <th>Answer by</th>
                <th>{mayAnswer ? 'Action' : 'Answer'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((g) => {
                  const late = g.status !== 'RESOLVED' && new Date(g.dueAt).getTime() < now;
                  return (
                    <tr key={g.id}>
                      <td>
                        <b>{g.ticketNo}</b>
                        <br />
                        <span className="adm-muted">{when(g.createdAt)}</span>
                      </td>
                      <td>
                        <Link href={`/admin/farmers/${g.farmer.id}`}>
                          {g.farmer.name ?? g.farmer.code}
                        </Link>
                        <br />
                        <span className="adm-muted">
                          {g.farmer.phone} · {districtName(g.farmer.district)}
                        </span>
                      </td>
                      <td style={{ maxWidth: 360 }}>
                        <b>{CATEGORY[g.category] ?? g.category}</b>
                        {g.policyNumber ? (
                          <span className="adm-muted"> · {g.policyNumber}</span>
                        ) : null}
                        <br />
                        {g.message}
                      </td>
                      <td>
                        <Status value={g.status} />
                      </td>
                      <td>
                        {late ? <span className="adm-tag bad">Late</span> : null} {when(g.dueAt)}
                      </td>
                      <td style={{ maxWidth: 320 }}>
                        {g.response ? <p style={{ margin: '0 0 6px' }}>{g.response}</p> : null}
                        {mayAnswer && g.status !== 'RESOLVED' ? (
                          <AnswerGrievance id={g.id} />
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="adm-empty">
                    {status === 'RESOLVED' ? 'No answered complaints yet.' : 'No open complaints.'}
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
