'use client';

import { CloudRain, LoaderCircle, Sun } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { messageFor, post } from '@/lib/client';
import { phaseName, rupees } from '@/lib/format';
import { useT } from '@/i18n/client';
import type { Key } from '@/i18n';

type Quote = {
  productVersionId: string;
  names: unknown;
  peril: 'DROUGHT' | 'FLOOD';
  sumInsuredPaise: number;
  premiumPaise: number;
  subsidyPaise: number;
  netPaise: number;
  areaAcres: number;
  phases: { id: string }[];
  examplePayouts: { threshold: number; unit: string; amountPaise: number; phaseId: string }[];
};

function rule(e: Quote['examplePayouts'][number], t: ReturnType<typeof useT>['t']) {
  if (e.unit === 'PCT_BELOW_NORMAL') return t('choose.rainBelow', { pct: e.threshold });
  const days = /MM_IN_(\d+)_DAYS/.exec(e.unit)?.[1] ?? '3';
  return t('choose.mmDays', { mm: e.threshold, n: days });
}

function Choose() {
  const router = useRouter();
  const { t } = useT();
  const q = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const crop = q.get('crop') ?? '';

  useEffect(() => {
    post<Quote[]>('/api/fs/quotes', {
      plotId: q.get('plot'),
      cropCode: crop,
      seasonCode: q.get('season'),
    })
      .then((r) =>
        setQuotes(
          [...r].sort((a, b) => Number(a.peril !== 'DROUGHT') - Number(b.peril !== 'DROUGHT')),
        ),
      )
      .catch((e) => setError(messageFor(e)));
  }, [q, crop]);

  async function choose(v: Quote) {
    setBusy(v.productVersionId);
    setError(null);
    try {
      const policy = await post<{ id: string }>('/api/fs/policies', {
        productVersionId: v.productVersionId,
        plotId: q.get('plot'),
        cropCode: crop,
      });
      router.push(`/cover/pay/${policy.id}`);
    } catch (e) {
      setError(messageFor(e));
      setBusy(null);
    }
  }

  const acres = quotes?.[0]?.areaAcres;
  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/cover/crop', label: t('c.crop') }}
        title={t('choose.title')}
        sub={`${t(`crop.${crop}` as Key)}${acres ? ` · ${acres.toFixed(1)} ${t('field.acres')}` : ''}`}
      />
      <div className="work" style={{ gap: 12 }}>
        {error ? <FormError>{error}</FormError> : null}
        {quotes === null && !error ? <p className="small">{t('choose.loading')}</p> : null}
        {quotes?.length === 0 ? <p className="small">{t('choose.none')}</p> : null}
        {quotes?.map((v) => (
          <article
            className="cover"
            key={v.productVersionId}
            aria-labelledby={`n-${v.productVersionId}`}
          >
            <div className="head">
              <h2 className="nm" id={`n-${v.productVersionId}`} style={{ margin: 0 }}>
                {v.peril === 'DROUGHT' ? (
                  <Sun size={22} aria-hidden="true" color="#e8a35a" />
                ) : (
                  <CloudRain size={22} aria-hidden="true" color="#8fb0ff" />
                )}
                {t(`prod.${v.peril}`)}
              </h2>
              <span style={{ fontSize: 14, color: 'var(--chalk-2)' }}>
                {v.examplePayouts[0]
                  ? t('choose.ifThis', {
                      phase:
                        t(`phase.${v.examplePayouts[0].phaseId}` as Key) ||
                        phaseName(v.examplePayouts[0].phaseId),
                    })
                  : null}
              </span>
              <div className="rates-d">
                {v.examplePayouts.map((e) => (
                  <div key={e.threshold}>
                    <span>{rule(e, t)}</span>
                    <b>{rupees(e.amountPaise)}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="foot">
              <div>
                <div className="sub">{t('choose.youPay')}</div>
                <div className="pay fig">{rupees(v.netPaise)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {v.subsidyPaise > 0 ? (
                  <div className="sub">{t('choose.sponsor', { amt: rupees(v.subsidyPaise) })}</div>
                ) : null}
                <div className="sub">
                  {t('choose.upTo')}{' '}
                  <b className="fig" style={{ color: 'var(--ink)', fontSize: 17 }}>
                    {rupees(v.sumInsuredPaise)}
                  </b>
                </div>
              </div>
            </div>
            <button className="btn" type="button" disabled={!!busy} onClick={() => choose(v)}>
              {busy === v.productVersionId ? (
                <LoaderCircle className="spin" size={20} aria-hidden="true" />
              ) : null}
              {t('choose.choose', { name: t(`prod.${v.peril}`) })}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}

export default function ChoosePage() {
  return (
    <Suspense fallback={<main className="screen" />}>
      <Choose />
    </Suspense>
  );
}
