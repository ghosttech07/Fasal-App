'use client';

import { useEffect, useState } from 'react';
import { rupees } from '@/lib/format';

/**
 * A rupee amount that counts up once from zero (700 ms, ease-out). The final figure is laid out invisibly
 * underneath so the width never changes while counting: nothing next to it moves or overlaps.
 * Screen readers get only the final amount.
 */
export function Money({ paise, suffix = '' }: { paise: number; suffix?: string }) {
  const final = rupees(paise);
  const [shown, setShown] = useState(paise === 0 ? final : rupees(0));

  useEffect(() => {
    if (paise === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(final);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - t, 3);
      // Count whole rupees so the last frame lands exactly on the real amount.
      setShown(rupees(Math.round((paise / 100) * eased) * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paise, final]);

  return (
    <span className="money-num" aria-label={`${final}${suffix}`}>
      <span aria-hidden="true" className="money-final">
        {final}
        {suffix}
      </span>
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
    </span>
  );
}
