import { BellOff } from 'lucide-react';
import { MarkRead } from '@/components/mark-read';
import { StepBoard } from '@/components/step-board';
import { serverGet } from '@/lib/server-api';
import { getT } from '@/i18n/server';
import type { T } from '@/i18n';

type Note = {
  id: string;
  templateCode: string;
  body: Record<string, string>;
  readAt: string | null;
  createdAt: string;
};

/** Each message in plain words, in the farmer's language; unknown kinds fall back to a short generic line. */
function words(n: Note, t: T): [string, string] {
  const b = n.body;
  switch (n.templateCode) {
    case 'POLICY_ISSUED':
      return [t('n.issuedT'), t('n.issued', { policy: b.policy ?? '', amount: b.amount ?? '' })];
    case 'PAYOUT_TRIGGERED':
      return [t('n.trigT'), t('n.trig', { policy: b.policy ?? '', amount: b.amount ?? '' })];
    case 'PAYOUT_SENT':
      return [
        t('n.sentT'),
        `${t('n.sent', { policy: b.policy ?? '', amount: b.amount ?? '' })}${b.utr ? ` ${t('n.utr', { utr: b.utr })}` : ''}`,
      ];
    case 'GRIEVANCE_UPDATE':
      return [
        b.status === 'RESOLVED'
          ? t('n.answerT', { ticket: b.ticket ?? '' })
          : t('n.updateT', { ticket: b.ticket ?? '' }),
        b.response ?? '',
      ];
    default:
      return [t('n.otherT'), ''];
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
  const { t } = await getT();
  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/', label: t('c.home') }}
        title={t('home.messages')}
        sub={t('inbox.sub')}
      />
      <div className="work">
        {notes.length ? (
          <ul className="inbox">
            {notes.map((n) => {
              const [title, text] = words(n, t);
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
            <p>{t('inbox.empty')}</p>
          </div>
        )}
      </div>
      {notes.some((n) => !n.readAt) ? <MarkRead /> : null}
    </main>
  );
}
