// Pure presentation helpers for the "How the numbers work" page. Owner: Workstream A.
// No React and no database here — every function is data-in, data-out so it can be unit-tested.
// Figures are never typed in by hand: pages run the engine and pass the results through these helpers.
import type { ComparisonResult, EngineWarningCode, ScenarioParams } from "@/lib/engine/types";

export interface PipelineStep {
  n: number;
  title: string;
  text: string;
}

/** The check, end to end. Function names match src/lib so judges can find the code. */
export const PIPELINE_STEPS: PipelineStep[] = [
  { n: 1, title: "You type the job", text: "Staff enter the client, contract value and every promised payment in and out (the wizard). Dates become offsets from the start date, so the engine only ever sees plain data." },
  { n: 2, title: "We check the data", text: "validateRequest (src/lib/validation) blocks the check until required fields and amounts make sense — e.g. an AI-suggested payment nobody confirmed is an ERROR, not a warning." },
  { n: 3, title: "Count cash day by day", text: "runForecast (src/lib/engine) turns every promise into a daily cash line: money in, money out, closing balance. Paid and cancelled events are ignored; an overdue promise is pulled to day 0 with a warning." },
  { n: 4, title: "Imagine three futures", text: "compareProposal runs the same forecast three ways — as planned, if customers pay late and costs rise, and if the job starts a month later — and shows the lowest point in each." },
  { n: 5, title: "Fixed rules decide", text: "evaluatePolicy (src/lib/policy) applies the owner's own rules — the buffer and the review threshold — and sets the status. The wording never tells the owner to accept or reject; that call stays human." },
];

export interface ScenarioRow {
  key: string;
  blurb: string;
  plannedMinSen: number;
  plannedDate: string;
  withJobMinSen: number;
  withJobDate: string;
  firstBreachDate: string | null;
  peakNeedSen: number;
}

const SCENARIO_BLURBS: Record<ScenarioParams["name"], string> = {
  BASE: "Everything happens on the promised dates.",
  DOWNSIDE: "Estimated client payments arrive late (your delay setting), costs come in 10% higher, and payments nobody has confirmed are dropped.",
  DEFERRED_START: "The job starts a month later than promised.",
};

/** Flattens one engine comparison into the row the page shows. */
export function summariseComparison(c: ComparisonResult): ScenarioRow {
  return {
    key: c.scenario.name,
    blurb: SCENARIO_BLURBS[c.scenario.name] ?? "",
    plannedMinSen: c.baseline.metrics.minBalanceSen,
    plannedDate: c.baseline.metrics.minBalanceDate,
    withJobMinSen: c.withProposal.metrics.minBalanceSen,
    withJobDate: c.withProposal.metrics.minBalanceDate,
    firstBreachDate: c.withProposal.metrics.firstBreachDate,
    peakNeedSen: c.withProposal.metrics.peakFundingNeedSen,
  };
}

export interface SettingRow {
  key: "reserveSen" | "approvalThresholdSen" | "customerDelayDays";
  label: string;
  whatItDoes: string;
  valueSen: number;
  zeroMeans: string;
}

/** One row per owner setting: what it does when on, and what 0 actually means (0 is allowed by design). */
export function buildSettingsRows(s: { reserveSen: number; approvalThresholdSen: number; customerDelayDays: number }): SettingRow[] {
  return [
    {
      key: "reserveSen",
      label: "Safety buffer",
      whatItDoes: "Money you never plan to touch. The check turns red the moment projected cash dips below this line.",
      valueSen: s.reserveSen,
      zeroMeans: "0 = no safety line: the app only reacts when cash actually goes negative.",
    },
    {
      key: "approvalThresholdSen",
      label: "Jobs the owner must review",
      whatItDoes: "Any job above this amount is locked for the owner to accept or decline — staff cannot accept it alone.",
      valueSen: s.approvalThresholdSen,
      zeroMeans: "0 = every single job needs the owner. This is the strictest setting, not 'off'.",
    },
    {
      key: "customerDelayDays",
      label: "How late customers pay",
      whatItDoes: "Feeds the 'if things slip' scenario: estimated client payments (promises with no firm date) are pushed this many days later.",
      valueSen: s.customerDelayDays,
      zeroMeans: "0 = even estimated payments are counted on their promised date, so that scenario loses its bite.",
    },
  ];
}

export interface GlossaryEntry {
  code: string;
  where: "Data check" | "Cash forecast" | "Decision rules";
  meaning: string;
}

/** Every message the system can raise, in plain words. Keep in sync with the code it describes. */
export const WARNING_GLOSSARY: GlossaryEntry[] = [
  { code: "REQUIRED / INVALID_*", where: "Data check", meaning: "A field is missing or wrongly typed (date, amount, number). The check cannot start until it is fixed." },
  { code: "START_BEFORE_OPENING", where: "Data check", meaning: "The job starts before the date your cash figures are counted from." },
  { code: "NO_EVENTS", where: "Data check", meaning: "No payments were entered, so there is nothing to forecast." },
  { code: "UNCONFIRMED_AI_FIELD", where: "Data check", meaning: "A payment was suggested by AI but nobody has confirmed it. Blocks the check on purpose — figures must come from humans." },
  { code: "RECEIPTS_NOT_EQUAL_CONTRACT", where: "Data check", meaning: "The client payments entered do not add up to the contract value. A warning, not a stop." },
  { code: "COSTS_BELOW_BUDGET", where: "Data check", meaning: "Costs entered are less than the budget — missing costs make cash look better than it is." },
  { code: "COSTS_OVER_BUDGET", where: "Data check", meaning: "Costs entered are more than the budget." },
  { code: "POSSIBLE_DUPLICATE", where: "Data check", meaning: "Two payments look like the same one (same amount, same direction, within 3 days)." },
  { code: "OVERDUE_MOVED_TO_DAY0", where: "Cash forecast", meaning: "A promised payment is dated before today's figures start, so it is pulled to day 0 instead of vanishing." },
  { code: "EVENT_BEYOND_HORIZON", where: "Cash forecast", meaning: "A promise lands after the forecast window ends — the window stretches to cover this job's own last payment, but anything later is left out, and the app says so rather than hiding it." },
  { code: "UNCONFIRMED_EXCLUDED", where: "Cash forecast", meaning: "In the 'if things slip' scenario, payments nobody confirmed are left out entirely. A safety net: unconfirmed money should not be counted on." },
  { code: "DATA_INCOMPLETE", where: "Decision rules", meaning: "Data errors are still open, so no cash figures can be trusted yet. The check is blocked." },
  { code: "RESERVE_BREACH_BASE", where: "Decision rules", meaning: "With this job, cash falls below your buffer as planned — or it was already below before the job. Either way the owner sees it." },
  { code: "RESERVE_BREACH_DOWNSIDE", where: "Decision rules", meaning: "As planned you are fine, but if customers pay late and costs rise, cash dips below the buffer. Still worth a look." },
  { code: "ABOVE_APPROVAL_THRESHOLD", where: "Decision rules", meaning: "The job is above the amount you asked to always review, so it goes to the owner." },
];

/** Guards the glossary against drifting from the real codes. */
export function glossaryCoversCodes(codes: EngineWarningCode[]): boolean {
  return codes.every((code) => WARNING_GLOSSARY.some((g) => g.code === code));
}
