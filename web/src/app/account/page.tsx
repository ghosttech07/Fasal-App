import {
  Bell,
  Check,
  ChevronRight,
  CloudRain,
  FileText,
  Headphones,
  IdCard,
  Landmark,
  LandPlot,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import Link from 'next/link';
import { SignOut } from '@/components/sign-out';
import { LanguageSelect } from '@/components/language-select';
import { StepBoard } from '@/components/step-board';
import { day, num1, phaseName, rupees, type Me, type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { Money } from '@/components/money';
import { getT } from '@/i18n/server';
import type { Key } from '@/i18n';

type Plot = {
  id: string;
  areaAcres: number | null;
  gpsAccuracyM: number | null;
  captureMethod: string;
  createdAt: string;
};

type State = 'done' | 'warn' | 'soon';

/** One account row: icon tile, label, a one-line status under it, optional value and chevron. */
function Row({
  icon,
  label,
  detail,
  state,
  status,
  href,
  value,
  soon,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: React.ReactNode;
  state?: State;
  status?: React.ReactNode;
  href?: string;
  value?: React.ReactNode;
  soon?: string;
}) {
  const inner = (
    <>
      <span className={`acc-ic${state === 'done' ? ' done' : ''}`}>
        {icon}
        {state === 'done' ? (
          <span className="acc-badge" aria-hidden="true">
            <Check size={11} strokeWidth={3} />
          </span>
        ) : null}
      </span>
      <span className="acc-txt">
        <span className="acc-l">{label}</span>
        {detail ? <span className="acc-d">{detail}</span> : null}
        {status ? <span className={`acc-s ${state ?? ''}`}>{status}</span> : null}
      </span>
      {value}
      {state === 'soon' && !href ? <span className="acc-soon">{soon}</span> : null}
      {href ? <ChevronRight size={20} aria-hidden="true" color="var(--ink-2)" /> : null}
    </>
  );
  return href ? (
    <Link href={href} className="acc-row">
      {inner}
    </Link>
  ) : (
    <div className="acc-row">{inner}</div>
  );
}

export default async function AccountPage() {
  const [me, plots, policies] = await Promise.all([
    serverGet<Me & { phone: string; kycStatus: string }>('/me'),
    serverGet<Plot[]>('/me/plots'),
    serverGet<Policy[]>('/policies'),
  ]);
  const { t } = await getT();
  const S = t('c.soon');
  const phone = me.phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2');
  const initials = (me.name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const live = policies.filter((p) => p.status === 'ACTIVE' || p.status === 'IN_WAITING');
  const cover = live.reduce((s, p) => s + p.sumInsuredPaise, 0);
  const paid = policies.reduce((s, p) => s + p.paidOutPaise, 0);
  const coming = policies
    .flatMap((p) => p.triggerEvents)
    .filter((e) => e.payoutStatus && e.payoutStatus !== 'SUCCESS')
    .reduce((s, e) => s + e.payoutAmountPaise, 0);

  const drought = live.find((p) => p.indexType === 'DROUGHT_RAIN_DEFICIT');
  const phase = drought?.phases.find((s) => s.state === 'IN_PROGRESS');

  // Mobile, UPI, identity, land record.
  const checks = [true, me.wallet?.status === 'VERIFIED', me.kycStatus === 'FULL', false];
  const done = checks.filter(Boolean).length;

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/', label: t('c.home') }}
        title={<span className="sr-only">{t('acc.title')}</span>}
      >
        <div className="who">
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="who-name">{me.name}</div>
            <div className="board-sub fig" style={{ fontSize: 15 }}>
              {me.farmerCode}
              {me.village ? ` · ${me.village}` : ''}
            </div>
          </div>
        </div>
        <dl className="tally">
          <div>
            <dt>{t('acc.cover')}</dt>
            <dd>
              <Money paise={cover} />
            </dd>
          </div>
          <div>
            <dt>{t('acc.onWay')}</dt>
            <dd className={coming ? 'gold' : ''}>
              <Money paise={coming} />
            </dd>
          </div>
          <div>
            <dt>{t('acc.paid')}</dt>
            <dd>
              <Money paise={paid} />
            </dd>
          </div>
        </dl>
      </StepBoard>

      <div className="work acc" style={{ gap: 26 }}>
        <section aria-labelledby="a-ver" className="acc-sec">
          <div className="acc-head">
            <h2 id="a-ver" className="h2">
              {t('acc.checks')}
            </h2>
            <span className="small">{t('acc.done', { n: done, total: checks.length })}</span>
          </div>
          <div
            className="acc-prog"
            role="img"
            aria-label={t('acc.done', { n: done, total: checks.length })}
          >
            {checks.map((c, i) => (
              <i key={i} className={c ? 'on' : ''} />
            ))}
          </div>
          <div className="acc-list">
            <Row
              icon={<Phone size={20} />}
              label={t('acc.mobile')}
              detail={phone}
              state="done"
              status={t('acc.smsVerified')}
            />
            <Row
              icon={<Landmark size={20} />}
              label={t('acc.upi')}
              detail={me.wallet ? me.wallet.handleMasked : t('acc.notLinked')}
              state={me.wallet?.status === 'VERIFIED' ? 'done' : 'warn'}
              status={
                me.wallet?.verifiedName
                  ? t('acc.bankName', { name: me.wallet.verifiedName })
                  : t('acc.linkUpi')
              }
              href={me.wallet ? undefined : '/setup/upi'}
            />
            <Row
              icon={<IdCard size={20} />}
              label={t('acc.identity')}
              detail={t('acc.idDetail')}
              soon={S}
              state={me.kycStatus === 'BASIC' ? 'warn' : 'soon'}
              status={me.kycStatus === 'BASIC' ? t('acc.idNoted') : undefined}
            />
            <Row
              icon={<LandPlot size={20} />}
              label={t('acc.land')}
              detail={t('acc.landDetail')}
              state="soon"
              soon={S}
            />
          </div>
        </section>

        <section aria-labelledby="a-wx" className="acc-sec">
          <h2 id="a-wx" className="h2">
            {t('acc.weather')}
          </h2>
          {drought && phase && phase.indexValue !== null ? (
            <Link href={`/policy/${drought.id}`} className="wx">
              <div className="wx-top">
                <CloudRain size={22} aria-hidden="true" color="var(--flood)" />
                <span>
                  {t('acc.fell', {
                    mm: num1(phase.observedMm),
                    phase: t(`phase.${phase.phaseId}` as Key) || phaseName(phase.phaseId),
                    normal: num1(phase.normalMm),
                  })}
                </span>
              </div>
              <div className="wx-bar" aria-hidden="true">
                <i
                  style={{
                    width: `${Math.min(100, (phase.observedMm / Math.max(phase.normalMm, 0.1)) * 100)}%`,
                  }}
                />
                <span className="wx-normal" />
              </div>
              <div className="wx-foot">
                <span className="tag tag-warn">
                  {t('pol.belowNormal', { pct: num1(phase.indexValue) })}
                </span>
                <span className="small">{t('acc.updated', { date: day(new Date()) })}</span>
              </div>
            </Link>
          ) : (
            <p className="small">{t('acc.noRain')}</p>
          )}
          <div className="acc-list">
            <Row
              icon={<Sun size={20} />}
              label={t('acc.forecast')}
              detail={t('acc.forecastD')}
              state="soon"
              soon={S}
            />
            <Row
              icon={<Bell size={20} />}
              label={t('acc.alerts')}
              detail={t('acc.alertsD')}
              state="soon"
              soon={S}
            />
          </div>
        </section>

        <section aria-labelledby="a-field" className="acc-sec">
          <h2 id="a-field" className="h2">
            {t('acc.fields')}
          </h2>
          <div className="acc-list">
            {plots.map((p, i) => (
              <Row
                key={p.id}
                icon={<MapPin size={20} />}
                label={`${t('acc.field', { n: i + 1 })} · ${p.areaAcres ? `${p.areaAcres.toFixed(1)} ${t('field.acres')}` : t('acc.sizeNotSet')}`}
                detail={`${me.village ?? ''} · ${t('acc.added', { date: day(p.createdAt) })}`}
                state={p.captureMethod === 'GPS_PIN' ? 'done' : 'warn'}
                status={
                  p.captureMethod === 'GPS_PIN' && p.gpsAccuracyM
                    ? t('field.accurate', { m: Math.round(p.gpsAccuracyM) })
                    : t('acc.placed')
                }
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="a-cover" className="acc-sec">
          <h2 id="a-cover" className="h2">
            {t('acc.covers')}
          </h2>
          <div className="acc-list">
            {policies.length === 0 ? (
              <Row
                icon={<ShieldCheck size={20} />}
                label={t('acc.noCover')}
                detail={t('home.buy')}
                href="/cover/crop"
              />
            ) : null}
            {policies.map((p) => (
              <Row
                key={p.id}
                icon={p.peril === 'FLOOD' ? <CloudRain size={20} /> : <Sun size={20} />}
                label={`${t(`prod.${p.peril}` as Key)}, ${t(`crop.${p.cropCode}` as Key)}`}
                detail={<span className="fig">{p.policyNumber}</span>}
                value={<span className="fig acc-val">{rupees(p.sumInsuredPaise)}</span>}
                href={`/policy/${p.id}`}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="a-pol" className="acc-sec">
          <h2 id="a-pol" className="h2">
            {t('acc.help')}
          </h2>
          <div className="acc-list">
            <Row
              icon={<FileText size={20} />}
              label={t('acc.rules')}
              detail={t('acc.rulesD')}
              href="/account/payouts"
            />
            <Row
              icon={<FileText size={20} />}
              label={t('acc.terms')}
              detail={t('acc.termsD')}
              href="/legal/terms"
            />
            <Row
              icon={<FileText size={20} />}
              label={t('acc.pay')}
              detail={t('acc.payD')}
              href="/legal/terms"
            />
            <Row
              icon={<ShieldCheck size={20} />}
              label={t('acc.data')}
              detail={t('acc.dataD')}
              href="/legal/privacy"
            />
            <Row
              icon={<Scale size={20} />}
              label={t('acc.compl')}
              detail={t('acc.complD')}
              href="/legal/grievance"
            />
            <Row
              icon={<Headphones size={20} />}
              label={t('acc.problem')}
              detail={t('acc.problemD')}
              href="/help"
            />
            <Row
              icon={<Bell size={20} />}
              label={t('home.messages')}
              detail={t('acc.msgsD')}
              href="/inbox"
            />
          </div>
        </section>

        <LanguageSelect />

        <div style={{ display: 'grid', gap: 4, justifyItems: 'center', paddingTop: 4 }}>
          <SignOut />
          <span className="small" style={{ fontSize: 13 }}>
            {t('acc.oneAcct')}
          </span>
        </div>
      </div>
    </main>
  );
}
