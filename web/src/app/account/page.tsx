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
import { StepBoard } from '@/components/step-board';
import { day, en, num1, phaseName, rupees, type Me, type Policy } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { Money } from '@/components/money';

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
}: {
  icon: React.ReactNode;
  label: string;
  detail?: React.ReactNode;
  state?: State;
  status?: React.ReactNode;
  href?: string;
  value?: React.ReactNode;
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
      {state === 'soon' && !href ? <span className="acc-soon">Soon</span> : null}
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
        back={{ href: '/', label: 'Home' }}
        title={<span className="sr-only">Your account</span>}
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
            <dt>Cover</dt>
            <dd>
              <Money paise={cover} />
            </dd>
          </div>
          <div>
            <dt>On the way</dt>
            <dd className={coming ? 'gold' : ''}>
              <Money paise={coming} />
            </dd>
          </div>
          <div>
            <dt>Paid to you</dt>
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
              Account checks
            </h2>
            <span className="small">
              {done} of {checks.length} done
            </span>
          </div>
          <div
            className="acc-prog"
            role="img"
            aria-label={`${done} of ${checks.length} checks done`}
          >
            {checks.map((c, i) => (
              <i key={i} className={c ? 'on' : ''} />
            ))}
          </div>
          <div className="acc-list">
            <Row
              icon={<Phone size={20} />}
              label="Mobile number"
              detail={phone}
              state="done"
              status="Verified by SMS code"
            />
            <Row
              icon={<Landmark size={20} />}
              label="UPI for payouts"
              detail={me.wallet ? me.wallet.handleMasked : 'Not linked yet'}
              state={me.wallet?.status === 'VERIFIED' ? 'done' : 'warn'}
              status={
                me.wallet?.verifiedName
                  ? `Bank name: ${me.wallet.verifiedName}`
                  : 'Link a UPI ID to get paid'
              }
              href={me.wallet ? undefined : '/setup/upi'}
            />
            <Row
              icon={<IdCard size={20} />}
              label="Identity"
              detail="Aadhaar, DigiLocker or a photo of your voter ID"
              state={me.kycStatus === 'BASIC' ? 'warn' : 'soon'}
              status={
                me.kycStatus === 'BASIC' ? 'ID number noted · full check coming soon' : undefined
              }
            />
            <Row
              icon={<LandPlot size={20} />}
              label="Land record (7/12)"
              detail="Optional · shows the field is yours"
              state="soon"
            />
          </div>
        </section>

        <section aria-labelledby="a-wx" className="acc-sec">
          <h2 id="a-wx" className="h2">
            Weather at your field
          </h2>
          {drought && phase && phase.indexValue !== null ? (
            <Link href={`/policy/${drought.id}`} className="wx">
              <div className="wx-top">
                <CloudRain size={22} aria-hidden="true" color="var(--flood)" />
                <span>
                  <b className="fig">{num1(phase.observedMm)} mm</b> fell in{' '}
                  {phaseName(phase.phaseId).toLowerCase()} · normal by now{' '}
                  <span className="fig">{num1(phase.normalMm)} mm</span>
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
                <span className="tag tag-warn">{num1(phase.indexValue)}% below normal</span>
                <span className="small">Updated {day(new Date())}</span>
              </div>
            </Link>
          ) : (
            <p className="small">Rain on your field shows here once your cover starts.</p>
          )}
          <div className="acc-list">
            <Row
              icon={<Sun size={20} />}
              label="5-day forecast"
              detail="Rain and heat expected at your field"
              state="soon"
            />
            <Row
              icon={<Bell size={20} />}
              label="Alerts by SMS"
              detail="When money is sent or rain nears a payout mark"
              state="soon"
            />
          </div>
        </section>

        <section aria-labelledby="a-field" className="acc-sec">
          <h2 id="a-field" className="h2">
            My fields
          </h2>
          <div className="acc-list">
            {plots.map((p, i) => (
              <Row
                key={p.id}
                icon={<MapPin size={20} />}
                label={`Field ${i + 1} · ${p.areaAcres ? `${p.areaAcres.toFixed(1)} acres` : 'size not set'}`}
                detail={`${me.village ?? ''} · added ${day(p.createdAt)}`}
                state={p.captureMethod === 'GPS_PIN' ? 'done' : 'warn'}
                status={
                  p.captureMethod === 'GPS_PIN' && p.gpsAccuracyM
                    ? `GPS accurate to ${Math.round(p.gpsAccuracyM)} m`
                    : 'Placed on the map, not checked by GPS'
                }
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="a-cover" className="acc-sec">
          <h2 id="a-cover" className="h2">
            My covers
          </h2>
          <div className="acc-list">
            {policies.length === 0 ? (
              <Row
                icon={<ShieldCheck size={20} />}
                label="No cover yet"
                detail="Buy cover for this season"
                href="/cover/crop"
              />
            ) : null}
            {policies.map((p) => (
              <Row
                key={p.id}
                icon={p.peril === 'FLOOD' ? <CloudRain size={20} /> : <Sun size={20} />}
                label={`${en(p.names)}, ${p.cropCode.toLowerCase()}`}
                detail={<span className="fig">{p.policyNumber}</span>}
                value={<span className="fig acc-val">{rupees(p.sumInsuredPaise)}</span>}
                href={`/policy/${p.id}`}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="a-pol" className="acc-sec">
          <h2 id="a-pol" className="h2">
            Policies and help
          </h2>
          <div className="acc-list">
            <Row
              icon={<FileText size={20} />}
              label="How payouts are calculated"
              detail="Worked out on your own cover"
              href="/account/payouts"
            />
            <Row
              icon={<FileText size={20} />}
              label="Terms of cover"
              detail="The insurer's policy wording"
              state="soon"
            />
            <Row
              icon={<FileText size={20} />}
              label="Payments and refunds"
              detail="Where your premium goes · cancelling"
              state="soon"
            />
            <Row
              icon={<ShieldCheck size={20} />}
              label="Your data"
              detail="See it, withdraw consent or delete it"
              state="soon"
            />
            <Row
              icon={<Scale size={20} />}
              label="Complaints"
              detail="Grievance officer · Bima Bharosa · Ombudsman"
              state="soon"
            />
            <Row
              icon={<Headphones size={20} />}
              label="Help"
              detail="Call or WhatsApp us, or ask your field agent"
              state="soon"
            />
          </div>
        </section>

        <div style={{ display: 'grid', gap: 4, justifyItems: 'center', paddingTop: 4 }}>
          <SignOut />
          <span className="small" style={{ fontSize: 13 }}>
            One mobile number, one account
          </span>
        </div>
      </div>
    </main>
  );
}
