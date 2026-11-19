import { daysBetween, evaluate, rulesSchema, type Rules } from '../rules/engine';
import { cellFor } from '../lib/grid';

const drought: Rules = rulesSchema.parse({
  schema: 'fasalshield.rules/v1',
  index: { type: 'DROUGHT_RAIN_DEFICIT', metric: 'RAIN_MM' },
  phases: [
    { id: 'P1', from: '2026-11-01', to: '2026-11-30', weightPct: 40 },
    { id: 'P2', from: '2026-12-01', to: '2026-12-31', weightPct: 60 },
  ],
  slabs: [
    { level: 1, threshold: 40, payoutPctOfPhase: 25 },
    { level: 2, threshold: 60, payoutPctOfPhase: 60 },
    { level: 3, threshold: 80, payoutPctOfPhase: 100 },
  ],
});

const flood: Rules = rulesSchema.parse({
  schema: 'fasalshield.rules/v1',
  index: { type: 'FLOOD_EXCESS_RAIN', metric: 'RAIN_MM', rollingDays: 3 },
  phases: [{ id: 'P1', from: '2026-11-01', to: '2027-03-31', weightPct: 100 }],
  slabs: [
    { level: 1, threshold: 75, payoutPctOfPhase: 30 },
    { level: 2, threshold: 120, payoutPctOfPhase: 60 },
  ],
});

const SI = 1_500_000; // ₹15,000
const normal = () => 10; // 10 mm/day

function rainFor(from: string, to: string, mm: number | ((d: string) => number)) {
  return new Map(daysBetween(from, to).map((d) => [d, typeof mm === 'number' ? mm : mm(d)]));
}

describe('drought rain deficit', () => {
  it('pays slab 1 (docs example ₹1,500) at 55% deficit after 18 days', () => {
    const { decisions, phases } = evaluate({
      rules: drought, asOf: '2026-11-18', rain: rainFor('2026-11-01', '2026-11-18', 4.5),
      normal, sumInsuredPaise: SI, paid: [],
    });
    expect(phases[0]).toMatchObject({ indexValue: 55, state: 'IN_PROGRESS', dataComplete: true });
    expect(decisions).toEqual([{ phaseId: 'P1', slabLevel: 1, indexValue: 55, threshold: 40, payoutAmountPaise: 150_000 }]);
    expect(phases[1]?.state).toBe('UPCOMING');
  });

  it('does not trigger early before minDaysForEarlyTrigger', () => {
    const { decisions } = evaluate({
      rules: drought, asOf: '2026-11-05', rain: rainFor('2026-11-01', '2026-11-05', 0),
      normal, sumInsuredPaise: SI, paid: [],
    });
    expect(decisions).toHaveLength(0);
  });

  it('never triggers on missing data', () => {
    const rain = rainFor('2026-11-01', '2026-11-20', 0);
    rain.delete('2026-11-10');
    const { decisions, phases } = evaluate({ rules: drought, asOf: '2026-11-20', rain, normal, sumInsuredPaise: SI, paid: [] });
    expect(phases[0]?.dataComplete).toBe(false);
    expect(decisions).toHaveLength(0);
  });

  it('reports no index when a cell has no readings yet', () => {
    const { decisions, phases } = evaluate({ rules: drought, asOf: '2026-11-20', rain: new Map(), normal, sumInsuredPaise: SI, paid: [] });
    expect(phases[0]?.indexValue).toBeNull();
    expect(decisions).toHaveLength(0);
  });

  it('tops up to a higher slab without double paying and is idempotent', () => {
    const paid = [{ phaseId: 'P1', slabLevel: 1, amountPaise: 150_000 }];
    const rain = rainFor('2026-11-01', '2026-11-30', 1.5); // 85% deficit → slab 3
    const first = evaluate({ rules: drought, asOf: '2026-11-30', rain, normal, sumInsuredPaise: SI, paid });
    expect(first.decisions).toEqual([
      { phaseId: 'P1', slabLevel: 3, indexValue: 85, threshold: 80, payoutAmountPaise: 450_000 },
    ]);
    const again = evaluate({
      rules: drought, asOf: '2026-11-30', rain, normal, sumInsuredPaise: SI,
      paid: [...paid, { phaseId: 'P1', slabLevel: 3, amountPaise: 450_000 }],
    });
    expect(again.decisions).toHaveLength(0);
  });

  it('caps total payouts at the sum insured', () => {
    const { decisions } = evaluate({
      rules: drought, asOf: '2026-12-31', rain: rainFor('2026-11-01', '2026-12-31', 0), normal,
      sumInsuredPaise: SI, paid: [],
    });
    expect(decisions.reduce((s, d) => s + d.payoutAmountPaise, 0)).toBe(SI);
  });

  it('flags near-threshold for risk alerts', () => {
    const { phases, decisions } = evaluate({
      rules: drought, asOf: '2026-11-20', rain: rainFor('2026-11-01', '2026-11-20', 6.2), normal,
      sumInsuredPaise: SI, paid: [],
    });
    expect(phases[0]).toMatchObject({ indexValue: 38, nearThreshold: true, nextThreshold: 40 });
    expect(decisions).toHaveLength(0);
  });
});

describe('flood excess rain', () => {
  it('triggers on max 3-day rolling sum', () => {
    const rain = rainFor('2026-11-01', '2026-11-10', (d) => (d >= '2026-11-05' && d <= '2026-11-07' ? 45 : 1));
    const { decisions, phases } = evaluate({ rules: flood, asOf: '2026-11-10', rain, normal, sumInsuredPaise: 1_000_000, paid: [] });
    expect(phases[0]?.indexValue).toBe(135);
    expect(decisions).toEqual([{ phaseId: 'P1', slabLevel: 2, indexValue: 135, threshold: 120, payoutAmountPaise: 600_000 }]);
  });
});

describe('rules validation', () => {
  it('rejects bad weights, overlaps and non-monotonic slabs', () => {
    const bad = rulesSchema.safeParse({
      ...drought,
      phases: [
        { id: 'A', from: '2026-11-01', to: '2026-11-30', weightPct: 50 },
        { id: 'B', from: '2026-11-15', to: '2026-12-31', weightPct: 40 },
      ],
      slabs: [
        { level: 1, threshold: 60, payoutPctOfPhase: 50 },
        { level: 2, threshold: 40, payoutPctOfPhase: 25 },
      ],
    });
    expect(bad.success).toBe(false);
    const messages = bad.error?.issues.map((i) => i.message) ?? [];
    expect(messages).toEqual(expect.arrayContaining(['phase weights must sum to 100', 'phases overlap or unordered']));
  });
});

describe('grid', () => {
  it('maps Latur to a stable 0.05° cell', () => {
    const cell = cellFor(18.4, 76.56);
    expect(cell.id).toBe(2168 * 10_000 + 5131);
    expect(cellFor(18.4249, 76.5999).id).toBe(cell.id);
    expect(cellFor(18.45, 76.56).id).not.toBe(cell.id);
  });
});
