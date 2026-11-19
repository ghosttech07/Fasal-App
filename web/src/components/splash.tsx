'use client';

import { useEffect, useRef, useState } from 'react';

const DROP = 'M12 2.7c3.4 4.4 6.3 8 6.3 11.3a6.3 6.3 0 0 1-12.6 0c0-3.3 2.9-6.9 6.3-11.3z';

/**
 * Opening animation (approved idea A, "sprout in the rain"). Plays in full every time the app is opened
 * (link, home screen, new tab). Skipped only when the page load came from inside the app itself (e.g. the
 * full reload right after sign-in); the inline script in the layout hides it before paint in that case.
 * Tap skips. At the end the name flies onto the board's mark.
 */
export function Splash() {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || getComputedStyle(el).display === 'none') return setGone(true);
    const t = setTimeout(leave, 1900);
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
    <div ref={ref} className="splash" onClick={leave} role="presentation">
      <div className="stage">
        {/* Each part is its own layer that only moves, scales or fades: the phone's graphics chip animates
            these, so the drawing stays smooth even while the app is still starting up. */}
        <div className="art" aria-hidden="true">
          <Layer cls="spl-cloud">
            <path
              className="spl-ink"
              fill="#fff"
              d="M34 44c-7 0-11-5-10-10 1-6 7-9 12-7 2-8 10-12 18-9 5-6 15-6 20 1 8-1 14 4 14 11 0 7-5 11-11 11z"
            />
          </Layer>
          {[42, 54, 66, 78].map((x, i) => (
            <Layer key={x} cls={`spl-rain spl-rain-${i}`}>
              <line
                x1={x}
                y1={50}
                x2={x - 1.5}
                y2={56}
                stroke="#1E4FD0"
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            </Layer>
          ))}
          <Layer cls="spl-ripple spl-ripple-0">
            <ellipse
              cx={40}
              cy={101}
              rx={5}
              ry={1.6}
              fill="none"
              stroke="#1E4FD0"
              strokeWidth={1.6}
            />
          </Layer>
          <Layer cls="spl-ripple spl-ripple-1">
            <ellipse
              cx={77}
              cy={101.5}
              rx={5}
              ry={1.6}
              fill="none"
              stroke="#1E4FD0"
              strokeWidth={1.6}
            />
          </Layer>
          <Layer cls="spl-ground">
            <path className="spl-ink" d="M22 104c12-3 25-4 38-4s26 1 38 4" />
          </Layer>
          <Layer cls="spl-stem">
            <path className="spl-ink" d="M60 102c0-9-1-17 0-26" />
          </Layer>
          <Layer cls="spl-leaf-l">
            <path
              className="spl-ink"
              fill="#D6EBDD"
              strokeWidth={2.5}
              d="M60 89c-9 0-16-5-17-13 9-1 16 4 17 13z"
            />
          </Layer>
          <Layer cls="spl-leaf-r">
            <path
              className="spl-ink"
              fill="#D6EBDD"
              strokeWidth={2.5}
              d="M60 81c9-1 15-7 15-15-9 0-15 6-15 15z"
            />
          </Layer>
          <Layer cls="spl-gold">
            <path
              d="M60 59c3 4 5 7 5 9.5a5 5 0 0 1-10 0c0-2.5 2-5.5 5-9.5z"
              fill="#F5B800"
              stroke="#123F2C"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Layer>
        </div>
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

/** One piece of the drawing on its own full-size layer (all layers share the 120 x 120 drawing grid). */
function Layer({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <svg className={`spl ${cls}`} viewBox="0 0 120 120">
      {children}
    </svg>
  );
}
