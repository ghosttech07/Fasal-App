import Link from 'next/link';
import { rupees } from '@/lib/format';
import { adminGet, districtName, since, SOURCE_LABEL, when } from '@/lib/admin';
import { PageHead, Unavailable } from '@/components/admin/ui';

type Dashboard = {
  season: { code: string } | null;
  totals: {
    policies: number;
    farmers: number;
    acres: number;
    sumInsuredPaise: number;
    premiumPaise: number;
    sponsorPaise: number;
    farmerPaise: number;
  };
  payouts: {
    paidPaise: number;
    paidCount: number;
    total: number;
    p95Hours: number | null;
    awaiting: number;
    awaitingPaise: number;
    oldestWaitingSince: string | null;
    failed: number;
    slaBreached: number;
  };
  daily: { day: string; paise: number; count: number }[];
  districts: {
    district: string;
    policies: number;
    sumInsuredPaise: number;
    premiumPaise: number;
    paidPaise: number;
    events: number;
    maxSlab: number;
  }[];
  attention: {
    batchesAwaitingApproval: number;
    batchesAwaitingPaise: number;
    oldestBatchAt: string | null;
    versionsAwaitingApproval: number;
    eventsHeld: number;
    lastRain: { at: string; source: string } | null;
  };
};

/** A2: season at a glance, from live data. */
export default async function Dashboard() {
  const d = await adminGet<Dashboard>('dashboard');
  if (!d) return <Unavailable />;
  const { totals: t, payouts: p, attention: a } = d;
  const max = Math.max(1, ...d.daily.map((x) => x.paise));
  const W = 640,
    H = 170,
    X0 = 44;
  const pts = d.daily.map(
    (x, i) =>
      [
        X0 + (i * (W - X0 - 10)) / Math.max(1, d.daily.length - 1),
        H - 10 - (x.paise / max) * (H - 30),
      ] as const,
  );
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const peak = d.daily.reduce(
    (best, x, i) => (x.paise > (d.daily[best]?.paise ?? 0) ? i : best),
    0,
  );
  const within = p.p95Hours !== null && p.p95Hours <= 24;

  return (
    <>
      <PageHead
        title="Dashboard"
        sub={`${d.season?.code.replace('_', ' ') ?? 'No season'} · live data`}
      />
      <div className="adm-kpis">
        <section className="adm-card adm-kpi hero">
          <div className="l">Paid to farmers this season</div>
          <div className="v">{rupees(p.paidPaise)}</div>
          <div className="d">
            {p.paidCount} of {p.total} payouts credited
          </div>
        </section>
        <section className="adm-card adm-kpi">
          <div className="l">Active policies</div>
          <div className="v">{t.policies.toLocaleString('en-IN')}</div>
          <div className="d">
            {t.farmers} farmers · {t.acres} acres
          </div>
        </section>
        <section className="adm-card adm-kpi">
          <div className="l">Premium written</div>
          <div className="v">{rupees(t.premiumPaise)}</div>
          <div className="d">
            Farmers {rupees(t.farmerPaise)} · sponsors {rupees(t.sponsorPaise)}
          </div>
        </section>
        <section className="adm-card adm-kpi">
          <div className="l">Payout speed (95% within)</div>
          <div className="v">{p.p95Hours === null ? '—' : `${p.p95Hours} h`}</div>
          <div className="d">
            {p.p95Hours === null ? (
              'No payouts credited yet'
            ) : (
              <span className={`adm-tag ${within ? '' : 'bad'}`}>
                {within ? 'Within 24 h target' : 'Over 24 h target'}
              </span>
            )}
            {p.slaBreached ? <> · {p.slaBreached} late</> : null}
          </div>
        </section>
      </div>

      <div className="adm-two">
        <section className="adm-card" aria-labelledby="chart-h">
          <h2 id="chart-h">
            Money paid per day <small>last 30 days</small>
          </h2>
          <svg
            viewBox={`0 0 ${W} ${H + 18}`}
            width="100%"
            role="img"
            aria-label={`Payouts per day over the last 30 days; highest ${rupees(d.daily[peak]?.paise ?? 0)} on ${d.daily[peak]?.day}`}
          >
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1={X0}
                  x2={W}
                  y1={H - 10 - f * (H - 30)}
                  y2={H - 10 - f * (H - 30)}
                  stroke="#e7ebe7"
                />
                <text x="0" y={H - 6 - f * (H - 30)} fontSize="11" fill="#47534c">
                  {rupees(max * f)}
                </text>
              </g>
            ))}
            <path
              d={`${line} L${pts.at(-1)?.[0]} ${H - 10} L${X0} ${H - 10} Z`}
              fill="#123f2c"
              opacity="0.08"
            />
            <path d={line} fill="none" stroke="#123f2c" strokeWidth="2.5" />
            {d.daily[peak]?.paise ? (
              <circle
                cx={pts[peak]?.[0]}
                cy={pts[peak]?.[1]}
                r="5"
                fill="#f5b800"
                stroke="#123f2c"
                strokeWidth="2"
              />
            ) : null}
            <text x={X0} y={H + 14} fontSize="11" fill="#47534c">
              {d.daily[0]?.day}
            </text>
            <text x={W} y={H + 14} fontSize="11" fill="#47534c" textAnchor="end">
              {d.daily.at(-1)?.day}
            </text>
          </svg>
        </section>
        <section className="adm-card" aria-labelledby="att-h">
          <h2 id="att-h">Needs attention</h2>
          {p.awaiting ? (
            <div className="adm-alert">
              <i style={{ background: 'var(--marigold)' }} />
              <div>
                <Link href="/admin/payouts">
                  <b>{p.awaiting} payouts</b>
                </Link>{' '}
                waiting for a batch
                <br />
                <span className="adm-muted">
                  {rupees(p.awaitingPaise)} · oldest {since(p.oldestWaitingSince)}
                </span>
              </div>
            </div>
          ) : null}
          {a.batchesAwaitingApproval ? (
            <div className="adm-alert">
              <i style={{ background: 'var(--marigold)' }} />
              <div>
                <Link href="/admin/payouts">
                  <b>{a.batchesAwaitingApproval} batches</b>
                </Link>{' '}
                waiting for approval
                <br />
                <span className="adm-muted">
                  {rupees(a.batchesAwaitingPaise)} · since {since(a.oldestBatchAt)}
                </span>
              </div>
            </div>
          ) : null}
          {p.failed ? (
            <div className="adm-alert">
              <i style={{ background: 'var(--danger)' }} />
              <div>
                <Link href="/admin/payouts?status=failed">
                  <b>{p.failed} payouts failed</b>
                </Link>
                <br />
                <span className="adm-muted">Farmer must update their UPI ID</span>
              </div>
            </div>
          ) : null}
          {a.versionsAwaitingApproval ? (
            <div className="adm-alert">
              <i style={{ background: 'var(--flood)' }} />
              <div>
                <Link href="/admin/products">
                  <b>{a.versionsAwaitingApproval} product versions</b>
                </Link>{' '}
                need a second approval
              </div>
            </div>
          ) : null}
          {a.eventsHeld ? (
            <div className="adm-alert">
              <i style={{ background: 'var(--danger)' }} />
              <div>
                <b>{a.eventsHeld} trigger events</b> held for review
              </div>
            </div>
          ) : null}
          <div className="adm-alert">
            <i style={{ background: a.lastRain ? '#15803d' : 'var(--danger)' }} />
            <div>
              <Link href="/admin/rain">
                <b>Rain data</b>
              </Link>{' '}
              {a.lastRain ? `updated ${when(a.lastRain.at)}` : 'not loaded yet'}
              <br />
              <span className="adm-muted">
                {a.lastRain
                  ? `Source: ${SOURCE_LABEL[a.lastRain.source] ?? a.lastRain.source}`
                  : ''}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="adm-card adm-stack" aria-labelledby="dist-h">
        <h2 id="dist-h">By district</h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>District</th>
                <th className="num">Policies</th>
                <th className="num">Sum insured</th>
                <th className="num">Premium</th>
                <th className="num">Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.districts.length ? (
                d.districts.map((r) => (
                  <tr key={r.district}>
                    <td>{districtName(r.district)}</td>
                    <td className="num">{r.policies}</td>
                    <td className="num">{rupees(r.sumInsuredPaise)}</td>
                    <td className="num">{rupees(r.premiumPaise)}</td>
                    <td className="num">{rupees(r.paidPaise)}</td>
                    <td>
                      {r.maxSlab ? (
                        <span className={`adm-tag ${r.maxSlab >= 2 ? 'bad' : 'warn'}`}>
                          Mark {r.maxSlab} passed
                        </span>
                      ) : (
                        <span className="adm-tag">No mark passed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="adm-empty">
                    No policies this season yet.
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
