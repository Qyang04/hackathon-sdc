import { describe, expect, it } from "vitest";
import {
  addDays, addMonthsCapped, daysBetween, daysInMonth, expandRecurring, formatRM, normaliseExisting, rmToSen, scenarioPresets, weekStart,
} from "./index";
import type { CashEventInput, ForecastSettings, RecurringCostInput } from "./index";

describe("money helpers", () => {
  it("parses RM strings into integer sen", () => {
    expect(rmToSen("12,345.6")).toBe(1_234_560);
    expect(rmToSen("RM 80000")).toBe(8_000_000);
    expect(() => rmToSen("12.345")).toThrow();
  });
  it("formats sen as RM", () => {
    expect(formatRM(1_234_560)).toBe("RM 12,345.60");
    expect(formatRM(-5)).toBe("-RM 0.05");
  });
});

describe("date helpers", () => {
  it("adds days across month ends", () => {
    expect(addDays("2026-11-28", 5)).toBe("2026-12-03");
    expect(daysBetween("2026-11-02", "2026-12-03")).toBe(31);
  });
  it("finds the Monday of a week", () => {
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // Sunday
    expect(weekStart("2026-11-02")).toBe("2026-11-02"); // Monday
  });
  it("counts days in a month, including leap years", () => {
    expect(daysInMonth(2027, 1)).toBe(31);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 4)).toBe(30);
  });
  it("adds months keeping the original day, capped at short months", () => {
    expect(addMonthsCapped("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonthsCapped("2027-01-31", 2)).toBe("2027-03-31");
    expect(addMonthsCapped("2026-12-15", 1)).toBe("2027-01-15"); // rolls into the next year
  });
});

// Case 4 in docs/test-cases.md: opening 2027-01-01, horizon end 2027-03-31.
describe("expandRecurring", () => {
  const cost = (c: Partial<RecurringCostInput> & Pick<RecurringCostInput, "id" | "frequency" | "nextDate">): RecurringCostInput => ({
    label: c.id,
    amountSen: 100_000,
    endDate: null,
    ...c,
  });
  const dates = (c: RecurringCostInput) => expandRecurring([c], "2027-01-01", "2027-03-31").map((e) => e.date);

  it("R1: monthly on the 31st is capped in February and returns to the 31st in March", () => {
    expect(dates(cost({ id: "R1", frequency: "MONTHLY", nextDate: "2027-01-31" }))).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });

  it("R2: stops after endDate", () => {
    expect(dates(cost({ id: "R2", frequency: "MONTHLY", nextDate: "2027-01-15", endDate: "2027-02-28" }))).toEqual(["2027-01-15", "2027-02-15"]);
  });

  it("R3: weekly stops at the horizon end", () => {
    expect(dates(cost({ id: "R3", frequency: "WEEKLY", nextDate: "2027-03-05" }))).toEqual([
      "2027-03-05", "2027-03-12", "2027-03-19", "2027-03-26",
    ]);
  });

  it("R4: an occurrence before the opening date moves to day 0 and is flagged overdue", () => {
    const events = expandRecurring([cost({ id: "R4", frequency: "MONTHLY", nextDate: "2026-12-28" })], "2027-01-01", "2027-03-31");
    expect(events.map((e) => [e.date, e.overdue])).toEqual([
      ["2027-01-01", true],
      ["2027-01-28", false],
      ["2027-02-28", false],
      ["2027-03-28", false],
    ]);
  });

  it("produces OUT movements with the cost's label and a unique sourceId per occurrence", () => {
    const events = expandRecurring([cost({ id: "R1", frequency: "MONTHLY", nextDate: "2027-01-31", amountSen: 300_000, label: "Rent" })], "2027-01-01", "2027-03-31");
    expect(events.every((e) => e.kind === "RECURRING" && e.signedSen === -300_000 && e.label === "Rent")).toBe(true);
    expect(new Set(events.map((e) => e.sourceId)).size).toBe(events.length);
  });
});

// Case 1 in docs/test-cases.md: opening RM 50,000.00 at 2026-11-02, reserve RM 30,000.00, 14-day horizon.
const case1Settings: ForecastSettings = { openingCashSen: 5_000_000, openingDate: "2026-11-02", reserveSen: 3_000_000, minHorizonDays: 14 };
const ev = (e: Partial<CashEventInput> & Pick<CashEventInput, "id" | "direction" | "amountSen" | "date">): CashEventInput => ({
  projectId: null, paidSen: 0, status: "COMMITTED", confidence: "CONFIRMED", label: e.id, source: "SEEDED", confirmed: true, ...e,
});
const case1Events: CashEventInput[] = [
  ev({ id: "E1", direction: "OUT", amountSen: 400_000, date: "2026-10-28" }),
  ev({ id: "E2", direction: "OUT", amountSen: 1_500_000, date: "2026-11-04" }),
  ev({ id: "E3", direction: "OUT", amountSen: 800_000, paidSen: 800_000, date: "2026-11-05", status: "PAID" }),
  ev({ id: "E4", direction: "OUT", amountSen: 500_000, paidSen: 200_000, date: "2026-11-06" }),
  ev({ id: "E5", direction: "IN", amountSen: 2_000_000, date: "2026-11-07", status: "CANCELLED", confidence: "ESTIMATED" }),
  ev({ id: "E6", direction: "IN", amountSen: 1_000_000, date: "2026-11-09", status: "PLANNED", confidence: "ESTIMATED" }),
  ev({ id: "E7", direction: "IN", amountSen: 500_000, date: "2026-11-14", status: "PLANNED" }),
  ev({ id: "E8", direction: "IN", amountSen: 600_000, date: "2026-11-20", status: "PLANNED" }),
];
const [BASE, DOWNSIDE] = scenarioPresets(14, 30);

