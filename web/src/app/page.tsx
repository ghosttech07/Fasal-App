import { ArrowRight, Banknote, Check, ChevronRight, CloudRain, Satellite, Sun } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Mark } from '@/components/mark';
import { RainMeter } from '@/components/rain-meter';
import { SignOut } from '@/components/sign-out';
import { daysBetween, day, en, nextSetupStep, phaseName, rupees, type Me, type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';

type Plot = { id: string; areaAcres: number | null; createdAt: string };
type Season = { code: string; namesI18n: unknown };

export default async function Home() {
  const me = await serverGet<Me>('/me');
  const step = nextSetupStep(me);
  if (step) redirect(step);

  const [policies, plots, seasons] = await Promise.all([serverGet<Policy[]>('/policies'), serverGet<Plot[]>('/me/plots'), serverGet<Season[]>('/catalog/seasons')]);
  const live = policies.filter((p) => p.status === 'ACTIVE' || p.status === 'IN_WAITING');
  return live.length ? <RainBoard me={me} policies={live} /> : <BeforeBuying me={me} plot={plots[0]} season={seasons[0]} />;
}

function BeforeBuying({ me, plot, season }: { me: Me; plot?: Plot; season?: Season }) {
  return (
    <main className="screen">
      <section className="board" aria-labelledby="who">
        <div className="top">
          <Mark />
          <span className="fig" style={{ color: 'var(--chalk-2)', fontSize: 15 }}>
            {me.farmerCode}
          </span>
        </div>
        <h1 id="who" className="board-title">
          {me.name}
        </h1>
        <p className="board-sub">
          {plot?.areaAcres ? `Field of ${plot.areaAcres.toFixed(1)} acres` : 'Your field'}
          {me.village ? `, ${me.village}` : ''} · {me.wallet?.handleMasked}
        </p>
        {season ? (
          <span className="tag tag-gold" style={{ justifySelf: 'start' }}>
            Open now: {en(season.namesI18n)}
          </span>
        ) : null}
      </section>
      <div className="work">
        <h2 className="h2">How your cover works</h2>
        <div className="steps">
          <div>
            <b>1</b>
            <span>A satellite measures the rain on your field every day.</span>
          </div>
          <div>
            <b>2</b>
            <span>Before you buy, you see exactly how much rain pays how much money.</span>
          </div>
          <div>
            <b>3</b>
            <span>When rain crosses a mark, money reaches your UPI within a day. No forms.</span>
          </div>
        </div>
      </div>
      <div className="action">
        <Link className="btn" href="/cover/crop">
          Buy cover for this season <ArrowRight size={22} aria-hidden="true" />
        </Link>
        <SignOut />
      </div>
    </main>
  );
}

/** The phase a farmer cares about today: the one in progress, else the latest finished, else the first. */
function currentPhase(p: Policy) {
  return p.phases.find((s) => s.state === 'IN_PROGRESS') ?? [...p.phases].reverse().find((s) => s.state === 'COMPLETE') ?? p.phases[0];
}

function RainBoard({ me, policies }: { me: Me; policies: Policy[] }) {
  const p = policies[0]!;
  const phase = currentPhase(p);
  const plan = p.phasePlan.find((x) => x.id === phase?.phaseId);
  const flood = p.indexType === 'FLOOD_EXCESS_RAIN';
  const coming = p.triggerEvents.filter((e) => e.payoutStatus && e.payoutStatus !== 'SUCCESS');
  const comingPaise = coming.reduce((s, e) => s + e.payoutAmountPaise, 0);
  const due = coming.map((e) => e.slaDueAt).filter(Boolean).sort()[0];

  return (
    <main className="screen">
      <section className="board" aria-label="Rain on your field">
        <div className="top">
          <Mark />
          {phase && plan ? (
            <span className="tag tag-board">
              {phaseName(phase.phaseId)}
              {phase.state === 'IN_PROGRESS' ? ` · day ${phase.daysElapsed} of ${daysBetween(plan.from, plan.to)}` : phase.state === 'UPCOMING' ? ` · starts ${day(plan.from)}` : ' · ended'}
            </span>
          ) : null}
        </div>
        {phase && plan && phase.state !== 'UPCOMING' ? (
          <RainMeter phase={phase} slabs={p.slabs} phaseAmountPaise={plan.amountPaise} flood={flood} rollingDays={p.rollingDays ?? 3} />
        ) : (
          <p className="board-title" style={{ fontSize: 26 }}>
            Cover starts {plan ? day(plan.from) : 'soon'}. We start measuring rain on your field that day.
          </p>
        )}
      </section>

      <div className="work" style={{ gap: 12 }}>
        {comingPaise > 0 ? (
          <div className="money">
            <Banknote size={30} aria-hidden="true" color="var(--board)" />
            <div style={{ display: 'grid', gap: 3 }}>
              <span className="amt">{rupees(comingPaise)} on the way</span>
              <span className="s">Approved. Reaches your UPI by {due ? `${day(due)}, ${new Date(due).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` : 'tomorrow'}.</span>
            </div>
          </div>
        ) : null}

        <div className="ruled">
          <div>
            <span className="k" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {flood ? <CloudRain size={18} aria-hidden="true" color="var(--flood)" /> : <Sun size={18} aria-hidden="true" color="var(--drought)" />}
              {en(p.names)}, {p.cropCode.toLowerCase()}
            </span>
            <span className="tag">
              <Check size={14} aria-hidden="true" /> {p.status === 'ACTIVE' ? 'Active' : 'Starts soon'}
            </span>
          </div>
          <div>
            <span className="k">Cover</span>
            <span className="v">{rupees(p.sumInsuredPaise)}</span>
          </div>
          <div>
            <span className="k">Paid to you so far</span>
            <span className="v">{rupees(p.paidOutPaise)}</span>
          </div>
        </div>
        <Link className="link" href={`/policy/${p.id}`}>
          See phases and rain details
        </Link>

        {policies.length > 1 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <h2 className="h2" style={{ fontSize: 19 }}>
              Your other covers
            </h2>
            {policies.slice(1).map((o) => (
              <Link key={o.id} href={`/policy/${o.id}`} className="money quiet" style={{ textDecoration: 'none', color: 'inherit' }}>
                {o.peril === 'FLOOD' ? <CloudRain size={22} aria-hidden="true" color="var(--flood)" /> : <Sun size={22} aria-hidden="true" color="var(--drought)" />}
                <span style={{ flex: 1 }}>
                  {en(o.names)} · {rupees(o.sumInsuredPaise)}
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : null}

        <p className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Satellite size={18} aria-hidden="true" /> Rain checked every day for {me.name?.split(' ')[0]}&rsquo;s field
        </p>
      </div>
      <div className="action">
        <Link className="btn btn-line" href="/cover/crop">
          Buy another cover
        </Link>
        <SignOut />
      </div>
    </main>
  );
}
