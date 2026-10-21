import { describe, expect, it } from "vitest";
import { addDays, addMonthsCapped, daysBetween, daysInMonth, expandRecurring, formatRM, rmToSen, weekStart } from "./index";
import type { RecurringCostInput } from "./index";

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

// TODO(A): turn each todo into a real test with hand-calculated expected values
// (write the calculation in docs/test-cases.md first, then the code).
describe("forecast engine", () => {
  it.todo("baseline daily balances match a hand calculation");
  it.todo("PAID events are excluded; partially paid events use amount - paid");
  it.todo("CANCELLED events are excluded");
  it.todo("unpaid events dated before openingDate move to day 0 with a warning");
  it.todo("minimum balance is taken from daily values, not weekly totals");
  it.todo("balance exactly equal to the reserve is not a breach; one sen below is");
  it.todo("peakFundingNeed = max(0, reserve - minBalance)");
  it.todo("horizon extends to the proposal's last event");
  it.todo("DOWNSIDE delays estimated receipts and adds cost increase to unpaid OUT");
  it.todo("DEFERRED_START shifts every proposal event by startShiftDays");
  it.todo("identical inputs give identical outputs");
  it.todo("minBalanceDelta = withProposal.min - baseline.min");
});
