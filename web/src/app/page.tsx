import {
  ArrowRight,
  Bell,
  CircleUserRound,
  Banknote,
  Check,
  ChevronRight,
  CloudRain,
  Satellite,
  Sun,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Mark } from '@/components/mark';
import { RainMeter } from '@/components/rain-meter';
import {
  daysBetween,
  day,
  en,
  nextSetupStep,
  phaseName,
  rupees,
  type Me,
  type Policy,
} from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { Money } from '@/components/money';
import { getT } from '@/i18n/server';
import type { T } from '@/i18n';

type Plot = { id: string; areaAcres: number | null; createdAt: string };
type Season = { code: string; namesI18n: unknown };

export default async function Home() {
  const me = await serverGet<Me>('/me');
  const step = nextSetupStep(me);
  if (step) redirect(step);

  const [policies, plots, seasons] = await Promise.all([
    serverGet<Policy[]>('/policies'),
    serverGet<Plot[]>('/me/plots'),
    serverGet<Season[]>('/catalog/seasons'),
  ]);
  const { t, lang } = await getT();
  const live = policies.filter((p) => p.status === 'ACTIVE' || p.status === 'IN_WAITING');
  return live.length ? (
    <RainBoard me={me} policies={live} t={t} />
  ) : (
    <BeforeBuying me={me} plot={plots[0]} season={seasons[0]} t={t} lang={lang} />
  );
}

