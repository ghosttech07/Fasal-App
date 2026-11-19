import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { sha256 } from './crypto';

type Tx = Prisma.TransactionClient;

export interface AuditEntry {
  actorType: 'FARMER' | 'AGENT' | 'STAFF' | 'SYSTEM';
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: Prisma.InputJsonValue;
}

const GENESIS = '0'.repeat(64);

/**
 * Appends a hash-chained audit record (Security §8). Pass the caller's transaction so the audit row
 * commits atomically with the change. The advisory lock serialises writers so the chain never forks.
 */
export async function audit(entry: AuditEntry, tx: Tx = prisma): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(424242)`;
  const last = await tx.auditLog.findFirst({ orderBy: { seq: 'desc' }, select: { hash: true } });
  const prevHash = last?.hash ?? GENESIS;
  const at = new Date();
  const hash = sha256(prevHash + canonical({ ...entry, at: at.toISOString() }));
  await tx.auditLog.create({
    data: {
      at,
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      diff: entry.diff,
      prevHash,
      hash,
    },
  });
}

/** Walks the chain; returns the first broken seq or null if intact. */
export async function verifyAuditChain(): Promise<number | null> {
  const rows = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
  let prev = GENESIS;
  for (const row of rows) {
    const expected = sha256(
      prev +
        canonical({
          actorType: row.actorType,
          actorId: row.actorId,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          diff: row.diff ?? undefined,
          at: row.at.toISOString(),
        }),
    );
    if (row.prevHash !== prev || row.hash !== expected) return row.seq;
    prev = row.hash;
  }
  return null;
}

/** Stable JSON: sorted keys, undefined/null dropped, so hashing is deterministic. */
export function canonical(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
