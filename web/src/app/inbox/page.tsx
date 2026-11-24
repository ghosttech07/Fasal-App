import { BellOff } from 'lucide-react';
import { MarkRead } from '@/components/mark-read';
import { StepBoard } from '@/components/step-board';
import { serverGet } from '@/lib/server-api';

type Note = {
  id: string;
  templateCode: string;
  body: Record<string, string>;
  readAt: string | null;
  createdAt: string;
};

/** Each message in plain words; unknown kinds fall back to a short generic line. */
function words(n: Note): [string, string] {
  const b = n.body;
  switch (n.templateCode) {
    case 'POLICY_ISSUED':
      return ['Your cover has started', `Policy ${b.policy}, cover up to ${b.amount}.`];
    case 'PAYOUT_TRIGGERED':
      return [
        'Rain crossed a mark',
        `${b.amount} is on its way to your UPI for policy ${b.policy}.`,
      ];
    case 'PAYOUT_SENT':
      return [
        'Money sent',
        `${b.amount} sent to your UPI for policy ${b.policy}.${b.utr ? ` Bank reference ${b.utr}.` : ''}`,
      ];
    case 'GRIEVANCE_UPDATE':
      return [
        b.status === 'RESOLVED' ? `Answer to ${b.ticket}` : `Update on ${b.ticket}`,
        b.response ?? '',
      ];
    default:
      return ['Message from FasalShield', ''];
  }
}

const when = (s: string) =>
  new Date(s).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

export default async function Inbox() {
  const notes = await serverGet<Note[]>('/me/notifications');
  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/', label: 'Home' }}
        title="Messages"
        sub="Money sent, rain marks and answers"
      />
      <div className="work">
        {notes.length ? (
          <ul className="inbox">
            {notes.map((n) => {
              const [title, text] = words(n);
              return (
                <li key={n.id} data-unread={!n.readAt}>
                  <div className="g-head">
                    <b>{title}</b>
                    <span className="small">{when(n.createdAt)}</span>
                  </div>
                  {text ? (
                    <p className="small" style={{ color: 'var(--ink)' }}>
                      {text}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty">
            <BellOff size={32} aria-hidden="true" />
            <p>No messages yet. When money is sent or rain nears a mark, it shows here.</p>
          </div>
        )}
      </div>
      {notes.some((n) => !n.readAt) ? <MarkRead /> : null}
    </main>
  );
}
