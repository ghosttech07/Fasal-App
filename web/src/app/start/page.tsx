'use client';

import Link from 'next/link';
import { ArrowRight, Bell, Check, ChevronLeft, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Mark } from '@/components/mark';

/** Saved on this phone once the farmer agrees, so the story is not shown again. */
const DONE_KEY = 'fs_onboarded';

const STORY = [
  {
    title: 'Cover that pays when the rain fails',
    body: 'Before you buy, you see exactly how much rain pays how much money. No claim forms, ever.',
  },
  {
    title: 'A satellite watches your field',
    body: 'Every day it measures the rain on your field. When rain falls below a mark, that mark is passed.',
  },
  {
    title: 'Money comes to your UPI by itself',
    body: 'When a mark is passed, the money reaches your UPI within a day, with an SMS. You do nothing.',
  },
];

// shortcut: mirrors the seeded Dry Spell Cover (FS-DRT-MH-RB, 2 acres, sowing phase), like the sign-in board; serve from a public catalog before launch.
const RATES = [
  { rain: 'Rain 40% below normal', amount: '₹1,500', at: 40 },
  { rain: 'Rain 60% below normal', amount: '₹3,600', at: 60 },
  { rain: 'Rain 80% below normal', amount: '₹6,000', at: 80 },
];

const TERMS = [
  [
    'Payouts follow measured rain.',
    'A satellite measures rain for your area. Your own field can get a little more or less.',
  ],
  ['Your premium goes to the insurer,', 'not to this app. In a normal year nothing is paid out.'],
  ['We check who you are.', 'Your UPI name, and an ID before large payouts.'],
  ['Your data stays private.', 'Only your insurer sees it. You can ask us to delete it.'],
];

type Perm = 'idle' | 'allowed' | 'blocked';

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0-2 story, 3 "Before you start"
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
      localStorage.setItem(DONE_KEY, JSON.stringify({ terms: 'v1', at: new Date().toISOString() }));
    } catch {
      /* still continue to sign-in */
    }
    router.push('/login');
  }

  if (step === 3) {
    return (
      <main className="screen">
        <section className="board" aria-labelledby="bys">
          <button type="button" className="back ob-back" onClick={back}>
            <ChevronLeft size={20} aria-hidden="true" />
            Back
          </button>
          <h1 id="bys" className="board-title">
            Before you start
          </h1>
          <p className="board-sub">Four things to know, in plain words</p>
        </section>

        <div className="work">
          <ol className="ob-terms">
            {TERMS.map(([b, rest]) => (
              <li key={b}>
                <span>
                  <b>{b}</b> {rest}
                </span>
              </li>
            ))}
          </ol>
          <p className="hint">
            Full text: <Link href="/legal/terms">Terms of use</Link> ·{' '}
            <Link href="/legal/privacy">Privacy</Link> ·{' '}
            <Link href="/legal/grievance">Complaints</Link>
          </p>

          <div className="ob-perms">
            <h2 className="ob-perms-h">Allow on this phone</h2>
            <PermRow
              icon={<Bell size={22} aria-hidden="true" />}
              title="Notifications"
              sub="When money is sent or rain nears a mark"
              state={notif}
              onAllow={askNotif}
            />
            <PermRow
              icon={<MapPin size={22} aria-hidden="true" />}
              title="Location"
              sub="To mark your field on the map"
              state={loc}
              onAllow={askLoc}
            />
            <p className="hint">You can skip these and allow them later.</p>
          </div>
        </div>

        <div className="action">
          <label className="ob-agree">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I have read this and I agree
          </label>
          <button className="btn" type="button" disabled={!agreed} onClick={finish}>
            Agree and continue
            <ArrowRight size={22} aria-hidden="true" />
          </button>
        </div>
      </main>
    );
  }

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
            Skip
          </button>
        </div>

        <div className="ob-art" key={step} aria-hidden="true">
          {step === 0 ? (
            <div className="ob-rates">
              <p className="ob-cap">Dry Spell Cover, sowing phase, 2 acres</p>
              {RATES.map((r) => (
                <div className="ob-rate" key={r.rain}>
                  <span>{r.rain}</span>
                  <b className="fig">{r.amount}</b>
                </div>
              ))}
            </div>
          ) : step === 1 ? (
            <div className="ob-meter">
              <p>
                <b className="fig ob-pct">64%</b> less rain than normal
              </p>
              <div className="ob-bar">
                <i style={{ width: '64%' }} />
                {RATES.map((r) => (
                  <span
                    key={r.at}
                    className={r.at > 64 ? 'ahead' : ''}
                    style={{ left: `${r.at}%` }}
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
                PAID
              </span>
              <b className="fig">₹3,600</b>
              <p>Sent to your UPI within a day, with an SMS</p>
            </div>
          )}
        </div>
      </section>

      <div className="work ob-work">
        <div className="ob-dots" role="img" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <div key={step} className="ob-copy" aria-live="polite">
          <h1 className="h1">{STORY[step].title}</h1>
          <p className="lead">{STORY[step].body}</p>
        </div>
      </div>

      <div className="action ob-nav">
        {step > 0 ? (
          <button type="button" className="btn btn-line ob-prev" onClick={back}>
            Back
          </button>
        ) : null}
        <button type="button" className="btn" onClick={next}>
          {step === 2 ? 'Get started' : 'Next'}
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
  const { icon, title, sub, state, onAllow } = props;
  return (
    <div className="ob-perm">
      {icon}
      <div className="ob-perm-t">
        <div>{title}</div>
        <small>
          {state === 'blocked' ? 'Turned off. You can change this in your phone settings.' : sub}
        </small>
      </div>
      <button
        type="button"
        className={'ob-pill' + (state === 'allowed' ? ' on' : '')}
        onClick={onAllow}
        disabled={state !== 'idle'}
        aria-label={`${state === 'allowed' ? 'Allowed' : state === 'blocked' ? 'Not allowed' : 'Allow'}: ${title}`}
      >
        {state === 'allowed' ? 'Allowed' : state === 'blocked' ? 'Off' : 'Allow'}
      </button>
    </div>
  );
}
