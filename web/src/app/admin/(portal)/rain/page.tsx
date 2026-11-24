import Link from 'next/link';
import { adminGet, can, currentStaff, districtName, SOURCE_LABEL, when } from '@/lib/admin';
import { Simulator } from '@/components/admin/actions';
import { PageHead, Unavailable } from '@/components/admin/ui';

type Rain = {
  districts: string[];
  district: string | null;
  from: string;
  to: string;
  source: string;
  cells: {
    id: number;
    lat: number;
    lng: number;
    plots: number;
    rainMm: number | null;
    normalMm: number;
    pctBelow: number | null;
    days: number;
  }[];
  runs: {
    id: string;
    at: string;
    source: string;
    from: string;
    to: string;
    status: string;
    readings: number;
    note: string | null;
  }[];
};

/** Same colour steps as the payout marks, light to dark; each cell also states its number in words. */
function tone(pct: number | null) {
  if (pct === null) return { bg: '#eef2ee', fg: '#47534c', label: 'No data' };
  if (pct >= 80) return { bg: '#7a3a06', fg: '#fff', label: 'Mark 3 (80%)' };
  if (pct >= 60) return { bg: '#c4621b', fg: '#fff', label: 'Mark 2 (60%)' };
  if (pct >= 40) return { bg: '#e5a05a', fg: '#15201a', label: 'Mark 1 (40%)' };
  if (pct >= 10) return { bg: '#f6d8a8', fg: '#15201a', label: 'Below normal' };
  return { bg: '#d9ead3', fg: '#15201a', label: 'Normal' };
}

/** A6: rain per 5 km cell against its normal, ingestion runs, and the demo simulator. */
export default async function RainData({
  searchParams,
}: {
  searchParams: Promise<{ district?: string }>;
}) {
  const { district } = await searchParams;
  const [me, d] = await Promise.all([
    currentStaff(),
    adminGet<Rain>(`rain${district ? `?district=${encodeURIComponent(district)}` : ''}`),
  ]);
  if (!me || !d) return <Unavailable />;
  return (
    <>
      <PageHead
        title="Rain data"
        sub={`Rain on each 5 km cell with fields, ${d.from} to ${d.to}, against its normal. Source: ${SOURCE_LABEL[d.source] ?? d.source}.`}
      />
      <nav className="adm-tools" aria-label="District">
        {d.districts.map((x) => (
          <Link
            key={x}
            href={`/admin/rain?district=${x}`}
            className={`adm-btn ${x === d.district ? '' : 'line'}`}
            aria-current={x === d.district ? 'page' : undefined}
          >
            {districtName(x)}
          </Link>
        ))}
      </nav>
      <div className="adm-two" style={{ marginTop: 0 }}>
        <section className="adm-card">
          <h2>
            {districtName(d.district)} <small>{d.cells.length} cells with fields</small>
          </h2>
          {d.cells.length ? (
            <div className="adm-cells">
              {d.cells.map((c) => {
                const t = tone(c.pctBelow);
                return (
                  <div key={c.id} className="adm-cell" style={{ background: t.bg, color: t.fg }}>
                    <b>{c.pctBelow === null ? '—' : `${c.pctBelow}% below`}</b>
                    {c.rainMm ?? '—'} of {c.normalMm} mm · {t.label}
                    <br />
                    {c.lat.toFixed(2)}° N, {c.lng.toFixed(2)}° E · {c.plots} fields
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="adm-empty">No fields in this district yet.</p>
          )}
          <div className="adm-legend">
            <span style={{ ['--c' as string]: '#d9ead3' }}>Normal</span>
            <span style={{ ['--c' as string]: '#f6d8a8' }}>Below normal</span>
            <span style={{ ['--c' as string]: '#e5a05a' }}>Mark 1 (40%)</span>
            <span style={{ ['--c' as string]: '#c4621b' }}>Mark 2 (60%)</span>
            <span style={{ ['--c' as string]: '#7a3a06' }}>Mark 3 (80%)</span>
          </div>
        </section>
        <section className="adm-card">
          <h2>
            Weather simulator <span className="adm-tag warn">Demo only</span>
          </h2>
          {can.simulate(me.role) && d.district ? (
            <Simulator district={d.district} districtLabel={districtName(d.district)} />
          ) : (
            <p className="adm-muted">Your role cannot run simulations.</p>
          )}
        </section>
      </div>
      <section className="adm-card adm-stack">
        <h2>Data loads</h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Source</th>
                <th>Dates</th>
                <th className="num">Readings</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {d.runs.map((r) => (
                <tr key={r.id}>
                  <td>{when(r.at)}</td>
                  <td>{SOURCE_LABEL[r.source] ?? r.source}</td>
                  <td className="adm-muted">
                    {String(r.from).slice(0, 10)} → {String(r.to).slice(0, 10)}
                  </td>
                  <td className="num">{r.readings.toLocaleString('en-IN')}</td>
                  <td>
                    {r.status === 'SUCCEEDED' ? (
                      <span className="adm-tag">Loaded</span>
                    ) : (
                      <span className="adm-tag warn">{r.status}</span>
                    )}
                  </td>
                  <td className="adm-muted">
                    {r.note?.startsWith('scenario') ? 'Simulated scenario' : (r.note ?? '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
