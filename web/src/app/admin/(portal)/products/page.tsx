import { rupees } from '@/lib/format';
import { adminGet, can, currentStaff, districtName, when } from '@/lib/admin';
import { NewVersion, SubmitDraft, VersionDecision } from '@/components/admin/actions';
import { PageHead, Peril, Status, Unavailable } from '@/components/admin/ui';

type Version = {
  id: string;
  version: number;
  status: string;
  seasonCode: string;
  sumInsuredPaise: number;
  premiumRateBp: number;
  subsidyBp: number;
  enrolmentCutoff: string;
  waitingPeriodDays: number;
  eligibleDistricts: string[];
  rules: {
    phases: { id: string; from: string; to: string; weightPct: number }[];
    slabs: { level: number; threshold: number; payoutPctOfPhase: number }[];
    index?: { type: string };
  };
  rulesSha256: string | null;
  publishedAt: string | null;
  submittedBy: string | null;
  submittedById: string | null;
  approvedBy: string | null;
  reviewNote: string | null;
  policies: number;
};
type Product = { id: string; code: string; name: string; peril: string; versions: Version[] };

/** A3: products and their versions. Published versions are frozen; a new one needs a second person to publish. */
export default async function Products() {
  const [me, data, dash] = await Promise.all([
    currentStaff(),
    adminGet<{ products: Product[] }>('products'),
    adminGet<{ season: { code: string } | null }>('dashboard'),
  ]);
  if (!me || !data) return <Unavailable />;
  const seasons = [
    ...new Set(
      [
        ...data.products.flatMap((p) => p.versions.map((v) => v.seasonCode)),
        dash?.season?.code,
      ].filter((s): s is string => !!s),
    ),
  ];
  return (
    <>
      <PageHead
        title="Products"
        sub="Published versions never change. A new version needs a second person to approve it with a fresh code."
      />
      {data.products.map((p) => {
        const latest = p.versions.find((v) => v.status === 'PUBLISHED') ?? p.versions[0];
        return (
          <section
            className="adm-card adm-stack"
            key={p.id}
            style={{ marginTop: 0, marginBottom: 16 }}
          >
            <div className="adm-head" style={{ margin: 0 }}>
              <h2 style={{ margin: 0 }}>
                {p.name} <small>{p.code}</small> <Peril value={p.peril} />
              </h2>
              {can.editProducts(me.role) && latest ? (
                <NewVersion productId={p.id} from={latest} seasons={seasons} />
              ) : null}
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Season</th>
                    <th className="num">Cover / acre</th>
                    <th>Premium</th>
                    <th>Marks → payout</th>
                    <th className="num">Policies</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.versions.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <b>v{v.version}</b>
                      </td>
                      <td>
                        {v.seasonCode.replace('_', ' ')}
                        <br />
                        <span className="adm-muted">
                          enrol by {String(v.enrolmentCutoff).slice(0, 10)}
                        </span>
                      </td>
                      <td className="num">{rupees(v.sumInsuredPaise)}</td>
                      <td>
                        {v.premiumRateBp / 100}% · sponsor {v.subsidyBp / 100}%
                      </td>
                      <td className="adm-muted">
                        {v.rules.slabs
                          .map(
                            (s) =>
                              `${s.threshold}${p.peril === 'DROUGHT' ? '%' : ' mm'} → ${s.payoutPctOfPhase}%`,
                          )
                          .join(' · ')}
                        <br />
                        {v.rules.phases
                          .map(
                            (ph) => `${ph.id.replace(/^P\d_/, '').toLowerCase()} ${ph.weightPct}%`,
                          )
                          .join(' · ')}
                      </td>
                      <td className="num">{v.policies}</td>
                      <td>
                        <Status value={v.status} />
                        <br />
                        <span className="adm-muted">
                          {v.status === 'PUBLISHED'
                            ? `${when(v.publishedAt)}${v.approvedBy ? ` by ${v.approvedBy}` : ''}`
                            : v.submittedBy
                              ? `by ${v.submittedBy}`
                              : ''}
                        </span>
                        {v.reviewNote ? (
                          <>
                            <br />
                            <span className="adm-err">Sent back: “{v.reviewNote}”</span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        {can.editProducts(me.role) && v.status === 'PENDING_APPROVAL' ? (
                          v.submittedById === me.id ? (
                            <span className="adm-muted">Waiting for a second person</span>
                          ) : (
                            <VersionDecision id={v.id} label={`${p.name} v${v.version}`} />
                          )
                        ) : null}
                        {can.editProducts(me.role) && v.status === 'DRAFT' ? (
                          <SubmitDraft id={v.id} />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="adm-muted" style={{ margin: 0 }}>
              Districts:{' '}
              {(latest?.eligibleDistricts ?? [])
                .map((d) => (d === '*' ? 'All India' : districtName(d)))
                .join(', ') || '—'}
              {latest?.rulesSha256 ? (
                <>
                  {' '}
                  · rules hash <span className="adm-hash">{latest.rulesSha256.slice(0, 16)}…</span>
                </>
              ) : null}
            </p>
          </section>
        );
      })}
    </>
  );
}
