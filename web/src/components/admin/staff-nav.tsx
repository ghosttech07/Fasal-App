'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Banknote,
  CloudRain,
  KeyRound,
  LayoutDashboard,
  MapPinned,
  MessageSquareWarning,
  Layers,
  ScrollText,
  UserCog,
  Users,
  Zap,
} from 'lucide-react';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/triggers', label: 'Trigger events', icon: Zap },
  { href: '/admin/products', label: 'Products', icon: Layers },
  { href: '/admin/farmers', label: 'Farmers & policies', icon: Users },
  { href: '/admin/grievances', label: 'Complaints', icon: MessageSquareWarning, cases: true },
  { href: '/admin/fields', label: 'Land checks', icon: MapPinned, cases: true },
  { href: '/admin/rain', label: 'Rain data', icon: CloudRain },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
  { href: '/admin/staff', label: 'Staff & roles', icon: UserCog, adminOnly: true },
  { href: '/admin/account', label: 'My account', icon: KeyRound },
] as const;

/** Portal sections. Staff management shows only for system admins (the API enforces it too). */
export function StaffNav({ role }: { role: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Sections" style={{ display: 'grid', gap: 4 }}>
      {ITEMS.filter(
        (i) =>
          (!('adminOnly' in i) || role === 'SYS_ADMIN') &&
          (!('cases' in i) || ['SYS_ADMIN', 'CLAIMS_OPS', 'REGULATOR'].includes(role)),
      ).map(({ href, label, icon: Icon }) => {
        const here = href === '/admin' ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="adm-link"
            aria-current={here ? 'page' : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
