import {
  BadgeCheck,
  Bell,
  ChevronRight,
  CloudRain,
  FileText,
  HandCoins,
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

type Plot = {
  id: string;
  areaAcres: number | null;
  gpsAccuracyM: number | null;
  captureMethod: string;
  createdAt: string;
};

function Row({
  icon,
  label,
  detail,
  state,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: React.ReactNode;
  state?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <span className="acc-ic">{icon}</span>
      <span className="acc-txt">
        <span className="acc-l">{label}</span>
        {detail ? <span className="acc-d">{detail}</span> : null}
      </span>
      {state}
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

const Done = ({ children = 'Verified' }: { children?: React.ReactNode }) => (
  <span className="tag">
    <BadgeCheck size={15} aria-hidden="true" /> {children}
  </span>
);
const Soon = () => <span className="tag tag-quiet">Coming soon</span>;

export default async function AccountPage() {
  const [me, plots, policies] = await Promise.all([
    serverGet<Me & { phone: string; kycStatus: string }>('/me'),
    serverGet<Plot[]>('/me/plots'),
    serverGet<Policy[]>('/policies'),
  ]);
  const phone = me.phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2');
  const live = policies.find((p) => p.status === 'ACTIVE' || p.status === 'IN_WAITING');
  const phase = live?.phases.find((s) => s.state === 'IN_PROGRESS');
  const paid = policies.reduce((s, p) => s + p.paidOutPaise, 0);

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/', label: 'Home' }}
        title={me.name ?? 'Your account'}
        sub={
          <span className="fig">
            {me.farmerCode} · {phone}
          </span>
        }
      >
        <p className="board-sub" style={{ fontSize: 15 }}>
          One mobile number, one account. Only you can sign in to it.
        </p>
      </StepBoard>

      <div className="work acc" style={{ gap: 22 }}>
        <section aria-labelledby="a-ver" className="acc-sec">
          <h2 id="a-ver" className="h2">
            Verifications
          </h2>
          <div className="acc-list">
            <Row icon={<Phone size={20} />} label="Mobile number" detail={phone} state={<Done />} />
            <Row
              icon={<Landmark size={20} />}
              label="UPI account for payouts"
              detail={
                me.wallet ? `${me.wallet.verifiedName} · ${me.wallet.handleMasked}` : 'Not linked'
              }
              state={me.wallet?.status === 'VERIFIED' ? <Done>Name matched</Done> : null}
              href={me.wallet ? undefined : '/setup/upi'}
            />
            <Row
              icon={<IdCard size={20} />}
              label="Identity (KYC)"
              detail={
                me.kycStatus === 'BASIC'
                  ? 'ID number recorded. Full check needed before large payouts'
                  : 'Aadhaar, DigiLocker or a photo of your voter ID'
              }
              state={
                me.kycStatus === 'BASIC' ? <span className="tag tag-warn">Basic</span> : <Soon />
              }
            />
            <Row
              icon={<LandPlot size={20} />}
              label="Land record (7/12)"
              detail="Optional. Proves the field is yours"
              state={<Soon />}
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
                label={`Field ${i + 1}${p.areaAcres ? `, ${p.areaAcres.toFixed(1)} acres` : ''}`}
                detail={`${me.village ?? ''} · ${p.captureMethod === 'GPS_PIN' && p.gpsAccuracyM ? `GPS accurate to ${Math.round(p.gpsAccuracyM)} m` : 'Placed on map, not yet checked'} · added ${day(p.createdAt)}`}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="a-cover" className="acc-sec">
          <h2 id="a-cover" className="h2">
            My covers and payouts
          </h2>
          <div className="acc-list">
            {policies.length === 0 ? (
              <Row
                icon={<ShieldCheck size={20} />}
                label="No cover yet"
                detail="Buy cover from the home screen"
                href="/cover/crop"
              />
            ) : null}
            {policies.map((p) => (
              <Row
                key={p.id}
                icon={p.peril === 'FLOOD' ? <CloudRain size={20} /> : <Sun size={20} />}
                label={`${en(p.names)}, ${p.cropCode.toLowerCase()}`}
                detail={`${p.policyNumber} · cover ${rupees(p.sumInsuredPaise)}`}
                href={`/policy/${p.id}`}
              />
            ))}
            <Row
              icon={<HandCoins size={20} />}
              label="Paid to you so far"
              state={
                <span className="fig" style={{ fontWeight: 600, fontSize: 20 }}>
                  {rupees(paid)}
                </span>
              }
            />
          </div>
        </section>

        <section aria-labelledby="a-wx" className="acc-sec">
          <h2 id="a-wx" className="h2">
            Weather for my field
          </h2>
          <div className="acc-list">
            {phase && phase.indexValue !== null ? (
              <Row
                icon={<CloudRain size={20} />}
                label={`${phaseName(phase.phaseId)}: ${num1(phase.observedMm)} mm of rain so far`}
                detail={
                  live?.indexType === 'DROUGHT_RAIN_DEFICIT'
                    ? `Normal by now is ${num1(phase.normalMm)} mm · ${num1(phase.indexValue)}% below normal`
                    : `Heaviest ${live?.rollingDays}-day rain ${num1(phase.indexValue)} mm`
                }
              />
            ) : (
              <Row
                icon={<CloudRain size={20} />}
                label="Rain on your field"
                detail="Shows here once your cover starts"
              />
            )}
            <Row
              icon={<Sun size={20} />}
              label="5-day forecast"
              detail="Rain and heat expected at your field"
              state={<Soon />}
            />
            <Row
              icon={<Bell size={20} />}
              label="Alerts"
              detail="SMS when money is sent or rain nears a payout mark"
              state={<Soon />}
            />
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
              detail="Cover × phase share × the mark the rain crossed"
              href="/account/payouts"
            />
            <Row
              icon={<FileText size={20} />}
              label="Terms of cover"
              detail="The insurer's policy wording"
              state={<Soon />}
            />
            <Row
              icon={<FileText size={20} />}
              label="Payments and refunds"
              detail="Where your premium goes, cancelling"
              state={<Soon />}
            />
            <Row
              icon={<ShieldCheck size={20} />}
              label="Your data and privacy"
              detail={
                me.onboarding.consent
                  ? `You agreed on sign-up · see, withdraw or delete your data`
                  : 'Not agreed yet'
              }
              state={<Soon />}
            />
            <Row
              icon={<Scale size={20} />}
              label="Complaints"
              detail="Grievance officer, Bima Bharosa, Ombudsman"
              state={<Soon />}
            />
            <Row
              icon={<Headphones size={20} />}
              label="Help"
              detail="Call or WhatsApp us, or ask your field agent"
              state={<Soon />}
            />
          </div>
        </section>
      </div>
      <div className="action" style={{ position: 'static' }}>
        <SignOut />
      </div>
    </main>
  );
}
