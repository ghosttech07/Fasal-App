'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Connection strip. It sits in the page flow (sticky, not floating), so it pushes the screen down instead of
 * covering any text. "Back online" shows for 2.5 s after the connection returns.
 */
export function NetStatus() {
  const [state, setState] = useState<'online' | 'offline' | 'back'>('online');

  useEffect(() => {
    if (!navigator.onLine) setState('offline');
    let t: ReturnType<typeof setTimeout>;
    const off = () => setState('offline');
    const on = () => {
      setState('back');
      clearTimeout(t);
      t = setTimeout(() => setState('online'), 2500);
    };
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    return () => {
      window.removeEventListener('offline', off);
      window.removeEventListener('online', on);
      clearTimeout(t);
    };
  }, []);

  if (state === 'online') return null;
  return (
    <div className={`net ${state}`} role="status" aria-live="polite">
      {state === 'offline' ? (
        <WifiOff size={18} aria-hidden="true" />
      ) : (
        <Wifi size={18} aria-hidden="true" />
      )}
      {state === 'offline'
        ? 'No internet. Check your signal; we will try again on our own.'
        : 'Back online'}
    </div>
  );
}
