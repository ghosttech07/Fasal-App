'use client';

import { useParams } from 'next/navigation';
import { FieldScreen } from '@/components/field-screen';

/** Agent pins an enrolled farmer's field, standing in it. */
export default function AgentField() {
  const { id } = useParams<{ id: string }>();
  return (
    <FieldScreen
      postUrl={`/api/fs/agent/farmers/${id}/plots`}
      backHref={`/agent/farmers/${id}`}
      next={`/agent/farmers/${id}/upi`}
      step={2}
    />
  );
}
