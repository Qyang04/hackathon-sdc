// Deterministic cash forecast. Owner: Workstream A.
// Write these yourselves and be ready to explain every line to the judges (OH 8.5.3).
// Spec: docs/CONTRACTS.md "Engine rules" and the test list in forecast.test.ts.
import type {
  CashEventInput,
  DailyPoint,
  ComparisonResult,
  EngineWarning,
  ForecastResult,
  ForecastSettings,
  NormalisedEvent,
  ProposalInput,
  RecurringCostInput,
  ScenarioParams,
  WeeklyPoint,
} from "./types";
import { addDays, addMonthsCapped, weekStart } from "./dates";

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet`);
  }
}

/**
 * Expand recurring costs into dated OUT events up to horizonEnd (or the cost's endDate, whichever is first).
 * Monthly costs keep their original day, capped at short months (DECISIONS 2026-10-21).
 * Occurrences before openingDate are unpaid, so they move to openingDate and are flagged overdue.
 */
export function expandRecurring(
  costs: RecurringCostInput[],
  openingDate: string,
  horizonEnd: string,
): NormalisedEvent[] {
  const out: NormalisedEvent[] = [];
  for (const c of costs) {
    const stop = c.endDate && c.endDate < horizonEnd ? c.endDate : horizonEnd;
    // n counts occurrences from 0; each date is computed from nextDate, never from the previous date
    for (let n = 0; ; n++) {
      const date = c.frequency === "WEEKLY" ? addDays(c.nextDate, 7 * n) : addMonthsCapped(c.nextDate, n);
      if (date > stop) break; // YYYY-MM-DD strings sort in date order
      const overdue = date < openingDate;
      out.push({
        sourceId: `${c.id}#${n}`,
        kind: "RECURRING",
        date: overdue ? openingDate : date,
        signedSen: -c.amountSen,
        label: c.label,
        overdue,
      });
    }
  }
  return out;
}

/**
 * Turn existing events into the movements the forecast uses:
 * CANCELLED -> dropped; PAID -> dropped (already in opening cash);
 * remaining amount = amountSen - paidSen; dated before openingDate and unpaid -> moved to day 0 + warning.
 * Scenario: unconfirmed receipts may be left out; ESTIMATED receipts are delayed (from day 0 if overdue);
 * unpaid OUT amounts get the cost increase.
 */
export function normaliseExisting(
  events: CashEventInput[],
  settings: ForecastSettings,
  scenario: ScenarioParams,
): { events: NormalisedEvent[]; warnings: EngineWarning[] } {
  const out: NormalisedEvent[] = [];
  const warnings: EngineWarning[] = [];

  for (const e of events) {
    if (e.status === "CANCELLED" || e.status === "PAID") continue;
    const remaining = e.amountSen - e.paidSen;
    if (remaining <= 0) continue;

    if (e.direction === "IN" && !e.confirmed && scenario.excludeUnconfirmedReceipts) {
      warnings.push({ code: "UNCONFIRMED_EXCLUDED", sourceId: e.id, message: `"${e.label}" is not confirmed, so this scenario leaves it out.` });
      continue;
    }

    // Overdue first, then the scenario delay, so a late receipt is delayed from today (DECISIONS 2026-10-21)
    const overdue = e.date < settings.openingDate;
    if (overdue) {
      warnings.push({
        code: "OVERDUE_MOVED_TO_DAY0",
        sourceId: e.id,
        message: `"${e.label}" was due ${e.date} and is not paid, so it is counted on ${settings.openingDate}.`,
      });
    }
    let date = overdue ? settings.openingDate : e.date;
    if (e.direction === "IN" && e.confidence === "ESTIMATED") date = addDays(date, scenario.receiptDelayDays);

    const amount = e.direction === "OUT" ? increaseByPct(remaining, scenario.costIncreasePct) : remaining;
    out.push({
      sourceId: e.id,
      kind: "EXISTING",
      date,
      signedSen: e.direction === "IN" ? amount : -amount,
      label: e.label,
      overdue,
    });
  }
  return { events: out, warnings };
}

/** sen x (100 + pct)%, rounded half up to whole sen, in integer arithmetic (pct is a whole number). */
function increaseByPct(sen: number, pct: number): number {
  return Math.floor((sen * (100 + pct) + 50) / 100);
}

