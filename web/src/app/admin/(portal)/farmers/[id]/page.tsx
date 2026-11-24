import Link from 'next/link';
import { rupees } from '@/lib/format';
import { adminGet, districtName, when } from '@/lib/admin';
import { PageHead, Peril, Status, Unavailable } from '@/components/admin/ui';

type Detail = {
  farmer: {
    id: string;
    code: string;
    name: string | null;
    phone: string;
    language: string;
    district: string | null;
    village: string | null;
    kyc: string;
    createdAt: string;
  };
  wallets: {
    handleMasked: string;
    status: string;
    verifiedName: string | null;
    isPrimary: boolean;
    createdAt: string;
  }[];
  plots: {
    id: string;
    areaAcres: number | null;
    lat: number;
    lng: number;
    gridCellId: number;
    gpsAccuracyM: number | null;
    createdAt: string;
  }[];
  consents: {
    purpose: string;
    noticeVersion: string;
    grantedAt: string;
    withdrawnAt: string | null;
  }[];
  policies: {
    id: string;
    number: string | null;
    status: string;
    cropCode: string;
    product: string;
    peril: string;
    version: number;
    sumInsuredPaise: number;
    premiumPaise: number;
    subsidyPaise: number;
    coverStart: string | null;
    coverEnd: string | null;
    events: {
      id: string;
      phaseId: string;
      slabLevel: number;
      amountPaise: number;
      detectedAt: string;
      payout: {
        status: string;
        amountPaise: number;
        creditedAt: string | null;
        utr: string | null;
      } | null;
    }[];
  }[];
};

/** A5: one farmer — profile, fields, UPI, consent and every policy with its payouts. */
export default async function FarmerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await adminGet<Detail>(`farmers/${encodeURIComponent(id)}`);
  if (!d) return <Unavailable />;
  const f = d.farmer;
  return (
    <>
      <PageHead
        title={f.name ?? 'Unnamed farmer'}
        sub={`${f.code} · ${f.village ? `${f.village}, ` : ''}${districtName(f.district)} · joined ${when(f.createdAt)}`}
      >
        <Link href="/admin/farmers" className="adm-btn line">
          All farmers
        </Link>
      </PageHead>
      <div className="adm-grid">
        <section className="adm-card">
          <h2>Profile</h2>
          <dl className="adm-kv">
            <dt>Mobile</dt>
            <dd>{f.phone}</dd>
            <dt>Language</dt>
            <dd>{f.language}</dd>
            <dt>KYC</dt>
            <dd>
              <Status value={f.kyc} />
            </dd>
            <dt>Consent</dt>
            <dd>
              {d.consents.length
                ? d.consents
                    .map(
                      (c) =>
                        `${c.purpose} v${c.noticeVersion}${c.withdrawnAt ? ' (withdrawn)' : ''}`,
                    )
                    .join(', ')
                : 'None recorded'}
            </dd>
          </dl>
        </section>
        <section className="adm-card">
          <h2>UPI ID</h2>
          {d.wallets.length ? (
            d.wallets.map((w) => (
              <p key={w.handleMasked} style={{ margin: '0 0 6px' }}>
                {w.handleMasked} <Status value={w.status} />
                {w.verifiedName ? (
                  <span className="adm-muted"> · name {w.verifiedName}</span>
                ) : null}
              </p>
            ))
          ) : (
            <p className="adm-err">No UPI ID: payouts cannot be sent.</p>
          )}
        </section>
        <section className="adm-card">
          <h2>Fields</h2>
          {d.plots.length ? (
            d.plots.map((p) => (
              <p key={p.id} style={{ margin: '0 0 6px' }}>
                {p.areaAcres ?? '?'} acres · {p.lat}° N, {p.lng}° E{' '}
                <span className="adm-muted">(±{Math.round(p.gpsAccuracyM ?? 0)} m)</span>
              </p>
            ))
          ) : (
            <p className="adm-muted">No field added.</p>
          )}
        </section>
      </div>
      <section className="adm-card adm-stack">
        <h2>Policies</h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Cover</th>
                <th className="num">Sum insured</th>
                <th className="num">Premium (farmer / sponsor)</th>
                <th>Cover period</th>
                <th>Status</th>
                <th>Payouts</th>
              </tr>
            </thead>
            <tbody>
              {d.policies.length ? (
                d.policies.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.number ?? '—'}</b>
                      <br />
                      <span className="adm-muted">{p.cropCode.toLowerCase()}</span>
                    </td>
                    <td>
                      <Peril value={p.peril} /> {p.product} v{p.version}
                    </td>
                    <td className="num">{rupees(p.sumInsuredPaise)}</td>
                    <td className="num">
                      {rupees(p.premiumPaise - p.subsidyPaise)} / {rupees(p.subsidyPaise)}
                    </td>
                    <td className="adm-muted">
                      {p.coverStart
                        ? `${String(p.coverStart).slice(0, 10)} → ${String(p.coverEnd).slice(0, 10)}`
                        : '—'}
                    </td>
                    <td>
                      <Status value={p.status} />
                    </td>
                    <td>
                      {p.events.length ? (
                        p.events.map((e) => (
                          <div key={e.id} style={{ marginBottom: 4 }}>
                            <Link href={`/admin/triggers/${e.id}`}>{rupees(e.amountPaise)}</Link>{' '}
                            <span className="adm-muted">
                              {e.phaseId.replace(/^P\d_/, '').toLowerCase()} mark {e.slabLevel}
                            </span>{' '}
                            <Status value={e.payout?.status} />
                          </div>
                        ))
                      ) : (
                        <span className="adm-muted">None</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="adm-empty">
                    No policies.
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
