'use client';

import { useEffect } from 'react';

/** Installs the service worker (fast reopen + offline page). Production only: it would fight dev reloads. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {}); // the app works the same without it
  }, []);
  return null;
}