function BeforeBuying({
  me,
  plot,
  season,
  t,
  lang,
}: {
  me: Me;
  plot?: Plot;
  season?: Season;
  t: T;
  lang: string;
}) {
  return (
    <main className="screen">
      <section className="board" aria-labelledby="who">
        <div className="top">
          <Mark />
          <AccountButton t={t} />
        </div>
        <h1 id="who" className="board-title">
          {me.name}
        </h1>
        <p className="board-sub">
          {plot?.areaAcres
            ? t('home.field', { n: plot.areaAcres.toFixed(1) })
            : t('home.yourField')}
          {me.village ? `, ${me.village}` : ''} · {me.wallet?.handleMasked}
        </p>
        {season ? (
          <span className="tag tag-gold" style={{ justifySelf: 'start' }}>
            {t('home.open', {
              season: (season.namesI18n as Record<string, string>)?.[lang] ?? en(season.namesI18n),
            })}
          </span>
        ) : null}
      </section>
      <div className="work">
        <h2 className="h2">{t('home.how')}</h2>
        <div className="steps">
          <div>
            <b>1</b>
            <span>{t('home.h1')}</span>
          </div>
          <div>
            <b>2</b>
            <span>{t('home.h2')}</span>
          </div>
          <div>
            <b>3</b>
            <span>{t('home.h3')}</span>
          </div>
        </div>
      </div>
      <div className="action">
        <Link className="btn" href="/cover/crop">
          {t('home.buy')} <ArrowRight size={22} aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}

/** The phase a farmer cares about today: the one in progress, else the latest finished, else the first. */
function currentPhase(p: Policy) {
  return (
    p.phases.find((s) => s.state === 'IN_PROGRESS') ??
    [...p.phases].reverse().find((s) => s.state === 'COMPLETE') ??
    p.phases[0]
  );
}

function RainBoard({ me, policies, t }: { me: Me; policies: Policy[]; t: T }) {
  const p = policies[0]!;
  const phase = currentPhase(p);
  const plan = p.phasePlan.find((x) => x.id === phase?.phaseId);
  const flood = p.indexType === 'FLOOD_EXCESS_RAIN';
  const coming = p.triggerEvents.filter((e) => e.payoutStatus && e.payoutStatus !== 'SUCCESS');
  const comingPaise = coming.reduce((s, e) => s + e.payoutAmountPaise, 0);
  const due = coming
    .map((e) => e.slaDueAt)
    .filter(Boolean)
    .sort()[0];

  return (
    <main className="screen">
      <section className="board" aria-label="Rain on your field">
        <div className="top">
          <Mark />
          <AccountButton t={t} />
        </div>
        {phase && plan ? (
          <span className="board-sub" style={{ fontSize: 15, marginTop: -6 }}>
            {t(`phase.${phase.phaseId}` as never) || phaseName(phase.phaseId)}
            {' · '}
            {phase.state === 'IN_PROGRESS'
              ? t('home.dayOf', { d: phase.daysElapsed, n: daysBetween(plan.from, plan.to) })
              : phase.state === 'UPCOMING'
                ? t('home.starts', { date: day(plan.from) })
                : t('home.ended')}
          </span>
        ) : null}
        {phase && plan && phase.state !== 'UPCOMING' ? (
          <RainMeter
            phase={phase}
            slabs={p.slabs}
            phaseAmountPaise={plan.amountPaise}
            flood={flood}
            rollingDays={p.rollingDays ?? 3}
            t={t}
          />
        ) : (
          <p className="board-title" style={{ fontSize: 26 }}>
            {t('home.notYet', { date: plan ? day(plan.from) : '' })}
          </p>
        )}
      </section>

      <div className="work" style={{ gap: 12 }}>
        {comingPaise > 0 ? (
          <div className="money">
            <Banknote size={30} aria-hidden="true" color="var(--board)" />
            <div style={{ display: 'grid', gap: 3 }}>
              <span className="amt">
                <Money paise={comingPaise} suffix={t('home.onWay')} />
              </span>
              <span className="s">
                {t('home.approved', {
                  when: due
                    ? `${day(due)}, ${new Date(due).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}`
                    : t('home.tomorrow'),
                })}
              </span>
            </div>
          </div>
        ) : null}

        <div className="ruled">
          <div>
            <span className="k" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {flood ? (
                <CloudRain size={18} aria-hidden="true" color="var(--flood)" />
              ) : (
                <Sun size={18} aria-hidden="true" color="var(--drought)" />
              )}
              {t(`prod.${p.peril}` as never)}, {t(`crop.${p.cropCode}` as never)}
            </span>
            <span className="tag">
              <Check size={14} aria-hidden="true" />{' '}
              {p.status === 'ACTIVE' ? t('home.active') : t('home.startsSoon')}
            </span>
          </div>
          <div>
            <span className="k">{t('home.cover')}</span>
            <span className="v">{rupees(p.sumInsuredPaise)}</span>
          </div>
          <div>
            <span className="k">{t('home.paidSoFar')}</span>
            <span className="v">{rupees(p.paidOutPaise)}</span>
          </div>
        </div>
        <Link className="link" href={`/policy/${p.id}`}>
          {t('home.details')}
        </Link>

        {policies.length > 1 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <h2 className="h2" style={{ fontSize: 19 }}>
              {t('home.others')}
            </h2>
            {policies.slice(1).map((o) => (
              <Link
                key={o.id}
                href={`/policy/${o.id}`}
                className="money quiet"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {o.peril === 'FLOOD' ? (
                  <CloudRain size={22} aria-hidden="true" color="var(--flood)" />
                ) : (
                  <Sun size={22} aria-hidden="true" color="var(--drought)" />
                )}
                <span style={{ flex: 1 }}>
                  {t(`prod.${o.peril}` as never)} · {rupees(o.sumInsuredPaise)}
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : null}

        <p className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Satellite size={18} aria-hidden="true" /> {t('home.checked')}
        </p>
      </div>
      <div className="action">
        <Link className="btn btn-line" href="/cover/crop">
          {t('home.buyAnother')}
        </Link>
      </div>
    </main>
  );
}

function AccountButton({ t }: { t: T }) {
  return (
    <span style={{ display: 'flex', gap: 8 }}>
      <Link href="/inbox" className="acc-btn" aria-label={t('home.messages')}>
        <Bell size={22} aria-hidden="true" />
      </Link>
      <Link href="/account" className="acc-btn" aria-label={t('home.account')}>
        <CircleUserRound size={24} aria-hidden="true" />
      </Link>
    </span>
  );
}
