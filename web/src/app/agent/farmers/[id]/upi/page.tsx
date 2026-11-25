'use client';

import { useParams } from 'next/navigation';
import { UpiScreen } from '@/components/upi-screen';

/** Agent links the farmer's own UPI ID (name-checked) for payouts. */
export default function AgentUpi() {
  const { id } = useParams<{ id: string }>();
  return (
    <UpiScreen
      postUrl={`/api/fs/agent/farmers/${id}/wallets`}
      backHref={`/agent/farmers/${id}`}
      next={`/agent/farmers/${id}`}
      step={3}
    />
  );
}
