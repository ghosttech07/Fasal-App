'use client';

import { useEffect, useRef, useState } from 'react';

const DROP = 'M12 2.7c3.4 4.4 6.3 8 6.3 11.3a6.3 6.3 0 0 1-12.6 0c0-3.3 2.9-6.9 6.3-11.3z';

/**
 * Opening animation (approved idea A, "sprout in the rain"). Plays once per browser session while the app loads:
 * full on the first ever open, name-only afterwards. Tap skips. At the end the name flies onto the board's mark.
 * The inline script in the layout hides it before paint when this session has already seen it.
 */
export function Splash() {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  const [short, setShort] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || getComputedStyle(el).display === 'none') return setGone(true);
    let seenBefore = false;
    try {
      seenBefore = localStorage.getItem('fs_seen') === '1';
      localStorage.setItem('fs_seen', '1');
      sessionStorage.setItem('fs_splash', '1');
    } catch {
      /* storage blocked: play the full version every time */
    }
    setShort(seenBefore);
    const t = setTimeout(leave, seenBefore ? 650 : 1900);
    return () => clearTimeout(t);
  }, []);

  function leave() {
    const el = ref.current;
    if (!el || leaving.current) return;
    leaving.current = true;
    const fly = el.querySelector<HTMLElement>('.fly');
    const mark = document.querySelector<HTMLElement>('.board .mark');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fly && mark && !reduce) {
      const a = fly.getBoundingClientRect();
      const b = mark.getBoundingClientRect();
      fly.style.setProperty('--fx', `${b.left - a.left}px`);
      fly.style.setProperty('--fy', `${b.top - a.top}px`);
      fly.style.setProperty('--fs', String(b.height / a.height));
    } else {
      el.classList.add('nomark');
    }
    el.classList.add('out');
    setTimeout(() => setGone(true), reduce ? 260 : 620);
  }

  if (gone) return null;
  return (
    <div ref={ref} className={`splash${short ? ' short' : ''}`} onClick={leave} role="presentation">
      <div className="stage">
        <svg className="art" viewBox="0 0 120 120" aria-hidden="true">
          <path className="sp-ink sp-draw" pathLength={1} style={{ ['--d' as string]: '420ms' }} fill="#fff" d="M34 44c-7 0-11-5-10-10 1-6 7-9 12-7 2-8 10-12 18-9 5-6 15-6 20 1 8-1 14 4 14 11 0 7-5 11-11 11z" />
          {[
            [42, 300],
            [54, 480],
            [66, 380],
            [78, 560],
          ].map(([x, at]) => (
            <line key={x} className="sp-rain" x1={x} y1={50} x2={x! - 1.5} y2={56} style={{ ['--at' as string]: `${at}ms` }} />
          ))}
          <ellipse className="sp-ripple" cx={40} cy={101} rx={5} ry={1.6} style={{ ['--at' as string]: '840ms' }} />
          <ellipse className="sp-ripple" cx={77} cy={101.5} rx={5} ry={1.6} style={{ ['--at' as string]: '1100ms' }} />
          <path className="sp-ink sp-draw" pathLength={1} style={{ ['--at' as string]: '120ms', ['--d' as string]: '420ms' }} d="M22 104c12-3 25-4 38-4s26 1 38 4" />
          <path className="sp-ink sp-draw" pathLength={1} style={{ ['--at' as string]: '420ms', ['--d' as string]: '380ms' }} d="M60 102c0-9-1-17 0-26" />
          <path className="sp-ink sp-unfurl sp-leaf-l" style={{ ['--at' as string]: '640ms', fill: '#D6EBDD', strokeWidth: 2.5 }} d="M60 89c-9 0-16-5-17-13 9-1 16 4 17 13z" />
          <path className="sp-ink sp-unfurl sp-leaf-r" style={{ ['--at' as string]: '720ms', fill: '#D6EBDD', strokeWidth: 2.5 }} d="M60 81c9-1 15-7 15-15-9 0-15 6-15 15z" />
          <path className="sp-gold" d="M60 59c3 4 5 7 5 9.5a5 5 0 0 1-10 0c0-2.5 2-5.5 5-9.5z" fill="#F5B800" stroke="#123F2C" strokeWidth={2} strokeLinejoin="round" />
        </svg>
        <div className="fly">
          <div className="word">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={DROP} fill="#F5B800" />
            </svg>
            FasalShield
          </div>
        </div>
        <div className="leave">
          <div className="tagline">Crop cover that pays when the rain fails</div>
        </div>
      </div>
      <div className="skip">Tap to skip</div>
    </div>
  );
}
