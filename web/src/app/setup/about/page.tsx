'use client';

import {
  ArrowRight,
  Check,
  ChevronDown,
  LoaderCircle,
  LocateFixed,
  ShieldCheck,
} from 'lucide-react';
import { findDistrict } from '@fasalshield/shared/geo';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { get, messageFor, patch, post } from '@/lib/client';
import type { Me } from '@/lib/format';
import { averagedFix } from '@/lib/gps';
import { INDIA_STATES, districtCode, placeFromPosition } from '@/lib/place';
import { useT } from '@/i18n/client';

const ID_TYPES = ['VOTER_ID', 'RATION_CARD', 'PAN'] as const;

export default function AboutPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const [me, setMe] = useState<Me | null>(null);
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState<string | null>(null);
  const [showId, setShowId] = useState(false);
  const [idType, setIdType] = useState<string>('VOTER_ID');
  const [idNumber, setIdNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<Me>('/api/fs/me')
      .then((m) => {
        setMe(m);
        setAgree(m.onboarding.consent);
        setName(m.name ?? '');
        const found = m.districtCode ? findDistrict(m.districtCode) : null;
        if (found) {
          setStateCode(found.state.code);
          setDistrict(found.district);
        }
        setVillage(m.village ?? '');
      })
      .catch((e) => setError(messageFor(e, t)));
  }, []);

  const districts = INDIA_STATES.find((s) => s.code === stateCode)?.districts ?? [];

  async function useLocation() {
    setLocating(true);
    setLocated(null);
    setError(null);
    try {
      const fix = await averagedFix(6000);
      const place = await placeFromPosition(fix.lat, fix.lng);
      if (place.stateCode) setStateCode(place.stateCode);
      setDistrict(place.district ?? '');
      if (place.village) setVillage(place.village);
      const filled = [
        place.village,
        place.district,
        INDIA_STATES.find((s) => s.code === place.stateCode)?.name,
      ].filter(Boolean);
      setLocated(
        filled.length
          ? `${t('about.found', { place: filled.join(', ') })}${place.district ? '' : ` ${t('about.pickDistrict')}`}`
          : t('about.noPlace'),
      );
    } catch (e) {
      setError((e as Error).message === 'denied' ? t('about.locOff') : t('about.locFail'));
    } finally {
      setLocating(false);
    }
  }

  const idOk = !showId || /^[A-Za-z0-9]{6,20}$/.test(idNumber);
  const ready =
    agree && name.trim().length >= 2 && stateCode && district && village.trim().length >= 2 && idOk;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      if (!me?.onboarding.consent)
        await post('/api/fs/me/consents', { purposes: ['INSURANCE_SERVICING'], language: lang });
      await patch('/api/fs/me', {
        name: name.trim(),
        districtCode: districtCode(stateCode, district),
        village: village.trim(),
        ...(showId && idNumber ? { idDoc: { type: idType, number: idNumber.trim() } } : {}),
      });
      router.push('/setup/field');
    } catch (err) {
      setError(messageFor(err, t));
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <StepBoard step={1} title={t('about.title')} sub={t('about.sub')} />
      <form className="contents" onSubmit={save} noValidate>
        <div className="work">
          <div className="consent">
            <strong>
              <ShieldCheck size={22} aria-hidden="true" color="var(--board)" />
              {t('about.consentH')}
            </strong>
            {t('about.consent')}
            <label className="check">
              <input
                type="checkbox"
                checked={agree}
                disabled={me?.onboarding.consent}
                onChange={(e) => setAgree(e.target.checked)}
              />
              {t('about.agree')}
            </label>
          </div>

          <div>
            <label className="label" htmlFor="name">
              {t('about.name')}
            </label>
            <div className="field text">
              <input
                id="name"
                autoComplete="name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <fieldset className="place">
            <legend className="h2" style={{ fontSize: 20 }}>
              {t('about.where')}
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
            {located ? (
              <p className="small place-found" role="status">
                <Check size={16} aria-hidden="true" /> {located}
              </p>
            ) : (
              <p className="small">{t('about.orChoose')}</p>
            )}

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
                  autoComplete="address-level3"
                  onChange={(e) => setVillage(e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          {showId ? (
            <div className="two">
              <div>
                <label className="label" htmlFor="idtype">
                  {t('about.idType')}
                </label>
                <div className="field">
                  <select
                    id="idtype"
                    className="select"
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                  >
                    {ID_TYPES.map((code) => (
                      <option key={code} value={code}>
                        {t(`id.${code}`)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={20} aria-hidden="true" color="var(--ink-2)" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="idnum">
                  {t('about.idNum')}
                </label>
                <div className="field text" data-invalid={!idOk && idNumber.length > 0}>
                  <input
                    id="idnum"
                    value={idNumber}
                    maxLength={20}
                    autoCapitalize="characters"
                    onChange={(e) => setIdNumber(e.target.value.replace(/\s/g, ''))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <button type="button" className="link" onClick={() => setShowId(true)}>
              {t('about.addId')}
            </button>
          )}
          {error ? <FormError>{error}</FormError> : null}
        </div>
        <div className="action">
          <button className="btn" type="submit" disabled={!ready || busy}>
            {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
            {busy ? t('c.saving') : t('c.saveContinue')}
            {busy ? null : <ArrowRight size={22} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </main>
  );
}
