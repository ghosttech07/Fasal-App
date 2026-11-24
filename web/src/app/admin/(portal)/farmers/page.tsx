import Link from 'next/link';
import { rupees } from '@/lib/format';
import { adminGet, districtName } from '@/lib/admin';
import { PageHead, Peril, Status, Unavailable } from '@/components/admin/ui';

type Row = {
  id: string;
  code: string;
  name: string | null;
  phone: string;
  district: string | null;
  village: string | null;
  kyc: string;
  upi: string | null;
  upiStatus: string | null;
  activePolicies: number;
  perils: string[];
  acres: number;
  paidPaise: number;
};

/** A5: farmer directory. Phones are masked; opening a farmer is recorded in the audit log. */
export default async function Farmers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; district?: string; kyc?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => !!v) as [string, string][],
  ).toString();
  const [data, rain] = await Promise.all([
    adminGet<{ total: number; farmers: Row[] }>(`farmers${qs ? `?${qs}` : ''}`),
    adminGet<{ districts: string[] }>('rain'),
  ]);
  if (!data) return <Unavailable />;
  return (
    <>
      <PageHead
        title="Farmers & policies"
        sub={`${data.total} farmers${qs ? ' match' : ''}. Mobile numbers are masked; opening a farmer is recorded.`}
      />
      <form className="adm-tools" role="search">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search by farmer code, village, policy number or last 4+ digits of mobile"
          aria-label="Search farmers"
        />
        <select name="district" defaultValue={sp.district ?? ''} aria-label="District">
          <option value="">All districts</option>
          {(rain?.districts ?? []).map((d) => (
            <option key={d} value={d}>
              {districtName(d)}
            </option>
          ))}
        </select>
        <select name="kyc" defaultValue={sp.kyc ?? ''} aria-label="KYC">
          <option value="">Any KYC</option>
          <option value="VERIFIED">Verified</option>
          <option value="BASIC">Basic</option>
          <option value="NONE">None</option>
        </select>
        <button className="adm-btn" type="submit">
          Search
        </button>
        {qs ? (
          <Link href="/admin/farmers" className="adm-btn line">
            Clear
          </Link>
        ) : null}
      </form>
      <section className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Mobile</th>
                <th>Village</th>
                <th>Covers</th>
                <th>UPI ID</th>
                <th>KYC</th>
                <th className="num">Paid</th>
              </tr>
            </thead>
            <tbody>
              {data.farmers.length ? (
                data.farmers.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <Link href={`/admin/farmers/${f.id}`}>{f.name ?? 'Unnamed farmer'}</Link>
                      <br />
                      <span className="adm-muted">{f.code}</span>
                    </td>
                    <td>{f.phone}</td>
                    <td>
                      {f.village ?? '—'}
                      <br />
                      <span className="adm-muted">{districtName(f.district)}</span>
                    </td>
                    <td>
                      {f.activePolicies ? (
                        <>
                          {f.perils.map((p) => (
                            <Peril key={p} value={p} />
                          ))}{' '}
                          <span className="adm-muted">{f.acres} acres</span>
                        </>
                      ) : (
                        <span className="adm-muted">None</span>
                      )}
                    </td>
                    <td>
                      {f.upi ?? <span className="adm-muted">None</span>}
                      {f.upiStatus ? (
                        <>
                          <br />
                          <Status value={f.upiStatus} />
                        </>
                      ) : null}
                    </td>
                    <td>
                      <Status value={f.kyc} />
                    </td>
                    <td className="num">{rupees(f.paidPaise)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="adm-empty">
                    No farmers match.
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
