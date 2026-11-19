'use client';

import { ArrowRight, ChevronDown, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { get, messageFor, patch, post } from '@/lib/client';
import { DISTRICTS, type Me } from '@/lib/format';

const ID_TYPES = [
  ['VOTER_ID', 'Voter ID'],
  ['RATION_CARD', 'Ration card'],
  ['PAN', 'PAN card'],
] as const;

export default function AboutPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
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
        setDistrict(m.districtCode ?? '');
        setVillage(m.village ?? '');
      })
      .catch((e) => setError(messageFor(e)));
  }, []);

  const idOk = !showId || /^[A-Za-z0-9]{6,20}$/.test(idNumber);
  const ready = agree && name.trim().length >= 2 && district && village.trim().length >= 2 && idOk;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      if (!me?.onboarding.consent) await post('/api/fs/me/consents', { purposes: ['INSURANCE_SERVICING'], language: 'en' });
      await patch('/api/fs/me', {
        name: name.trim(),
        districtCode: district,
        village: village.trim(),
        ...(showId && idNumber ? { idDoc: { type: idType, number: idNumber.trim() } } : {}),
      });
      router.push('/setup/field');
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <StepBoard step={1} title="About you" sub="Step 1 of 3 · takes about a minute" />
      <form className="contents" onSubmit={save} noValidate>
        <div className="work">
          <div className="consent">
            <strong>
              <ShieldCheck size={22} aria-hidden="true" color="var(--board)" />
              Your data, your choice
            </strong>
            We use your name, phone and field location only to give you cover and send you money. Only your insurer sees it.
            <label className="check">
              <input type="checkbox" checked={agree} disabled={me?.onboarding.consent} onChange={(e) => setAgree(e.target.checked)} />I agree
            </label>
          </div>

          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <div className="field text">
              <input id="name" autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="two">
            <div>
              <label className="label" htmlFor="district">
                District
              </label>
              <div className="field">
                <select id="district" className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
                  <option value="" disabled>
                    Choose
                  </option>
                  {DISTRICTS.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={20} aria-hidden="true" color="var(--ink-2)" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="village">
                Village
              </label>
              <div className="field text">
                <input id="village" value={village} maxLength={80} onChange={(e) => setVillage(e.target.value)} />
              </div>
            </div>
          </div>

          {showId ? (
            <div className="two">
              <div>
                <label className="label" htmlFor="idtype">
                  ID type
                </label>
                <div className="field">
                  <select id="idtype" className="select" value={idType} onChange={(e) => setIdType(e.target.value)}>
                    {ID_TYPES.map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={20} aria-hidden="true" color="var(--ink-2)" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="idnum">
                  ID number
                </label>
                <div className="field text" data-invalid={!idOk && idNumber.length > 0}>
                  <input id="idnum" value={idNumber} maxLength={20} autoCapitalize="characters" onChange={(e) => setIdNumber(e.target.value.replace(/\s/g, ''))} />
                </div>
              </div>
            </div>
          ) : (
            <button type="button" className="link" onClick={() => setShowId(true)}>
              + Add an ID (optional, pays faster)
            </button>
          )}
          {error ? <FormError>{error}</FormError> : null}
        </div>
        <div className="action">
          <button className="btn" type="submit" disabled={!ready || busy}>
            {busy ? <LoaderCircle className="spin" size={22} aria-hidden="true" /> : null}
            {busy ? 'Saving' : 'Save and continue'}
            {busy ? null : <ArrowRight size={22} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </main>
  );
}
