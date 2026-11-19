'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';

export function SignOut() {
  const router = useRouter();
  return (
    <button
      className="btn btn-quiet"
      type="button"
      onClick={async () => {
        await post('/api/session/logout').catch(() => undefined);
        router.replace('/login');
        router.refresh();
      }}
    >
      <LogOut size={20} aria-hidden="true" />
      Sign out
    </button>
  );
}
