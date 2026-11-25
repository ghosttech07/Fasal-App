'use client';

import { LogOut } from 'lucide-react';
import { post } from '@/lib/client';
import { useT } from '@/i18n/client';

export function SignOut() {
  const { t } = useT();
  return (
    <button
      className="btn btn-quiet"
      type="button"
      onClick={async () => {
        await post('/api/session/logout').catch(() => undefined);
        window.location.replace('/login'); // full load drops every cached signed-in page
      }}
    >
      <LogOut size={20} aria-hidden="true" />
      {t('c.signOut')}
    </button>
  );
}
