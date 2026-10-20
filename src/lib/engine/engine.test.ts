import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatRM, rmToSen, weekStart } from "./index";

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
});

// TODO(A): turn each todo into a real test with hand-calculated expected values
// (write the calculation in docs/test-cases.md first, then the code).
describe("forecast engine", () => {
  it.todo("baseline daily balances match a hand calculation");
  it.todo("PAID events are excluded; partially paid events use amount - paid");
  it.todo("CANCELLED events are excluded");
  it.todo("unpaid events dated before openingDate move to day 0 with a warning");
  it.todo("monthly recurring costs land on the right days, including month ends");
  it.todo("minimum balance is taken from daily values, not weekly totals");
  it.todo("balance exactly equal to the reserve is not a breach; one sen below is");
  it.todo("peakFundingNeed = max(0, reserve - minBalance)");
  it.todo("horizon extends to the proposal's last event");
  it.todo("DOWNSIDE delays estimated receipts and adds cost increase to unpaid OUT");
  it.todo("DEFERRED_START shifts every proposal event by startShiftDays");
  it.todo("identical inputs give identical outputs");
  it.todo("minBalanceDelta = withProposal.min - baseline.min");
});
