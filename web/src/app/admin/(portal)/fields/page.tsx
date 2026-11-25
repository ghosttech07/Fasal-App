import Link from 'next/link';
import { adminGet, can, currentStaff, districtName, when } from '@/lib/admin';
import { CheckField, CropCheck } from '@/components/admin/actions';
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
  crop: { status: string; ndvi: number | null; sceneAt: string | null } | null;
  farmer: {
    id: string;
    code: string;
    name: string | null;
    district: string | null;
    village: string | null;
  };
};

/** NDVI from the newest clear Sentinel-2 scene: ≥ 0.4 a growing crop, 0.2–0.4 sparse or just sown, below 0.2 bare. */
const CROP: Record<string, { text: string; tone: '' | 'warn' | 'bad' | 'plain' }> = {
  GREEN: { text: 'Crop growing', tone: '' },
  SPARSE: { text: 'Sparse / just sown', tone: 'warn' },
  BARE: { text: 'Bare land', tone: 'bad' },
  UNKNOWN: { text: 'Cloudy, no reading', tone: 'plain' },
};

const FILTERS: [string, string][] = [
  ['', 'To check'],
  ['FLAGGED', 'Flagged'],
  ['VERIFIED', 'Verified'],
  ['REJECTED', 'Rejected'],
];

/**
 * Land checks: staff compare each field with the state land record (owner name, survey number, area).
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
        sub="Check each field against the state land record (7/12 in Maharashtra, Khatauni in UP, RTC in Karnataka…): owner name, survey number and area. The satellite column shows whether a crop is growing at the pin."
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
                <th>Crop seen by satellite</th>
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
                      {p.crop ? (
                        <>
                          <span className={`adm-tag ${CROP[p.crop.status]?.tone ?? 'plain'}`}>
                            {CROP[p.crop.status]?.text ?? p.crop.status}
                          </span>
                          <br />
                          <span className="adm-muted">
                            {p.crop.ndvi !== null
                              ? `NDVI ${p.crop.ndvi.toFixed(2)}`
                              : 'No clear scene'}
                            {p.crop.sceneAt ? ` · ${when(p.crop.sceneAt)}` : ''}
                          </span>
                          <br />
                        </>
                      ) : (
                        <span className="adm-muted">Not checked</span>
                      )}
                      {mayCheck ? <CropCheck id={p.id} again={!!p.crop} /> : null}
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
                  <td colSpan={7} className="adm-empty">
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
