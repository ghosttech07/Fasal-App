'use client';

import { useEffect } from 'react';
import { post } from '@/lib/client';

/** Opening the inbox marks every message read; a failure only means the dot stays until next time. */
export function MarkRead() {
  useEffect(() => {
    post('/api/fs/me/notifications/read').catch(() => {});
  }, []);
  return null;
}
