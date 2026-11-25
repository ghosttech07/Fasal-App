import { adminGet, can, currentStaff } from '@/lib/admin';
import { AddAgent, AgentToggle } from '@/components/admin/actions';
import { PageHead, Status, Unavailable } from '@/components/admin/ui';

type Data = {
  orgs: { id: string; name: string }[];
  agents: {
    id: string;
    code: string;
    name: string;
    phone: string;
    org: string;
    status: string;
    farmers: number;
    covered: number;
  }[];
};

/** Field agents and FPO staff who enrol farmers on their behalf. Only the main admin adds or disables them. */
export default async function Agents() {
  const [data, staff] = await Promise.all([adminGet<Data>('agents'), currentStaff()]);
  if (!data) return <Unavailable />;
  const manage = !!staff && can.manageStaff(staff.role);
  return (
    <>
      <PageHead
        title="Field agents"
        sub="People at FPOs who enrol farmers in the field. They sign in with their own mobile number and see only the farmers they enrolled."
      />
      {manage ? <AddAgent orgs={data.orgs} /> : null}
      <section className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>FPO</th>
                <th>Mobile</th>
                <th className="num">Farmers enrolled</th>
                <th className="num">With cover</th>
                <th>Status</th>
                {manage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {data.agents.length ? (
                data.agents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <b>{a.name}</b>
                      <br />
                      <span className="adm-muted">{a.code}</span>
                    </td>
                    <td>{a.org}</td>
                    <td>{a.phone}</td>
                    <td className="num">{a.farmers}</td>
                    <td className="num">{a.covered}</td>
                    <td>
                      <Status value={a.status} />
                    </td>
                    {manage ? (
                      <td>
                        <AgentToggle id={a.id} status={a.status} name={a.name} />
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={manage ? 7 : 6} className="adm-empty">
                    No field agents yet.
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
