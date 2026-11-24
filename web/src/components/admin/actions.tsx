'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

/** Browser call to the admin proxy. Returns the parsed body or throws with the API's problem code. */
async function adminCall<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api/admin/${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('network');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { code?: string }).code ?? `http_${r.status}`);
  return data as T;
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'That password is not right.',
  code_invalid: 'That code is not right. Use the newest code in your authenticator app.',
  code_used: 'That code was already used. Wait for the next code (every 30 seconds).',
  maker_checker_required: 'You submitted this batch, so a different person must approve it.',
  four_eyes_required: 'You submitted this version, so a different person must publish it.',
  forbidden: 'Your role cannot do this.',
  batch_not_pending: 'This batch is no longer waiting for approval. Refresh the page.',
  version_not_pending: 'This version is no longer waiting for approval. Refresh the page.',
  nothing_to_batch: 'There are no payouts waiting for a batch.',
  phase_weights_must_total_100: 'Phase weights must add up to 100%.',
  slabs_must_rise: 'Each mark must be higher than the one before, and pay at least as much.',
  phase_dates_invalid: 'A phase ends before it starts.',
  season_unknown: 'That season does not exist.',
  staff_exists: 'Someone with this email already has an account.',
  cannot_change_self: 'You cannot change your own account here. Ask another admin.',
  account_locked: 'Too many wrong codes. Your account is locked for 15 minutes.',
  staff_session_required: 'Your session ended. Sign in again.',
  network: 'No connection. Check your internet and try again.',
  validation_failed: 'Please check what you entered.',
};
const say = (e: unknown) =>
  MESSAGES[(e as Error)?.message] ?? 'Something went wrong. Try again in a minute.';

