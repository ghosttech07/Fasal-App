'use client';

import { useEffect, useState } from 'react';

/** Appears only if loading takes longer than 4 s, so a slow 2G network never looks like a frozen app. */
export function SlowHint() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className="small slow-hint" role="status" aria-live="polite">
      {slow ? 'Your network is slow. Still loading, please wait.' : ' '}
    </p>
  );
}
