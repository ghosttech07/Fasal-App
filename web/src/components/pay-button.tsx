'use client';

import { Landmark, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { messageFor, post } from '@/lib/client';
import { FormError } from './form-error';

export function PayButton({
  id,
  label,
  waiting,
  opens,
}: {
  id: string;
  label: string;
  waiting: string;
  opens: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error ? <FormError>{error}</FormError> : null}
      <button
        className="btn"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await post(`/api/fs/policies/${id}/pay`);
            router.replace(`/cover/done/${id}`);
          } catch (e) {
            setError(messageFor(e));
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <LoaderCircle className="spin" size={22} aria-hidden="true" />
        ) : (
          <Landmark size={22} aria-hidden="true" />
        )}
        {busy ? waiting : label}
      </button>
      <p className="hint" style={{ textAlign: 'center', fontSize: 14 }}>
        {opens}
      </p>
    </>
  );
}
