// Guards the demo story: if someone edits the demo data and the scenarios stop showing
// "as planned: above the buffer, if things slip: below it", this fails before the video does.
import { describe, expect, it } from "vitest";
import { compareProposal, scenarioPresets } from "../engine";
import type { CashEventInput, ProposalInput, RecurringCostInput } from "../engine";
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
    expect(base.baseline.metrics).toMatchObject({ minBalanceSen: 9_136_000, minBalanceDate: "2026-12-05" });
    expect(base.withProposal.metrics).toMatchObject({ minBalanceSen: 4_986_000, minBalanceDate: "2026-12-05" });
    expect(downside.withProposal.metrics).toMatchObject({ minBalanceSen: 1_182_000, firstBreachDate: "2026-12-24", peakFundingNeedSen: 1_818_000 });
  });

  it("matches the Test 5 figures in docs/E2E-TESTING.md (pantry job, all payments confirmed)", () => {
    const pantry: ProposalInput = {
      requestId: "t5",
      startDate: "2026-11-23",
      events: [
        { id: "T5-1", direction: "IN", amountSen: 1_200_000, offsetDays: 0, confidence: "CONFIRMED", label: "50% deposit", source: "MANUAL", confirmed: true },
        { id: "T5-2", direction: "OUT", amountSen: 1_400_000, offsetDays: 7, confidence: "CONFIRMED", label: "Pantry cabinets", source: "MANUAL", confirmed: true },
        { id: "T5-3", direction: "IN", amountSen: 1_200_000, offsetDays: 30, confidence: "CONFIRMED", label: "50% balance", source: "MANUAL", confirmed: true },
      ],
    };
    const [asPlanned, thingsSlip, startLater] = scenarioPresets(C.customerDelayDays).map((s) => compareProposal(existing, recurring, pantry, settings, s).withProposal.metrics);
    expect(asPlanned).toMatchObject({ minBalanceSen: 8_936_000, minBalanceDate: "2026-12-05", firstBreachDate: null });
    expect(thingsSlip).toMatchObject({ minBalanceSen: 5_463_000, minBalanceDate: "2027-01-29", firstBreachDate: null });
    expect(startLater).toMatchObject({ minBalanceSen: 9_136_000, minBalanceDate: "2026-12-05", firstBreachDate: null });
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
