import Link from 'next/link';
import { adminGet, can, currentStaff, districtName, when } from '@/lib/admin';
import { CheckField } from '@/components/admin/actions';
import { PageHead, Status, Unavailable } from '@/components/admin/ui';

type Row = {
  id: string;
  status: string;
  surveyNo: string | null;
  note: string | null;
  acres: number | null;
  lat: number;
  lng: number;
  accuracyM: number | null;
  createdAt: string;
  checkedAt: string | null;
  farmer: {
    id: string;
    code: string;
    name: string | null;
    district: string | null;
    village: string | null;
  };
};

const FILTERS: [string, string][] = [
  ['', 'To check'],
  ['FLAGGED', 'Flagged'],
  ['VERIFIED', 'Verified'],
  ['REJECTED', 'Rejected'],
];

/**
 * Land checks: staff compare each field with the 7/12 land record (owner name, survey number, area).
 * Fields flagged by the automatic duplicate checks come first.
 */
export default async function Fields({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [rows, staff] = await Promise.all([
    adminGet<Row[]>(`fields${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    currentStaff(),
  ]);
  if (!rows) return <Unavailable />;
  const mayCheck = !!staff && can.handleCases(staff.role);
  return (
    <>
      <PageHead
        title="Land checks"
        sub="Check each field against its 7/12 extract on the Mahabhumi portal: owner name, survey number and area."
      />
      <nav className="adm-tools" aria-label="Filter">
        {FILTERS.map(([v, l]) => (
          <Link
            key={l}
            href={v ? `/admin/fields?status=${v}` : '/admin/fields'}
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
                <th>Farmer</th>
                <th>Survey no.</th>
                <th className="num">Acres</th>
                <th>GPS pin</th>
                <th>Status</th>
                <th>{mayCheck ? 'Check' : 'Note'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/farmers/${p.farmer.id}`}>
                        {p.farmer.name ?? p.farmer.code}
                      </Link>
                      <br />
                      <span className="adm-muted">
                        {p.farmer.village ?? '—'}, {districtName(p.farmer.district)}
                      </span>
                    </td>
                    <td>{p.surveyNo ?? <span className="adm-muted">Not given</span>}</td>
                    <td className="num">{p.acres ?? '—'}</td>
                    <td>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {p.lat}, {p.lng}
                      </a>
                      <br />
                      <span className="adm-muted">
                        ±{Math.round(p.accuracyM ?? 0)} m · {when(p.createdAt)}
                      </span>
                    </td>
                    <td>
                      <Status value={p.status} />
                      {p.note ? (
                        <>
                          <br />
                          <span className="adm-muted">{p.note}</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {mayCheck && (p.status === 'FLAGGED' || p.status === 'UNVERIFIED') ? (
                        <CheckField id={p.id} />
                      ) : (
                        <span className="adm-muted">
                          {p.checkedAt ? `Checked ${when(p.checkedAt)}` : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="adm-empty">
                    Nothing here.
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
