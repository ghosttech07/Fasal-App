'use client';

import { RotateCw, WifiOff, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Mark } from '@/components/mark';
import { useT } from '@/i18n/client';

/** Any screen that fails to load lands here, with the reason in plain words and one way forward. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useT();
  const [offline, setOffline] = useState(false);
  useEffect(() => setOffline(!navigator.onLine), []);

  return (
    <main className="screen">
      <section className="board" aria-labelledby="err">
        <Mark />
        <h1 id="err" className="board-title">
          {offline ? t('errp.offlineT') : t('errp.failT')}
        </h1>
        <p className="board-sub">{offline ? t('errp.offline') : t('errp.fail')}</p>
      </section>
      <div className="work" style={{ justifyItems: 'center', paddingTop: 40 }}>
        {offline ? (
          <WifiOff size={48} aria-hidden="true" color="var(--ink-2)" />
        ) : (
          <TriangleAlert size={48} aria-hidden="true" color="var(--ink-2)" />
        )}
      </div>
      <div className="action">
        <button
          className="btn"
          type="button"
          onClick={() => (navigator.onLine ? reset() : location.reload())}
        >
          <RotateCw size={20} aria-hidden="true" /> {t('errp.retry')}
        </button>
      </div>
    </main>
  );
}
