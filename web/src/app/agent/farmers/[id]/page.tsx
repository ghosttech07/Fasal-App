import { Check, CircleDashed, Landmark, MapPin, Smartphone, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { StepBoard } from '@/components/step-board';
import { day } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { LANGUAGES, isLanguageCode } from '@fasalshield/shared';

type Detail = {
  id: string;
  code: string;
  name: string | null;
  phone: string;
  village: string | null;
  districtCode: string | null;
  language: string;
  plots: {
    id: string;
    areaAcres: number | null;
    gpsAccuracyM: number | null;
    surveyNo: string | null;
    status: string;
    createdAt: string;
  }[];
  wallet: { handleMasked: string; verifiedName: string | null; status: string } | null;
};

function Item({
  done,
  icon,
  title,
  detail,
  action,
}: {
  done: boolean;
  icon: React.ReactNode;
  title: string;
  detail: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="acc-row" style={{ alignItems: 'flex-start' }}>
      <span className={`acc-ic${done ? ' done' : ''}`}>
        {icon}
        {done ? (
          <span className="acc-badge" aria-hidden="true">
            <Check size={11} strokeWidth={3} />
          </span>
        ) : null}
      </span>
      <span className="acc-txt" style={{ gap: 6 }}>
        <span className="acc-l">{title}</span>
        <span className="acc-d">{detail}</span>
        {action}
      </span>
    </div>
  );
}

/** One enrolled farmer: what is done, what the agent still has to do, and what the farmer does next. */
export default async function AgentFarmer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await serverGet<Detail>(`/agent/farmers/${id}`);
  const lang = isLanguageCode(f.language) ? LANGUAGES[f.language].nativeName : f.language;
  const ready = f.plots.length > 0 && !!f.wallet;
  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/agent', label: 'Your farmers' }}
        title={f.name ?? f.code}
        sub={`${f.code} · ${f.village ?? ''} · ${f.phone}`}
      />
      <div className="work" style={{ gap: 18 }}>
        <div className="acc-list">
          <Item
            done
            icon={<UserCheck size={20} />}
            title="Enrolled"
            detail={`Consent given · language ${lang}`}
          />
          <Item
            done={f.plots.length > 0}
            icon={<MapPin size={20} />}
            title="Field pinned"
            detail={
              f.plots.length
                ? f.plots
                    .map(
                      (p) =>
                        `${(p.areaAcres ?? 0).toFixed(1)} acres · ±${Math.round(p.gpsAccuracyM ?? 0)} m · ${day(p.createdAt)}${p.status === 'FLAGGED' ? ' · flagged for a land check' : ''}`,
                    )
                    .join(' / ')
                : 'Stand in the field with the farmer and pin it by GPS.'
            }
            action={
              <Link className="link" href={`/agent/farmers/${f.id}/field`}>
                {f.plots.length ? 'Pin another field' : 'Pin the field now'}
              </Link>
            }
          />
          <Item
            done={!!f.wallet}
            icon={<Landmark size={20} />}
            title="UPI for payouts"
            detail={
              f.wallet
                ? `${f.wallet.handleMasked} · ${f.wallet.verifiedName ?? ''}`
                : 'The farmer’s own UPI ID, in their name.'
            }
            action={
              f.wallet ? null : (
                <Link className="link" href={`/agent/farmers/${f.id}/upi`}>
                  Link UPI now
                </Link>
              )
            }
          />
          <Item
            done={false}
            icon={ready ? <Smartphone size={20} /> : <CircleDashed size={20} />}
            title="Farmer buys cover on their phone"
            detail={
              ready
                ? 'Ask the farmer to open FasalShield and sign in with their number. Their setup is done; they choose a crop and pay from their own UPI.'
                : 'After the field and UPI are done.'
            }
          />
        </div>
        <p className="small">
          You never collect money. The farmer pays the premium from their own UPI app, and payouts
          go only to their UPI ID.
        </p>
      </div>
    </main>
  );
}
