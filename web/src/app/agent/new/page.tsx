'use client';

import {
  ArrowRight,
  Check,
  ChevronDown,
  LoaderCircle,
  LocateFixed,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { LANG_LIST, type Lang } from '@/i18n';
import { useT } from '@/i18n/client';
import { ApiError, messageFor, post } from '@/lib/client';
import { averagedFix } from '@/lib/gps';
import { INDIA_STATES, districtCode, placeFromPosition } from '@/lib/place';

const VALID = /^[6-9]\d{9}$/;

/** Agent enrols a farmer: number, name, place, the farmer's language and the farmer's spoken consent. */
export default function EnrolFarmer() {
  const router = useRouter();
  const { t } = useT();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [lang, setLang] = useState<Lang>('hi');
  const [consent, setConsent] = useState(false);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const districts = INDIA_STATES.find((s) => s.code === stateCode)?.districts ?? [];
  const ready =
    VALID.test(phone) &&
    name.trim().length >= 2 &&
    stateCode &&
    district &&
    village.trim().length >= 2 &&
    consent;

  async function useLocation() {
    setLocating(true);
    setError(null);
    try {
      const fix = await averagedFix(6000);
      const place = await placeFromPosition(fix.lat, fix.lng);
      if (place.stateCode) setStateCode(place.stateCode);
      setDistrict(place.district ?? '');
      if (place.village) setVillage(place.village);
    } catch {
      setError(t('about.locFail'));
    } finally {
      setLocating(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const r = await post<{ id: string }>('/api/fs/agent/farmers', {
        phone,
        name: name.trim(),
        districtCode: districtCode(stateCode, district),
        village: village.trim(),
        language: lang,
        consentGiven: true,
      });
      router.push(`/agent/farmers/${r.id}/field`);
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'farmer_exists'
          ? t('ag.exists')
          : messageFor(err, t),
      );
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/agent', label: t('c.back') }}
        step={1}
        title={t('ag.enrol')}
        sub={t('ag.enrolSub')}
      />
      <form className="contents" onSubmit={save} noValidate>
        <div className="work">
          <div>
            <label className="label" htmlFor="phone">
              {t('ag.phone')}
            </label>
            <div className="field">
              <span className="prefix" aria-hidden="true">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder={t('login.digits')}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
            <p className="small">{t('ag.phoneHint')}</p>
          </div>

          <div>
            <label className="label" htmlFor="name">
              {t('ag.name')}
            </label>
            <div className="field text">
              <input
                id="name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <fieldset className="place">
            <legend className="h2" style={{ fontSize: 20 }}>
              {t('ag.where')}
            </legend>
            <button
              className="btn btn-line"
              type="button"
              onClick={useLocation}
              disabled={locating}
            >
              {locating ? (
                <LoaderCircle className="spin" size={22} aria-hidden="true" />
              ) : (
                <LocateFixed size={22} aria-hidden="true" />
              )}
              {locating ? t('about.finding') : t('about.useLoc')}
            </button>
            <div>
              <label className="label" htmlFor="state">
                {t('about.state')}
              </label>
              <div className="field">
                <select
                  id="state"
                  className="select"
                  value={stateCode}
                  onChange={(e) => {
                    setStateCode(e.target.value);
                    setDistrict('');
                  }}
                >
                  <option value="" disabled>
                    {t('about.chooseState')}
                  </option>
                  {INDIA_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={20} aria-hidden="true" color="var(--ink-2)" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="district">
                {t('about.district')}
              </label>
              <div className="field" data-disabled={!stateCode}>
                <select
                  id="district"
                  className="select"
                  value={district}
                  disabled={!stateCode}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  <option value="" disabled>
                    {stateCode ? t('about.chooseDistrict') : t('about.stateFirst')}
                  </option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown size={20} aria-hidden="true" color="var(--ink-2)" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="village">
                {t('about.village')}
              </label>
              <div className="field text">
                <input
                  id="village"
                  value={village}
                  maxLength={80}
                  onChange={(e) => setVillage(e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <div>
            <label className="label" htmlFor="lang">
              {t('ag.lang')}
            </label>
            <div className="field">
              <select
                id="lang"
                className="select"
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
              >
                {LANG_LIST.map((l) => (
                  <option key={l.code} value={l.code} lang={l.code}>
                    {l.nativeName} · {l.englishName}
                  </option>
                ))}
              </select>
              <ChevronDown size={20} aria-hidden="true" color="var(--ink-2)" />
            </div>
            <p className="small">{t('ag.langHint')}</p>
          </div>

          <div className="consent">
            <strong>
              <ShieldCheck size={22} aria-hidden="true" color="var(--board)" />
              {t('ag.readThis')}
            </strong>
            {t('ag.notice')}
            <label className="check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {t('ag.agrees')}
            </label>
          </div>
          {error ? <FormError>{error}</FormError> : null}
        </div>
        <div className="action">
          <button className="btn" type="submit" disabled={!ready || busy}>
            {busy ? (
              <LoaderCircle className="spin" size={22} aria-hidden="true" />
            ) : (
              <Check size={22} aria-hidden="true" />
            )}
            {busy ? t('c.saving') : t('ag.enrolBtn')}
            {busy ? null : <ArrowRight size={22} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </main>
  );
}
