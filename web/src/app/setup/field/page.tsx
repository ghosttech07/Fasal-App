'use client';

import { FieldScreen } from '@/components/field-screen';

export default function FieldPage() {
  return (
    <FieldScreen postUrl="/api/fs/me/plots" backHref="/setup/about" next="/setup/upi" step={2} />
  );
}
