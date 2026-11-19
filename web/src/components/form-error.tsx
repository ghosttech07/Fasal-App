import { AlertCircle } from 'lucide-react';

export function FormError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="error" role="alert">
      <AlertCircle size={20} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
      {children}
    </p>
  );
}
