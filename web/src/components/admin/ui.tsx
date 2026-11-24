import { STATUS_LABEL } from '@/lib/admin';

/** Status pill with a plain-language label; colour is never the only signal (the words carry it). */
export function Status({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="adm-muted">—</span>;
  const s = STATUS_LABEL[value] ?? { text: value, tone: 'plain' as const };
  return <span className={`adm-tag ${s.tone}`}>{s.text}</span>;
}

export function Peril({ value }: { value: string }) {
  return value === 'FLOOD' ? (
    <span className="adm-tag wet">Heavy rain</span>
  ) : (
    <span className="adm-tag dry">Dry spell</span>
  );
}

export function PageHead({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="adm-head">
      <div>
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {children}
    </header>
  );
}

export function Unavailable() {
  return (
    <p className="adm-note">
      Could not load this from the server. Refresh the page, or sign in again.
    </p>
  );
}