describe("normaliseExisting", () => {
  it("Case 1: drops PAID and CANCELLED, counts what is left of partial payments, moves overdue to day 0", () => {
    const { events, warnings } = normaliseExisting(case1Events, case1Settings, BASE);
    expect(events.map((e) => [e.sourceId, e.date, e.signedSen, e.overdue])).toEqual([
      ["E1", "2026-11-02", -400_000, true],
      ["E2", "2026-11-04", -1_500_000, false],
      ["E4", "2026-11-06", -300_000, false],
      ["E6", "2026-11-09", 1_000_000, false],
      ["E7", "2026-11-14", 500_000, false],
      ["E8", "2026-11-20", 600_000, false], // beyond the horizon: runForecast decides, not this step
    ]);
    expect(events.every((e) => e.kind === "EXISTING")).toBe(true);
    expect(warnings.map((w) => [w.code, w.sourceId])).toEqual([["OVERDUE_MOVED_TO_DAY0", "E1"]]);
  });

  it("drops an event whose remaining amount is zero even if not marked PAID", () => {
    const { events } = normaliseExisting([ev({ id: "X", direction: "OUT", amountSen: 100, paidSen: 100, date: "2026-11-05" })], case1Settings, BASE);
    expect(events).toEqual([]);
  });

  it("DOWNSIDE delays only ESTIMATED receipts", () => {
    const { events } = normaliseExisting(case1Events, case1Settings, DOWNSIDE);
    const byId = Object.fromEntries(events.map((e) => [e.sourceId, e]));
    expect(byId.E6.date).toBe("2026-11-23"); // ESTIMATED: 9 Nov + 14 days
    expect(byId.E7.date).toBe("2026-11-14"); // CONFIRMED: unchanged
  });

  it("DOWNSIDE adds the cost increase to unpaid OUT, rounded half up to whole sen", () => {
    const { events } = normaliseExisting(
      [ev({ id: "P3", direction: "OUT", amountSen: 333_335, date: "2026-11-05" }), ev({ id: "E4", direction: "OUT", amountSen: 500_000, paidSen: 200_000, date: "2026-11-06" })],
      case1Settings,
      DOWNSIDE,
    );
    expect(events.map((e) => e.signedSen)).toEqual([-366_669, -330_000]); // 366,668.5 rounds up; 10% of the remaining 3,000.00
  });

  it("DOWNSIDE leaves out unconfirmed receipts with a warning", () => {
    const { events, warnings } = normaliseExisting(
      [ev({ id: "U", direction: "IN", amountSen: 100_000, date: "2026-11-05", confirmed: false, source: "AI_EXTRACTED" })],
      case1Settings,
      DOWNSIDE,
    );
    expect(events).toEqual([]);
    expect(warnings.map((w) => [w.code, w.sourceId])).toEqual([["UNCONFIRMED_EXCLUDED", "U"]]);
  });

  it("DOWNSIDE delays an overdue estimated receipt from day 0, not from its original date", () => {
    const { events } = normaliseExisting(
      [ev({ id: "L", direction: "IN", amountSen: 100_000, date: "2026-10-25", status: "PLANNED", confidence: "ESTIMATED" })],
      case1Settings,
      DOWNSIDE,
    );
    expect([events[0].date, events[0].overdue]).toEqual(["2026-11-16", true]); // 2 Nov + 14 days
  });
});

// TODO(A): turn each todo into a real test with hand-calculated expected values
// (write the calculation in docs/test-cases.md first, then the code).
describe("forecast engine", () => {
  it.todo("baseline daily balances match a hand calculation");
  it.todo("minimum balance is taken from daily values, not weekly totals");
  it.todo("balance exactly equal to the reserve is not a breach; one sen below is");
  it.todo("peakFundingNeed = max(0, reserve - minBalance)");
  it.todo("horizon extends to the proposal's last event");
  it.todo("DOWNSIDE delays estimated receipts and adds cost increase to unpaid OUT");
  it.todo("DEFERRED_START shifts every proposal event by startShiftDays");
  it.todo("identical inputs give identical outputs");
  it.todo("minBalanceDelta = withProposal.min - baseline.min");
});
