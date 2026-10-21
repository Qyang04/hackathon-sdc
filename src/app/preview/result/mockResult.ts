// Hand-written sample result for previewing the result page before the engine exists (PLAN Phase 1, C).
// Not engine output. BASE weeks are worked out by hand from the seed data plus a sample job:
//   existing: opening RM 80,000 (2 Nov), tiles -15,000 (9 Nov), progress claim +40,000 (20 Nov), payroll -24,000 (28th monthly)
//   job (start 16 Nov): deposit +15,000 (16 Nov), materials -30,000 (23 Nov), subcontractor -20,000 (7 Dec),
//                       progress +30,000 (31 Dec), final +5,000 (30 Jan, estimated)
// DOWNSIDE and DEFERRED_START metrics are illustrative only; their weeks reuse BASE's.
import type { ComparisonResult, ForecastMetrics, ForecastResult, ScenarioParams, WeeklyPoint } from "@/lib/engine/types";
import type { PolicyResult } from "@/lib/policy/types";
import type { DecisionBrief } from "@/lib/ai/schemas";
import { scenarioPresets } from "@/lib/engine/scenarios";
import { rmToSen } from "@/lib/engine/money";

const WEEK_STARTS = [
  "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14",
  "2026-12-21", "2026-12-28", "2027-01-04", "2027-01-11", "2027-01-18", "2027-01-25",
];

// Lowest daily balance in each week, in RM.
const BASELINE_LOWEST = [80_000, 65_000, 65_000, 81_000, 81_000, 81_000, 81_000, 81_000, 57_000, 57_000, 57_000, 57_000, 33_000];
const WITH_JOB_LOWEST = [80_000, 65_000, 80_000, 66_000, 66_000, 46_000, 46_000, 46_000, 22_000, 52_000, 52_000, 52_000, 28_000];

function weeks(lowestRM: number[]): WeeklyPoint[] {
  // In/out are left at zero; the preview only charts the weekly low.
  return lowestRM.map((rm, i) => {
    const sen = rmToSen(String(rm));
    return { weekStart: WEEK_STARTS[i], inSen: 0, outSen: 0, closingSen: sen, lowestDailySen: sen };
  });
}

function forecast(lowestRM: number[], metrics: ForecastMetrics): ForecastResult {
  return { horizonEnd: "2027-01-31", days: [], weeks: weeks(lowestRM), metrics, events: [], warnings: [] };
}

const [BASE, DOWNSIDE, DEFERRED] = scenarioPresets(14) as [ScenarioParams, ScenarioParams, ScenarioParams];

export const mockComparisons: ComparisonResult[] = [
  {
    scenario: BASE,
    baseline: forecast(BASELINE_LOWEST, { minBalanceSen: 3_300_000, minBalanceDate: "2027-01-28", firstBreachDate: null, peakFundingNeedSen: 0 }),
    withProposal: forecast(WITH_JOB_LOWEST, { minBalanceSen: 2_200_000, minBalanceDate: "2026-12-28", firstBreachDate: null, peakFundingNeedSen: 0 }),
    minBalanceDeltaSen: -1_100_000,
    mainContributors: [{ sourceId: "payroll#2", label: "Payroll", date: "2026-12-28", signedSen: -2_400_000 }],
  },
  {
    scenario: DOWNSIDE,
    baseline: forecast(BASELINE_LOWEST, { minBalanceSen: 2_580_000, minBalanceDate: "2027-01-28", firstBreachDate: null, peakFundingNeedSen: 0 }),
    withProposal: forecast(WITH_JOB_LOWEST, { minBalanceSen: 1_460_000, minBalanceDate: "2026-12-28", firstBreachDate: "2026-12-28", peakFundingNeedSen: 540_000 }),
    minBalanceDeltaSen: -1_120_000,
    mainContributors: [],
  },
  {
    scenario: DEFERRED,
    baseline: forecast(BASELINE_LOWEST, { minBalanceSen: 3_300_000, minBalanceDate: "2027-01-28", firstBreachDate: null, peakFundingNeedSen: 0 }),
    withProposal: forecast(WITH_JOB_LOWEST, { minBalanceSen: 2_600_000, minBalanceDate: "2027-01-28", firstBreachDate: null, peakFundingNeedSen: 0 }),
    minBalanceDeltaSen: -700_000,
    mainContributors: [],
  },
];

export const mockPolicy: PolicyResult = {
  outcome: "NEEDS_REVIEW",
  findings: [
    {
      ruleId: "RESERVE_BREACH_DOWNSIDE",
      outcome: "NEEDS_REVIEW",
      message: "If customers pay late and costs rise, cash would fall below your safety buffer on 28 Dec 2026.",
      value: "RM 14,600.00",
      threshold: "RM 20,000.00",
    },
    {
      ruleId: "ABOVE_APPROVAL_THRESHOLD",
      outcome: "NEEDS_REVIEW",
      message: "The contract value is above the amount you asked to always review.",
      value: "RM 50,000.00",
      threshold: "RM 30,000.00",
    },
  ],
};

export const mockBrief: DecisionBrief = {
  summary:
    "As planned, cash stays above the RM 20,000.00 buffer, with the lowest point of RM 22,000.00 on 28 Dec 2026. " +
    "If customers pay late and costs rise, the lowest point falls to RM 14,600.00 on the same day.",
  risks: ["The RM 30,000.00 progress payment lands three days after December payroll."],
  missingInfo: ["The client has not confirmed the date of the final payment."],
  possibleConditions: ["Ask for the progress payment before 28 Dec 2026.", "Start the job later; starting later keeps the lowest point at RM 26,000.00."],
};

export const mockReserveSen = 2_000_000;
