import { Check, CircleDashed, Landmark, MapPin, Smartphone, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { StepBoard } from '@/components/step-board';
import { day } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import { getT } from '@/i18n/server';
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
  const { t, lang: ui } = await getT();
  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/agent', label: t('ag.back') }}
        title={f.name ?? f.code}
        sub={`${f.code} · ${f.village ?? ''} · ${f.phone}`}
      />
      <div className="work" style={{ gap: 18 }}>
        <div className="acc-list">
          <Item
            done
            icon={<UserCheck size={20} />}
            title={t('ag.enrolled')}
            detail={t('ag.consentLang', { lang })}
          />
          <Item
            done={f.plots.length > 0}
            icon={<MapPin size={20} />}
            title={t('ag.fieldPinned')}
            detail={
              f.plots.length
                ? f.plots
                    .map(
                      (p) =>
                        `${t('ag.fieldLine', { acres: (p.areaAcres ?? 0).toFixed(1), m: Math.round(p.gpsAccuracyM ?? 0), date: day(p.createdAt, false, ui) })}${p.status === 'FLAGGED' ? t('ag.flagged') : ''}`,
                    )
                    .join(' / ')
                : t('ag.pinHow')
            }
            action={
              <Link className="link" href={`/agent/farmers/${f.id}/field`}>
                {f.plots.length ? t('ag.pinAnother') : t('ag.pinNow')}
              </Link>
            }
          />
          <Item
            done={!!f.wallet}
            icon={<Landmark size={20} />}
            title={t('acc.upi')}
            detail={
              f.wallet
                ? `${f.wallet.handleMasked} · ${f.wallet.verifiedName ?? ''}`
                : t('ag.upiHow')
            }
            action={
              f.wallet ? null : (
                <Link className="link" href={`/agent/farmers/${f.id}/upi`}>
                  {t('ag.linkUpi')}
                </Link>
              )
            }
          />
          <Item
            done={false}
            icon={ready ? <Smartphone size={20} /> : <CircleDashed size={20} />}
            title={t('ag.buys')}
            detail={ready ? t('ag.buysReady') : t('ag.buysWait')}
          />
        </div>
        <p className="small">{t('ag.noMoney')}</p>
      </div>
    </main>
  );
}
