'use client';

import Link from 'next/link';
import { ArrowRight, Bell, Check, ChevronLeft, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Mark } from '@/components/mark';
import { LANG_LIST, type Key } from '@/i18n';
import { useT } from '@/i18n/client';

/** Saved on this phone once the farmer agrees, so the story is not shown again. */
const DONE_KEY = 'fs_onboarded';

const STORY: [Key, Key][] = [
  ['start.s1.title', 'start.s1.body'],
  ['start.s2.title', 'start.s2.body'],
  ['start.s3.title', 'start.s3.body'],
];

// shortcut: mirrors the seeded Dry Spell Cover (FS-DRT-MH-RB, 2 acres, sowing phase), like the sign-in board; serve from a public catalog before launch.
const RATES = [
  { pct: 40, amount: '₹1,500' },
  { pct: 60, amount: '₹3,600' },
  { pct: 80, amount: '₹6,000' },
];

const TERMS: [Key, Key][] = [
  ['bys.t1b', 'bys.t1'],
  ['bys.t2b', 'bys.t2'],
  ['bys.t3b', 'bys.t3'],
  ['bys.t4b', 'bys.t4'],
];

type Perm = 'idle' | 'allowed' | 'blocked';

export default function StartPage() {
  const router = useRouter();
  const { t, lang, chosen, setLang } = useT();
  // -1 language, 0-2 story, 3 "Before you start". The language step shows until this phone has chosen one.
  const [step, setStep] = useState(chosen ? 0 : -1);
  const [agreed, setAgreed] = useState(false);
  const [notif, setNotif] = useState<Perm>('idle');
  const [loc, setLoc] = useState<Perm>('idle');
  const touchX = useRef<number | null>(null);

  // Seen it already on this phone: straight to sign-in.
  useEffect(() => {
    try {
      if (localStorage.getItem(DONE_KEY)) router.replace('/login');
    } catch {
      /* storage blocked: show the story every time, harmless */
    }
  }, [router]);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function askNotif() {
    if (!('Notification' in window)) return setNotif('blocked');
    const r = await Notification.requestPermission();
    setNotif(r === 'granted' ? 'allowed' : 'blocked');
  }
  function askLoc() {
    if (!('geolocation' in navigator)) return setLoc('blocked');
    navigator.geolocation.getCurrentPosition(
      () => setLoc('allowed'),
      (e) => setLoc(e.code === e.PERMISSION_DENIED ? 'blocked' : 'allowed'),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  function finish() {
    try {
      // shortcut: consent is recorded on this phone only; store it with the farmer's account (version + time) once the API has a consent endpoint.
      localStorage.setItem(
        DONE_KEY,
        JSON.stringify({ terms: 'v1', lang, at: new Date().toISOString() }),
      );
    } catch {
      /* still continue to sign-in */
    }
    router.push('/login');
  }

  if (step === -1) {
    return (
      <main className="screen">
        <section className="board" aria-labelledby="lang-h">
          <Mark />
          <h1 id="lang-h" className="board-title">
            {t('lang.title')}
          </h1>
          <p className="board-sub">{t('lang.sub')}</p>
        </section>
        <div className="work">
          <div className="lang-grid" role="list">
            {LANG_LIST.map((l) => (
              <button
                key={l.code}
                type="button"
                role="listitem"
                lang={l.code}
                className="lang-btn"
                data-on={l.code === lang}
                onClick={() => {
                  setLang(l.code);
                  setStep(0);
                }}
              >
                <b>{l.nativeName}</b>
                {l.code !== 'en' ? <small>{l.englishName}</small> : null}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (step === 3) {
    return (
      <main className="screen">
        <section className="board" aria-labelledby="bys">
          <button type="button" className="back ob-back" onClick={back}>
            <ChevronLeft size={20} aria-hidden="true" />
            {t('c.back')}
          </button>
          <h1 id="bys" className="board-title">
            {t('bys.title')}
          </h1>
          <p className="board-sub">{t('bys.sub')}</p>
        </section>

        <div className="work">
          <ol className="ob-terms">
            {TERMS.map(([b, rest]) => (
              <li key={b}>
                <span>
                  <b>{t(b)}</b> {t(rest)}
                </span>
              </li>
            ))}
          </ol>
          <p className="hint">
            {t('bys.full')} <Link href="/legal/terms">{t('bys.terms')}</Link> ·{' '}
            <Link href="/legal/privacy">{t('bys.privacy')}</Link> ·{' '}
            <Link href="/legal/grievance">{t('bys.complaints')}</Link>
          </p>

          <div className="ob-perms">
            <h2 className="ob-perms-h">{t('bys.allow')}</h2>
            <PermRow
              icon={<Bell size={22} aria-hidden="true" />}
              title={t('bys.notif')}
              sub={t('bys.notifSub')}
              state={notif}
              onAllow={askNotif}
            />
            <PermRow
              icon={<MapPin size={22} aria-hidden="true" />}
              title={t('bys.loc')}
              sub={t('bys.locSub')}
              state={loc}
              onAllow={askLoc}
            />
            <p className="hint">{t('bys.later')}</p>
          </div>
        </div>

        <div className="action">
          <label className="ob-agree">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            {t('bys.agree')}
          </label>
          <button className="btn" type="button" disabled={!agreed} onClick={finish}>
            {t('bys.continue')}
            <ArrowRight size={22} aria-hidden="true" />
          </button>
        </div>
      </main>
    );
  }

  const [title, body] = STORY[step]!;
  return (
    <main
      className="screen"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx < -50) next();
        else if (dx > 50) back();
      }}
    >
      <section className="board ob-board" aria-label="FasalShield">
        <div className="ob-top">
          <Mark />
          <button type="button" className="ob-skip" onClick={() => setStep(3)}>
            {t('c.skip')}
          </button>
        </div>

        <div className="ob-art" key={step} aria-hidden="true">
          {step === 0 ? (
            <div className="ob-rates">
              <p className="ob-cap">{t('start.cap')}</p>
              {RATES.map((r) => (
                <div className="ob-rate" key={r.pct}>
                  <span>{t('start.rate', { pct: r.pct })}</span>
                  <b className="fig">{r.amount}</b>
                </div>
              ))}
            </div>
          ) : step === 1 ? (
            <div className="ob-meter">
              <p>
                <b className="fig ob-pct">64%</b> {t('start.less')}
              </p>
              <div className="ob-bar">
                <i style={{ width: '64%' }} />
                {RATES.map((r) => (
                  <span
                    key={r.pct}
                    className={r.pct > 64 ? 'ahead' : ''}
                    style={{ left: `${r.pct}%` }}
                  >
                    <em className="fig">{r.amount}</em>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="ob-paid">
              <span className="ob-stamp">
                <Check size={20} strokeWidth={2.6} aria-hidden="true" />
                {t('start.paid')}
              </span>
              <b className="fig">₹3,600</b>
              <p>{t('start.paidSub')}</p>
            </div>
          )}
        </div>
      </section>

      <div className="work ob-work">
        <div className="ob-dots" role="img" aria-label={t('start.step', { n: step + 1 })}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <div key={step} className="ob-copy" aria-live="polite">
          <h1 className="h1">{t(title)}</h1>
          <p className="lead">{t(body)}</p>
        </div>
      </div>

      <div className="action ob-nav">
        {step > 0 ? (
          <button type="button" className="btn btn-line ob-prev" onClick={back}>
            {t('c.back')}
          </button>
        ) : null}
        <button type="button" className="btn" onClick={next}>
          {step === 2 ? t('start.getStarted') : t('c.next')}
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}

function PermRow(props: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  state: Perm;
  onAllow: () => void;
}) {
  const { t } = useT();
  const { icon, title, sub, state, onAllow } = props;
  const label =
    state === 'allowed'
      ? t('bys.allowed')
      : state === 'blocked'
        ? t('bys.offBtn')
        : t('bys.allowBtn');
  return (
    <div className="ob-perm">
      {icon}
      <div className="ob-perm-t">
        <div>{title}</div>
        <small>{state === 'blocked' ? t('bys.off') : sub}</small>
      </div>
      <button
        type="button"
        className={'ob-pill' + (state === 'allowed' ? ' on' : '')}
        onClick={onAllow}
        disabled={state !== 'idle'}
        aria-label={`${label}: ${title}`}
      >
        {label}
      </button>
    </div>
  );
}
