// Deterministic cash forecast. Owner: Workstream A.
// Write these yourselves and be ready to explain every line to the judges (OH 8.5.3).
// Spec: docs/CONTRACTS.md "Engine rules" and the test list in forecast.test.ts.
import type {
  CashEventInput,
  ComparisonResult,
  EngineWarning,
  ForecastResult,
  ForecastSettings,
  NormalisedEvent,
  ProposalInput,
  RecurringCostInput,
  ScenarioParams,
} from "./types";

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet`);
  }
}

/** Expand recurring costs into dated OUT events between openingDate and horizonEnd (inclusive). */
export function expandRecurring(
  _costs: RecurringCostInput[],
  _openingDate: string,
  _horizonEnd: string,
): NormalisedEvent[] {
  throw new NotImplementedError("expandRecurring");
}

/**
 * Turn existing events into the movements the forecast uses:
 * CANCELLED -> dropped; PAID -> dropped (already in opening cash);
 * remaining amount = amountSen - paidSen; dated before openingDate and unpaid -> moved to day 0 + warning.
 */
export function normaliseExisting(
  _events: CashEventInput[],
  _settings: ForecastSettings,
  _scenario: ScenarioParams,
): { events: NormalisedEvent[]; warnings: EngineWarning[] } {
  throw new NotImplementedError("normaliseExisting");
}

/** Materialise proposal events from offsets, applying startShiftDays and scenario rules. */
export function normaliseProposal(
  _proposal: ProposalInput,
  _scenario: ScenarioParams,
): { events: NormalisedEvent[]; warnings: EngineWarning[] } {
  throw new NotImplementedError("normaliseProposal");
}

/** Daily running balance from openingCash over the horizon, plus weekly roll-up and metrics. */
export function runForecast(
  _events: NormalisedEvent[],
  _settings: ForecastSettings,
  _horizonEnd: string,
): ForecastResult {
  throw new NotImplementedError("runForecast");
}

/** Baseline vs with-proposal under one scenario. This is what the API calls. */
export function compareProposal(
  _existing: CashEventInput[],
  _recurring: RecurringCostInput[],
  _proposal: ProposalInput,
  _settings: ForecastSettings,
  _scenario: ScenarioParams,
): ComparisonResult {
  throw new NotImplementedError("compareProposal");
}