/**
 * Materialise proposal events from offsets: date = startDate + startShiftDays + offsetDays.
 * Same scenario rules as existing events. Validation rejects a start before the opening date, so nothing here is overdue.
 */
export function normaliseProposal(
  proposal: ProposalInput,
  scenario: ScenarioParams,
): { events: NormalisedEvent[]; warnings: EngineWarning[] } {
  const out: NormalisedEvent[] = [];
  const warnings: EngineWarning[] = [];
  const start = addDays(proposal.startDate, scenario.startShiftDays);

  for (const e of proposal.events) {
    if (e.direction === "IN" && !e.confirmed && scenario.excludeUnconfirmedReceipts) {
      warnings.push({ code: "UNCONFIRMED_EXCLUDED", sourceId: e.id, message: `"${e.label}" is not confirmed, so this scenario leaves it out.` });
      continue;
    }
    let date = addDays(start, e.offsetDays);
    if (e.direction === "IN" && e.confidence === "ESTIMATED") date = addDays(date, scenario.receiptDelayDays);
    const amount = e.direction === "OUT" ? increaseByPct(e.amountSen, scenario.costIncreasePct) : e.amountSen;
    out.push({
      sourceId: e.id,
      kind: "PROPOSAL",
      date,
      signedSen: e.direction === "IN" ? amount : -amount,
      label: e.label,
      overdue: false,
    });
  }
  return { events: out, warnings };
}

/**
 * Daily running balance from openingCash over openingDate..horizonEnd: closing[d] = closing[d-1] + in[d] - out[d].
 * Events after horizonEnd are left out with EVENT_BEYOND_HORIZON. Weeks (Monday start) are a roll-up for display.
 */
export function runForecast(
  events: NormalisedEvent[],
  settings: ForecastSettings,
  horizonEnd: string,
): ForecastResult {
  const warnings: EngineWarning[] = [];
  const included: NormalisedEvent[] = [];
  for (const e of events) {
    if (e.date < settings.openingDate) throw new Error(`Event ${e.sourceId} is before the opening date; normalise it first`);
    if (e.date > horizonEnd) {
      warnings.push({ code: "EVENT_BEYOND_HORIZON", sourceId: e.sourceId, message: `"${e.label}" on ${e.date} is after the forecast ends (${horizonEnd}).` });
    } else {
      included.push(e);
    }
  }

  // 1. Total IN and OUT per day
  const inByDay = new Map<string, number>();
  const outByDay = new Map<string, number>();
  for (const e of included) {
    const totals = e.signedSen >= 0 ? inByDay : outByDay;
    totals.set(e.date, (totals.get(e.date) ?? 0) + Math.abs(e.signedSen));
  }

  // 2. Walk every day, carrying the balance forward
  const days: DailyPoint[] = [];
  let balance = settings.openingCashSen;
  for (let date = settings.openingDate; date <= horizonEnd; date = addDays(date, 1)) {
    const inSen = inByDay.get(date) ?? 0;
    const outSen = outByDay.get(date) ?? 0;
    balance = balance + inSen - outSen;
    days.push({ date, inSen, outSen, closingSen: balance });
  }

  // 3. Weekly roll-up: sums, last closing and lowest daily closing in each Monday-start week
  const weeks: WeeklyPoint[] = [];
  for (const d of days) {
    const ws = weekStart(d.date);
    const w = weeks[weeks.length - 1];
    if (w && w.weekStart === ws) {
      w.inSen += d.inSen;
      w.outSen += d.outSen;
      w.closingSen = d.closingSen;
      w.lowestDailySen = Math.min(w.lowestDailySen, d.closingSen);
    } else {
      weeks.push({ weekStart: ws, inSen: d.inSen, outSen: d.outSen, closingSen: d.closingSen, lowestDailySen: d.closingSen });
    }
  }

  // 4. Metrics from daily values: lowest balance (earliest day if tied), first day strictly below the reserve
  let minDay = days[0];
  for (const d of days) if (d.closingSen < minDay.closingSen) minDay = d;
  const firstBreach = days.find((d) => d.closingSen < settings.reserveSen);

  return {
    horizonEnd,
    days,
    weeks,
    metrics: {
      minBalanceSen: minDay.closingSen,
      minBalanceDate: minDay.date,
      firstBreachDate: firstBreach ? firstBreach.date : null,
      peakFundingNeedSen: Math.max(0, settings.reserveSen - minDay.closingSen),
    },
    events: included.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    warnings,
  };
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
