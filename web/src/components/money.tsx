'use client';

import { useEffect, useRef } from 'react';
import { rupees } from '@/lib/format';

/**
 * A rupee amount that counts up once from zero (700 ms, ease-out). The final figure is laid out invisibly
 * underneath so the width never changes: nothing next to it moves or overlaps. The count writes straight to
 * the text node (no React re-render per frame), so it stays smooth on low-end phones.
 * Screen readers get only the final amount.
 */
export function Money({ paise, suffix = '' }: { paise: number; suffix?: string }) {
  const final = rupees(paise);
  const live = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = live.current;
    if (!el || paise === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = '';
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      // Whole rupees, so the last frame lands exactly on the real amount.
      const text = rupees(Math.round((paise / 100) * (1 - Math.pow(1 - t, 3))) * 100) + suffix;
      if (text !== last) el.textContent = last = text;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paise, suffix]);

  return (
    <span className="money-num" aria-label={`${final}${suffix}`}>
      <span aria-hidden="true" className="money-final">
        {final}
        {suffix}
      </span>
      <span aria-hidden="true" ref={live}>
        {final}
        {suffix}
      </span>
    </span>
  );
}
