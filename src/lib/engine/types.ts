// Engine contracts. Owner: Workstream A. Consumers: B (API, persistence), C (UI).
// Change these only after telling the team: everything else is built against them.
// Rules (see docs/CONTRACTS.md): money = integer sen; dates = "YYYY-MM-DD" (MYT calendar day);
// the engine is pure (no I/O, no AI, no Date.now()) so identical inputs give identical outputs.

export type Sen = number;
export type ISODate = string;

export type Direction = "IN" | "OUT";
export type EventStatus = "PLANNED" | "COMMITTED" | "PAID" | "CANCELLED";
export type Confidence = "CONFIRMED" | "ESTIMATED";
export type EventSource = "SEEDED" | "MANUAL" | "AI_EXTRACTED";

/** An existing obligation or expected receipt with an absolute date. */
export interface CashEventInput {
  id: string;
  projectId: string | null;
  direction: Direction;
  amountSen: Sen;
  paidSen: Sen;
  date: ISODate;
  status: EventStatus;
  confidence: Confidence;
  label: string;
  source: EventSource;
  confirmed: boolean;
}

export interface RecurringCostInput {
  id: string;
  label: string;
  amountSen: Sen;
  frequency: "WEEKLY" | "MONTHLY";
  nextDate: ISODate;
  endDate: ISODate | null;
}

/** A proposal event is dated relative to the proposal start, so deferring the start is a shift. */
export interface ProposalEventInput {
  id: string;
  direction: Direction;
  amountSen: Sen;
  offsetDays: number;
  confidence: Confidence;
  label: string;
  source: EventSource;
  confirmed: boolean;
}

export interface ProposalInput {
  requestId: string;
  startDate: ISODate;
  events: ProposalEventInput[];
}

export interface ForecastSettings {
  openingCashSen: Sen;
  openingDate: ISODate;
  reserveSen: Sen;
  /** Minimum horizon; the engine extends it to cover the proposal's last event. Default 91 (13 weeks). */
  minHorizonDays: number;
}

export type ScenarioName = "BASE" | "DOWNSIDE" | "DEFERRED_START";

export interface ScenarioParams {
  name: ScenarioName;
  /** Days added to every ESTIMATED receipt (IN). */
  receiptDelayDays: number;
  /** Percentage added to every not-yet-paid OUT amount, e.g. 10 = +10%. Round half up to whole sen. */
  costIncreasePct: number;
  /** If true, unconfirmed receipts are left out entirely. */
  excludeUnconfirmedReceipts: boolean;
  /** Days added to the proposal start date. */
  startShiftDays: number;
}

/** One normalised movement the calculation actually uses (after status, paid and scenario rules). */
export interface NormalisedEvent {
  sourceId: string; // CashEventInput.id, ProposalEventInput.id or `${RecurringCostInput.id}#n`
  kind: "EXISTING" | "RECURRING" | "PROPOSAL";
  date: ISODate;
  signedSen: Sen; // + for IN, - for OUT
  label: string;
  overdue: boolean; // originally dated before openingDate and moved to day 0
}

export interface DailyPoint {
  date: ISODate;
  inSen: Sen;
  outSen: Sen;
  closingSen: Sen;
}

export interface WeeklyPoint {
  weekStart: ISODate; // Monday
  inSen: Sen;
  outSen: Sen;
  closingSen: Sen;
  lowestDailySen: Sen;
}

export interface ForecastMetrics {
  minBalanceSen: Sen;
  minBalanceDate: ISODate;
  /** First day closing balance is strictly below the reserve; null if never. */
  firstBreachDate: ISODate | null;
  /** max(0, reserve - minBalance). */
  peakFundingNeedSen: Sen;
}

export type EngineWarningCode =
  | "OVERDUE_MOVED_TO_DAY0"
  | "EVENT_BEYOND_HORIZON"
  | "UNCONFIRMED_EXCLUDED";

export interface EngineWarning {
  code: EngineWarningCode;
  sourceId: string;
  message: string;
}

export interface ForecastResult {
  horizonEnd: ISODate;
  days: DailyPoint[];
  weeks: WeeklyPoint[];
  metrics: ForecastMetrics;
  events: NormalisedEvent[];
  warnings: EngineWarning[];
}

export interface Contributor {
  sourceId: string;
  label: string;
  date: ISODate;
  signedSen: Sen;
}

export interface ComparisonResult {
  scenario: ScenarioParams;
  baseline: ForecastResult;
  withProposal: ForecastResult;
  /** withProposal.minBalance - baseline.minBalance (usually negative). */
  minBalanceDeltaSen: Sen;
  /** Largest movements in the 14 days up to and including the withProposal minimum date. */
  mainContributors: Contributor[];
}
