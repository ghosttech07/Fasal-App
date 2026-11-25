'use client';

import {
  ArrowRight,
  Check,
  LoaderCircle,
  LocateFixed,
  Minus,
  Plus,
  TriangleAlert,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Pin } from '@/components/field-map';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { messageFor, post } from '@/lib/client';
import { averagedFix } from '@/lib/gps';
import { useT } from '@/i18n/client';

const FieldMap = dynamic(() => import('@/components/field-map'), {
  ssr: false,
  loading: () => <div className="map" />,
});

// shortcut: demo deployments (desktop browsers have no precise GPS) may place the pin by tapping the map; the plot is saved as DRAW, unverified. Never enable for real farmers.
const ALLOW_TAP = process.env.NEXT_PUBLIC_ALLOW_MAP_PIN === '1';

export default function FieldPage() {
  const router = useRouter();
  const { t } = useT();
  const [pin, setPin] = useState<Pin | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [method, setMethod] = useState<'GPS_PIN' | 'DRAW'>('GPS_PIN');
  const [reading, setReading] = useState<number | null>(null); // live best accuracy while locating
  const [locating, setLocating] = useState(false);
  const [acres, setAcres] = useState(2);
  const [survey, setSurvey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function locate() {
    setLocating(true);
    setError(null);
    setReading(null);
    try {
      const fix = await averagedFix(12_000, setReading);
      setPin({ lat: fix.lat, lng: fix.lng });
      setAccuracy(fix.accuracyM);
      setMethod('GPS_PIN');
    } catch (e) {
      const m = (e as Error).message;
      setError(m === 'denied' ? t('field.locOff') : t('field.noFix'));
    } finally {
      setLocating(false);
    }
  }

  const good = method === 'DRAW' || (accuracy !== null && accuracy < 20);
  const usable = !!pin && (method === 'DRAW' || (accuracy !== null && accuracy < 50));

  async function save() {
    if (!pin || !usable) return;
    setBusy(true);
    setError(null);
    try {
      await post('/api/fs/me/plots', {
        lat: pin.lat,
        lng: pin.lng,
        accuracyM: method === 'DRAW' ? 0 : Math.round(accuracy!),
        areaAcres: acres,
        captureMethod: method,
        surveyNo: survey.trim() || undefined,
      });
      router.push('/setup/upi');
    } catch (e) {
      setError(messageFor(e));
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/setup/about', label: t('c.back') }}
        step={2}
        title={t('field.title')}
        sub={t('field.sub')}
      />
      <div className="work">
        <div className="map">
          <FieldMap
            pin={pin}
            accuracyM={method === 'GPS_PIN' ? accuracy : null}
            onTap={
              ALLOW_TAP
                ? (p) => {
                    setPin(p);
                    setAccuracy(null);
                    setMethod('DRAW');
                  }
                : undefined
            }
          />
          {pin ? (
            <span className={`tag map-tag${good ? '' : ' tag-warn'}`}>
              {good ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <TriangleAlert size={16} aria-hidden="true" />
              )}
              {method === 'DRAW'
                ? t('field.placed')
                : t('field.accurate', { m: Math.round(accuracy!) })}
            </span>
          ) : null}
        </div>

        {pin && !good && usable ? <p className="small">{t('field.imprecise')}</p> : null}
        {pin && !usable ? <FormError>{t('field.tooFar')}</FormError> : null}

        <button
          className={`btn${pin ? ' btn-line' : ''}`}
          type="button"
          onClick={locate}
          disabled={locating}
        >
          {locating ? (
            <LoaderCircle className="spin" size={22} aria-hidden="true" />
          ) : (
            <LocateFixed size={22} aria-hidden="true" />
          )}
          {locating
            ? reading
              ? t('field.reading', { m: Math.round(reading) })
              : t('field.finding')
            : pin
              ? t('field.again')
              : t('about.useLoc')}
        </button>
        {ALLOW_TAP && !pin ? <p className="small">{t('field.tapDemo')}</p> : null}

        <div>
          <span className="label" id="acres-label">
            {t('field.size')}
          </span>
          <div className="stepper" role="group" aria-labelledby="acres-label">
            <button
              type="button"
              className="round"
              aria-label={t('field.less')}
              disabled={acres <= 0.5}
              onClick={() => setAcres((a) => a - 0.5)}
            >
              <Minus size={24} aria-hidden="true" />
            </button>
            <span className="fig" style={{ fontSize: 34, fontWeight: 600 }} aria-live="polite">
              {acres.toFixed(1)}{' '}
              <span style={{ fontSize: 20, fontWeight: 500 }}>{t('field.acres')}</span>
            </span>
            <button
              type="button"
              className="round"
              aria-label={t('field.more')}
              disabled={acres >= 50}
              onClick={() => setAcres((a) => a + 0.5)}
            >
              <Plus size={24} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="survey">
            {t('field.survey')} <span className="small">{t('field.surveyOpt')}</span>
          </label>
          <div className="field text">
            <input
              id="survey"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={20}
              placeholder={t('field.surveyEg')}
              value={survey}
              onChange={(e) => setSurvey(e.target.value.replace(/[^0-9A-Za-z/ -]/g, ''))}
            />
          </div>
          <p className="small">{t('field.surveyWhy')}</p>
        </div>
        {error ? <FormError>{error}</FormError> : null}
      </div>
      <div className="action">
        <button className="btn" type="button" disabled={!usable || busy} onClick={save}>
          {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
          {busy ? t('c.saving') : t('field.save')}
          {busy ? null : <ArrowRight size={22} aria-hidden="true" />}
        </button>
      </div>
    </main>
  );
}
