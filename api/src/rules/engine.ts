import { z } from 'zod';
import { applyBasisPoints } from '@fasalshield/shared';

/**
 * Parametric rule engine (docs §5.3, FS-0501). Pure + deterministic: same inputs → same output,
 * so every TriggerEvent can be re-evaluated from its evidence snapshot (NFR-11).
 */
export const ENGINE_VERSION = 'trigger@0.1.0';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const rulesSchema = z
  .object({
    schema: z.literal('fasalshield.rules/v1'),
    index: z.object({
      // MVP perils (PRD §8); soil moisture / NDVI / SAR arrive in Phase 2.
      type: z.enum(['DROUGHT_RAIN_DEFICIT', 'FLOOD_EXCESS_RAIN']),
      metric: z.literal('RAIN_MM'),
      rollingDays: z.number().int().min(1).max(10).default(3),
    }),
    phases: z
      .array(
        z.object({
          id: z.string().min(1),
          from: isoDate,
          to: isoDate,
          weightPct: z.number().positive().max(100),
        }),
      )
      .min(1),
    slabs: z
      .array(
        z.object({
          level: z.number().int().positive(),
          threshold: z.number().positive(),
          payoutPctOfPhase: z.number().positive().max(100),
        }),
      )
      .min(1),
    minDaysForEarlyTrigger: z.number().int().min(1).default(14),
    alertMarginPct: z.number().min(0).default(10),
  })
  .superRefine((rules, ctx) => {
    const weight = rules.phases.reduce((sum, p) => sum + p.weightPct, 0);
    if (Math.abs(weight - 100) > 1e-9) {
      ctx.addIssue({ code: 'custom', path: ['phases'], message: 'phase weights must sum to 100' });
    }
    rules.phases.forEach((p, i) => {
      if (p.from > p.to) ctx.addIssue({ code: 'custom', path: ['phases', i], message: 'from after to' });
      const prev = rules.phases[i - 1];
      if (prev && p.from <= prev.to) {
        ctx.addIssue({ code: 'custom', path: ['phases', i], message: 'phases overlap or unordered' });
      }
    });
    rules.slabs.forEach((s, i) => {
      const prev = rules.slabs[i - 1];
      if (prev && (s.level <= prev.level || s.threshold <= prev.threshold || s.payoutPctOfPhase <= prev.payoutPctOfPhase)) {
        ctx.addIssue({ code: 'custom', path: ['slabs', i], message: 'slabs must increase in level, threshold and payout' });
      }
    });
  });

export type Rules = z.infer<typeof rulesSchema>;

export interface PaidSlab {
  phaseId: string;
  slabLevel: number;
  amountPaise: number;
}

export interface EvaluateInput {
  rules: Rules;
  asOf: string; // YYYY-MM-DD, last day with data to consider
  rain: ReadonlyMap<string, number>; // date → mm (latest source version)
  normal: (date: string) => number; // long-term mean mm for the date
  sumInsuredPaise: number;
  paid: readonly PaidSlab[];
}

export interface PhaseStatus {
  phaseId: string;
  from: string;
  to: string;
  state: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETE';
  daysElapsed: number;
  observedMm: number;
  normalMm: number;
  /** Deficit % for drought, max rolling-N-day mm for flood. Null before the phase starts. */
  indexValue: number | null;
  dataComplete: boolean;
  triggeredLevel: number;
  nextThreshold: number | null;
  nearThreshold: boolean;
}

export interface TriggerDecision {
  phaseId: string;
  slabLevel: number;
  indexValue: number;
  threshold: number;
  payoutAmountPaise: number;
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function evaluate(input: EvaluateInput): { phases: PhaseStatus[]; decisions: TriggerDecision[] } {
  const { rules, asOf, rain, normal, sumInsuredPaise, paid } = input;
  const drought = rules.index.type === 'DROUGHT_RAIN_DEFICIT';
  let totalPaid = paid.reduce((sum, p) => sum + p.amountPaise, 0);
  const phases: PhaseStatus[] = [];
  const decisions: TriggerDecision[] = [];

  for (const phase of rules.phases) {
    const paidHere = paid.filter((p) => p.phaseId === phase.id);
    const paidLevel = Math.max(0, ...paidHere.map((p) => p.slabLevel));
    const status: PhaseStatus = {
      phaseId: phase.id,
      from: phase.from,
      to: phase.to,
      state: asOf < phase.from ? 'UPCOMING' : asOf >= phase.to ? 'COMPLETE' : 'IN_PROGRESS',
      daysElapsed: 0,
      observedMm: 0,
      normalMm: 0,
      indexValue: null,
      dataComplete: false,
      triggeredLevel: paidLevel,
      nextThreshold: null,
      nearThreshold: false,
    };
    phases.push(status);
    if (status.state === 'UPCOMING') {
      status.nextThreshold = rules.slabs[0]?.threshold ?? null;
      continue;
    }

    const days = daysBetween(phase.from, asOf < phase.to ? asOf : phase.to);
    const values = days.map((d) => rain.get(d));
    status.daysElapsed = days.length;
    status.dataComplete = values.every((v) => v !== undefined);
    status.observedMm = round1(values.reduce<number>((s, v) => s + (v ?? 0), 0));
    status.normalMm = round1(days.reduce((s, d) => s + normal(d), 0));
    // No readings at all for this cell yet: report no index rather than a fake 100% deficit.
    if (values.every((v) => v === undefined)) continue;

    if (drought) {
      status.indexValue =
        status.normalMm > 0 ? round1(Math.max(0, (1 - status.observedMm / status.normalMm) * 100)) : 0;
    } else {
      let max = 0;
      for (let i = 0; i < values.length; i++) {
        const window = values.slice(Math.max(0, i - rules.index.rollingDays + 1), i + 1);
        max = Math.max(max, window.reduce<number>((s, v) => s + (v ?? 0), 0));
      }
      status.indexValue = round1(max);
    }

    const index = status.indexValue;
    const matched = [...rules.slabs].reverse().find((s) => index >= s.threshold);
    const next = rules.slabs.find((s) => s.level > Math.max(paidLevel, matched?.level ?? 0));
    status.nextThreshold = next?.threshold ?? null;
    status.nearThreshold = !!next && index >= next.threshold * (1 - rules.alertMarginPct / 100) && index < next.threshold;

    // Never trigger on gaps (R-03); drought waits for enough days unless the phase is over.
    const mature = !drought || status.state === 'COMPLETE' || days.length >= rules.minDaysForEarlyTrigger;
    if (!matched || matched.level <= paidLevel || !status.dataComplete || !mature) continue;

    const phaseAmount = applyBasisPoints(sumInsuredPaise, Math.round(phase.weightPct * 100));
    const target = applyBasisPoints(phaseAmount, Math.round(matched.payoutPctOfPhase * 100));
    const alreadyForPhase = paidHere.reduce((s, p) => s + p.amountPaise, 0);
    const amount = Math.min(target - alreadyForPhase, sumInsuredPaise - totalPaid); // top-up only, capped at SI
    if (amount <= 0) continue;

    totalPaid += amount;
    status.triggeredLevel = matched.level;
    decisions.push({
      phaseId: phase.id,
      slabLevel: matched.level,
      indexValue: index,
      threshold: matched.threshold,
      payoutAmountPaise: amount,
    });
  }
  return { phases, decisions };
}