/** Asks for a fresh 6-digit authenticator code before a sensitive action. */
function CodeDialog({
  title,
  detail,
  confirm,
  onCode,
  dialogRef,
}: {
  title: string;
  detail: string;
  confirm: string;
  onCode: (code: string) => Promise<void>;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <dialog
      ref={dialogRef}
      className="adm-dialog"
      aria-labelledby="dlg-h"
      onClose={() => {
        setCode('');
        setError(null);
      }}
    >
      <form
        className="adm-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onCode(code);
            dialogRef.current?.close();
          } catch (err) {
            setError(say(err));
            setCode('');
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3 id="dlg-h">{title}</h3>
        <p className="adm-muted" style={{ margin: 0 }}>
          {detail}
        </p>
        <label>
          Authenticator code (or the admin password)
          <input
            type="password"
            autoComplete="one-time-code"
            maxLength={200}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            style={{ fontSize: 20, textAlign: 'center' }}
          />
        </label>
        {error ? (
          <p className="adm-err" role="alert">
            {error}
          </p>
        ) : null}
        <div className="adm-tools" style={{ margin: 0 }}>
          <button className="adm-btn gold" type="submit" disabled={busy || code.length < 6}>
            {busy ? 'Working…' : confirm}
          </button>
          <button className="adm-btn line" type="button" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

// ---------- Payouts ----------

export function SubmitBatch({ waiting, totalLabel }: { waiting: number; totalLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="adm-tools" style={{ margin: 0 }}>
      <button
        className="adm-btn"
        disabled={busy || waiting === 0}
        onClick={async () => {
          if (
            !confirm(
              `Put all ${waiting} waiting payouts (${totalLabel}) into a batch for approval?`,
            )
          )
            return;
          setBusy(true);
          setMsg(null);
          try {
            const r = await adminCall<{ code: string; count: number }>('POST', 'batches', {});
            setMsg(
              `${r.code} submitted with ${r.count} payouts. A payout approver must now approve it.`,
            );
            router.refresh();
          } catch (e) {
            setMsg(say(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Submitting…' : `Submit ${waiting} for approval`}
      </button>
      {msg ? (
        <span className="adm-muted" role="status">
          {msg}
        </span>
      ) : null}
    </div>
  );
}

export function BatchDecision({
  id,
  code,
  count,
  totalLabel,
}: {
  id: string;
  code: string;
  count: number;
  totalLabel: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <div className="adm-tools" style={{ margin: 0 }}>
        <button className="adm-btn gold" onClick={() => ref.current?.showModal()}>
          Approve
        </button>
        <button
          className="adm-btn line"
          onClick={async () => {
            const note = prompt(`Why reject ${code}? The payouts go back to waiting.`);
            if (!note || note.trim().length < 3) return;
            try {
              await adminCall('POST', `batches/${id}/reject`, { note });
              router.refresh();
            } catch (e) {
              setMsg(say(e));
            }
          }}
        >
          Reject
        </button>
      </div>
      {msg ? (
        <p className="adm-err" role="alert">
          {msg}
        </p>
      ) : null}
      <CodeDialog
        dialogRef={ref}
        title={`Approve ${code}`}
        detail={`${count} farmers, ${totalLabel}. Money is sent to their UPI IDs as soon as you approve.`}
        confirm="Approve and send"
        onCode={async (c) => {
          const r = await adminCall<{ credited: number; failed: number }>(
            'POST',
            `batches/${id}/approve`,
            { code: c },
          );
          alert(
            `${code} sent: ${r.credited} credited${r.failed ? `, ${r.failed} need action` : ''}.`,
          );
          router.refresh();
        }}
      />
    </>
  );
}

// ---------- Products ----------

type VersionInput = {
  id: string;
  seasonCode: string;
  sumInsuredPaise: number;
  premiumRateBp: number;
  subsidyBp: number;
  enrolmentCutoff: string;
  waitingPeriodDays: number;
  rules: {
    phases: { id: string; from: string; to: string; weightPct: number }[];
    slabs: { level: number; threshold: number; payoutPctOfPhase: number }[];
  };
};

export function NewVersion({
  productId,
  from,
  seasons,
}: {
  productId: string;
  from: VersionInput;
  seasons: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState(() => ({
    seasonCode: from.seasonCode,
    sumInsured: String(from.sumInsuredPaise / 100),
    premiumPct: String(from.premiumRateBp / 100),
    subsidyPct: String(from.subsidyBp / 100),
    cutoff: String(from.enrolmentCutoff).slice(0, 10),
    waiting: String(from.waitingPeriodDays),
    phases: from.rules.phases.map((p) => ({ ...p })),
    slabs: from.rules.slabs.map((s) => ({ ...s })),
  }));
  if (!open)
    return (
      <button className="adm-btn line" onClick={() => setOpen(true)}>
        New version
      </button>
    );
  return (
    <form
      className="adm-form adm-card"
      style={{ marginTop: 12 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await adminCall<{ id: string }>('POST', `products/${productId}/versions`, {
            fromVersionId: from.id,
            seasonCode: f.seasonCode,
            sumInsuredPaise: Math.round(Number(f.sumInsured) * 100),
            premiumRateBp: Math.round(Number(f.premiumPct) * 100),
            subsidyBp: Math.round(Number(f.subsidyPct) * 100),
            enrolmentCutoff: f.cutoff,
            waitingPeriodDays: Number(f.waiting),
            phases: f.phases.map((p) => ({ ...p, weightPct: Number(p.weightPct) })),
            slabs: f.slabs.map((s) => ({
              ...s,
              threshold: Number(s.threshold),
              payoutPctOfPhase: Number(s.payoutPctOfPhase),
            })),
          });
          await adminCall('POST', `versions/${r.id}/submit`);
          setOpen(false);
          router.refresh();
        } catch (err) {
          setError(say(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 style={{ margin: 0 }}>
        New version{' '}
        <small>
          copied from v{'{'}current{'}'}; a second person must publish it
        </small>
      </h2>
      <div className="row">
        <label>
          Season
          <select value={f.seasonCode} onChange={(e) => setF({ ...f, seasonCode: e.target.value })}>
            {seasons.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Cover per acre (₹)
          <input
            inputMode="numeric"
            value={f.sumInsured}
            onChange={(e) => setF({ ...f, sumInsured: e.target.value })}
          />
        </label>
        <label>
          Premium (% of cover)
          <input
            inputMode="decimal"
            value={f.premiumPct}
            onChange={(e) => setF({ ...f, premiumPct: e.target.value })}
          />
        </label>
        <label>
          Sponsor share (% of premium)
          <input
            inputMode="decimal"
            value={f.subsidyPct}
            onChange={(e) => setF({ ...f, subsidyPct: e.target.value })}
          />
        </label>
        <label>
          Enrolment closes
          <input
            type="date"
            value={f.cutoff}
            onChange={(e) => setF({ ...f, cutoff: e.target.value })}
          />
        </label>
        <label>
          Waiting period (days)
          <input
            inputMode="numeric"
            value={f.waiting}
            onChange={(e) => setF({ ...f, waiting: e.target.value })}
          />
        </label>
      </div>
      <b>Phases</b>
      {f.phases.map((p, i) => (
        <div className="row" key={p.id}>
          <label>
            {p.id}
            <input
              type="date"
              value={p.from}
              onChange={(e) => {
                const phases = [...f.phases];
                phases[i] = { ...p, from: e.target.value };
                setF({ ...f, phases });
              }}
            />
          </label>
          <label>
            to
            <input
              type="date"
              value={p.to}
              onChange={(e) => {
                const phases = [...f.phases];
                phases[i] = { ...p, to: e.target.value };
                setF({ ...f, phases });
              }}
            />
          </label>
          <label>
            Weight %
            <input
              inputMode="numeric"
              value={p.weightPct}
              onChange={(e) => {
                const phases = [...f.phases];
                phases[i] = { ...p, weightPct: Number(e.target.value) };
                setF({ ...f, phases });
              }}
            />
          </label>
        </div>
      ))}
      <b>Marks</b>
      {f.slabs.map((s, i) => (
        <div className="row" key={s.level}>
          <label>
            Mark {s.level}: threshold
            <input
              inputMode="decimal"
              value={s.threshold}
              onChange={(e) => {
                const slabs = [...f.slabs];
                slabs[i] = { ...s, threshold: Number(e.target.value) };
                setF({ ...f, slabs });
              }}
            />
          </label>
          <label>
            pays % of phase
            <input
              inputMode="decimal"
              value={s.payoutPctOfPhase}
              onChange={(e) => {
                const slabs = [...f.slabs];
                slabs[i] = { ...s, payoutPctOfPhase: Number(e.target.value) };
                setF({ ...f, slabs });
              }}
            />
          </label>
        </div>
      ))}
      {error ? (
        <p className="adm-err" role="alert">
          {error}
        </p>
      ) : null}
      <div className="adm-tools" style={{ margin: 0 }}>
        <button className="adm-btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save and send for approval'}
        </button>
        <button className="adm-btn line" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function VersionDecision({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <div className="adm-tools" style={{ margin: 0 }}>
        <button className="adm-btn gold" onClick={() => ref.current?.showModal()}>
          Approve and publish
        </button>
        <button
          className="adm-btn line"
          onClick={async () => {
            const note = prompt('What should be changed? The version goes back to draft.');
            if (!note || note.trim().length < 3) return;
            try {
              await adminCall('POST', `versions/${id}/reject`, { note });
              router.refresh();
            } catch (e) {
              setMsg(say(e));
            }
          }}
        >
          Send back
        </button>
      </div>
      {msg ? (
        <p className="adm-err" role="alert">
          {msg}
        </p>
      ) : null}
      <CodeDialog
        dialogRef={ref}
        title={`Publish ${label}`}
        detail="Once published, these rules are locked and hashed. Farmers can buy this cover in its season."
        confirm="Publish"
        onCode={async (c) => {
          await adminCall('POST', `versions/${id}/approve`, { code: c });
          router.refresh();
        }}
      />
    </>
  );
}

export function SubmitDraft({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="adm-btn line"
      onClick={async () => {
        try {
          await adminCall('POST', `versions/${id}/submit`);
          router.refresh();
        } catch (e) {
          alert(say(e));
        }
      }}
    >
      Send for approval
    </button>
  );
}

// ---------- Rain, audit ----------

export function Simulator({
  district,
  districtLabel,
}: {
  district: string;
  districtLabel: string;
}) {
  const router = useRouter();
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [from, setFrom] = useState(iso(new Date(today.getTime() - 30 * 86_400_000)));
  const [to, setTo] = useState(iso(new Date(today.getTime() - 86_400_000)));
  const [pct, setPct] = useState(38);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="adm-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const r = await adminCall<{ triggerEventsCreated: number; cells: number }>(
            'POST',
            'simulator/scenarios',
            { districtCode: district, from, to, pctOfNormal: pct },
          );
          setMsg(`Done: ${r.cells} cells updated, ${r.triggerEventsCreated} new trigger events.`);
          router.refresh();
        } catch (err) {
          const m = (err as Error).message;
          setMsg(
            m === 'not_found'
              ? 'The simulator is switched off on this server (ENABLE_SIMULATOR).'
              : say(err),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="adm-muted" style={{ margin: 0 }}>
        Sets the rain in {districtLabel} to a share of normal, then runs the daily evaluation.
        Tagged as simulated; blocked in production.
      </p>
      <div className="row">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <label>
        Rain as % of normal: <b>{pct}%</b> ({100 - pct}% below)
        <input
          type="range"
          min={0}
          max={200}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          style={{ minHeight: 44, padding: 0 }}
        />
      </label>
      <button className="adm-btn" type="submit" disabled={busy}>
        {busy ? 'Running…' : 'Simulate and evaluate'}
      </button>
      {msg ? (
        <p className="adm-muted" role="status" style={{ margin: 0 }}>
          {msg}
        </p>
      ) : null}
    </form>
  );
}

export function VerifyChain() {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="adm-tools" style={{ margin: 0 }}>
      <button
        className="adm-btn line"
        onClick={async () => {
          setMsg('Checking…');
          try {
            const r = await adminCall<{ valid: boolean; brokenAtSeq: number | null }>(
              'GET',
              'audit/verify',
            );
            setMsg(
              r.valid
                ? 'Chain verified: no entry has been changed or removed.'
                : `Chain broken at entry ${r.brokenAtSeq}. Report this now.`,
            );
          } catch (e) {
            setMsg(say(e));
          }
        }}
      >
        Verify chain
      </button>
      {msg ? (
        <span className="adm-muted" role="status">
          {msg}
        </span>
      ) : null}
    </div>
  );
}

// ---------- Staff ----------

const ROLES = [
  ['SYS_ADMIN', 'System admin'],
  ['PRODUCT_MANAGER', 'Product manager'],
  ['CLAIMS_OPS', 'Claims ops'],
  ['PAYOUT_APPROVER', 'Payout approver'],
  ['REINSURER', 'Reinsurer (read-only)'],
  ['REGULATOR', 'Regulator (read-only)'],
] as const;

export function InviteStaff() {
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', role: 'CLAIMS_OPS' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; pw: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="adm-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setResult(null);
        try {
          const r = await adminCall<{ email: string; oneTimePassword: string }>('POST', 'staff', f);
          setResult({ email: r.email, pw: r.oneTimePassword });
          setF({ name: '', email: '', role: 'CLAIMS_OPS' });
          router.refresh();
        } catch (err) {
          setError(say(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="row">
        <label>
          Name
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </label>
        <label>
          Work email
          <input
            type="email"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            required
          />
        </label>
        <label>
          Role
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {ROLES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <p className="adm-err" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="adm-ok" role="status">
          Account created for <b>{result.email}</b>. One-time password:{' '}
          <b className="adm-hash" style={{ fontSize: 15, color: 'inherit' }}>
            {result.pw}
          </b>
          <br />
          Share it privately now. It is not shown again. They set up two-step sign-in the first time
          they sign in.
        </div>
      ) : null}
      <button className="adm-btn" type="submit" disabled={busy} style={{ justifySelf: 'start' }}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}

export function StaffRow({
  id,
  status,
  role,
  self,
}: {
  id: string;
  status: string;
  role: string;
  self: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  if (self) return <span className="adm-muted">You</span>;
  const run = async (fn: () => Promise<unknown>) => {
    setMsg(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setMsg(say(e));
    }
  };
  return (
    <div className="adm-tools" style={{ margin: 0 }}>
      <select
        aria-label="Role"
        defaultValue={role}
        onChange={(e) => run(() => adminCall('PATCH', `staff/${id}`, { role: e.target.value }))}
      >
        {ROLES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button
        className="adm-btn line"
        onClick={() =>
          run(() =>
            adminCall('PATCH', `staff/${id}`, {
              status: status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
            }),
          )
        }
      >
        {status === 'ACTIVE' ? 'Disable' : 'Enable'}
      </button>
      <button
        className="adm-btn line"
        onClick={() =>
          run(async () => {
            if (!confirm('Issue a new one-time password and reset their authenticator?')) return;
            const r = await adminCall<{ oneTimePassword: string }>('POST', `staff/${id}/reset`);
            prompt('New one-time password (shown once). Copy it now:', r.oneTimePassword);
          })
        }
      >
        Reset sign-in
      </button>
      {msg ? (
        <span className="adm-err" role="alert">
          {msg}
        </span>
      ) : null}
    </div>
  );
}

// ---------- Complaints and land checks ----------

/** Reply to a farmer's complaint; the reply goes to the farmer's in-app messages. */
export function AnswerGrievance({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go(status: 'IN_PROGRESS' | 'RESOLVED') {
    if (text.trim().length < 5) return setErr('Write the answer the farmer will read.');
    setBusy(true);
    setErr(null);
    try {
      await adminCall('PATCH', `grievances/${id}`, { status, response: text.trim() });
      setOpen(false);
      setText('');
      router.refresh();
    } catch (e) {
      setErr(say(e));
    } finally {
      setBusy(false);
    }
  }
  if (!open)
    return (
      <button className="adm-btn line" onClick={() => setOpen(true)}>
        Answer
      </button>
    );
  return (
    <div style={{ display: 'grid', gap: 8, minWidth: 260 }}>
      <textarea
        aria-label="Answer to the farmer"
        rows={3}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Plain words the farmer will read in the app"
        style={{
          font: 'inherit',
          padding: 8,
          borderRadius: 8,
          border: '1px solid var(--adm-rule, #d6ded8)',
        }}
      />
      {err ? (
        <span role="alert" style={{ color: '#b42318', fontSize: 13 }}>
          {err}
        </span>
      ) : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="adm-btn" disabled={busy} onClick={() => go('RESOLVED')}>
          Send and close
        </button>
        <button className="adm-btn line" disabled={busy} onClick={() => go('IN_PROGRESS')}>
          Send update
        </button>
        <button className="adm-btn line" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Record the result of checking a field against the 7/12 land record. */
export function CheckField({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go(decision: 'VERIFIED' | 'REJECTED') {
    if (note.trim().length < 3) return setErr('Add a short note, e.g. "7/12 name and area match".');
    setBusy(true);
    setErr(null);
    try {
      await adminCall('POST', `fields/${id}/check`, { decision, note: note.trim() });
      router.refresh();
    } catch (e) {
      setErr(say(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 220 }}>
      <input
        aria-label="Check note"
        maxLength={300}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="7/12 name, survey no. and area match"
        style={{
          font: 'inherit',
          padding: '6px 8px',
          borderRadius: 8,
          border: '1px solid #d6ded8',
        }}
      />
      {err ? (
        <span role="alert" style={{ color: '#b42318', fontSize: 13 }}>
          {err}
        </span>
      ) : null}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="adm-btn" disabled={busy} onClick={() => go('VERIFIED')}>
          Verified
        </button>
        <button className="adm-btn line" disabled={busy} onClick={() => go('REJECTED')}>
          Reject
        </button>
      </div>
    </div>
  );
}
