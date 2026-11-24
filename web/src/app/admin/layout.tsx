import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'FasalShield Admin',
  robots: { index: false, follow: false }, // staff portal: keep it out of search engines
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}
