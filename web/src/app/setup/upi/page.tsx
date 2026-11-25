'use client';

import { UpiScreen } from '@/components/upi-screen';

export default function UpiPage() {
  return <UpiScreen postUrl="/api/fs/me/wallets" backHref="/setup/field" next="/" step={3} />;
}
