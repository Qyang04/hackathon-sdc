// Guards the demo story: if someone edits the demo data and the scenarios stop showing
// "as planned: above the buffer, if things slip: below it", this fails before the video does.
import { describe, expect, it } from "vitest";
import { compareProposal, scenarioPresets } from "../engine";
import type { CashEventInput, RecurringCostInput } from "../engine";
import { evaluatePolicy } from "../policy/policy";
import { DEMO_COMPANY as C, DEMO_EVENTS, DEMO_PROPOSAL as P, DEMO_RECURRING } from "./data";

const existing: CashEventInput[] = DEMO_EVENTS.map((e) => ({
  id: e.key,
  projectId: e.projectKey,
  direction: e.direction,
  amountSen: e.amountSen,
  paidSen: e.paidSen ?? 0,
  date: e.date,
  status: e.status,
  confidence: e.confidence,
  label: e.label,
  source: "SEEDED",
  confirmed: true,
}));
const recurring: RecurringCostInput[] = DEMO_RECURRING.map((r, i) => ({ id: `r${i}`, ...r, endDate: r.endDate ?? null }));
const settings = { openingCashSen: C.openingCashSen, openingDate: C.openingDate, reserveSen: C.reserveSen, minHorizonDays: 91 };
const proposal = { requestId: "demo", startDate: P.startDate, events: P.events };
const [base, downside, deferred] = scenarioPresets(C.customerDelayDays).map((s) => compareProposal(existing, recurring, proposal, settings, s));

describe("demo company data", () => {
  it("is internally consistent", () => {
    const inSen = P.events.filter((e) => e.direction === "IN").reduce((s, e) => s + e.amountSen, 0);
    const outSen = P.events.filter((e) => e.direction === "OUT").reduce((s, e) => s + e.amountSen, 0);
    expect(inSen).toBe(P.contractValueSen);
    expect(outSen).toBe(P.budgetSen);
    expect(P.contractValueSen).toBeGreaterThan(C.approvalThresholdSen);
    // The sample covers every status the engine treats differently
    for (const status of ["PLANNED", "COMMITTED", "PAID", "CANCELLED"]) expect(DEMO_EVENTS.some((e) => e.status === status)).toBe(true);
    expect(DEMO_EVENTS.some((e) => e.status !== "PAID" && e.date < C.openingDate)).toBe(true); // overdue
    expect(DEMO_EVENTS.some((e) => (e.paidSen ?? 0) > 0 && e.status !== "PAID")).toBe(true); // part paid
  });

  it("stays above the buffer without the job, in every scenario", () => {
    for (const c of [base, downside, deferred]) expect(c.baseline.metrics.firstBreachDate).toBeNull();
  });

  it("with the job: above the buffer as planned, below it if things slip", () => {
    expect(base.withProposal.metrics.firstBreachDate).toBeNull();
    expect(downside.withProposal.metrics.firstBreachDate).not.toBeNull();
    expect(deferred.withProposal.metrics.firstBreachDate).toBeNull();
  });

  it("matches the figures in the demo script", () => {
    expect(base.baseline.metrics).toMatchObject({ minBalanceSen: 8_810_000, minBalanceDate: "2026-12-05" });
    expect(base.withProposal.metrics).toMatchObject({ minBalanceSen: 4_660_000, minBalanceDate: "2026-12-05" });
    expect(downside.withProposal.metrics).toMatchObject({ minBalanceSen: 1_775_000, firstBreachDate: "2026-12-24", peakFundingNeedSen: 1_225_000 });
  });

  it("needs the owner's review for two reasons: downside breach and size", () => {
    const policy = evaluatePolicy({
      config: { reserveSen: C.reserveSen, approvalThresholdSen: C.approvalThresholdSen },
      contractValueSen: P.contractValueSen,
      validationIssues: [],
      base,
      downside,
    });
    expect(policy.outcome).toBe("NEEDS_REVIEW");
    expect(policy.findings.map((f) => f.ruleId).sort()).toEqual(["ABOVE_APPROVAL_THRESHOLD", "RESERVE_BREACH_DOWNSIDE"]);
  });
});
