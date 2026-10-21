import { describe, expect, it } from "vitest";
import { compareProposal, scenarioPresets } from "../engine";
import type { ForecastSettings, ProposalInput } from "../engine";
import type { ValidationIssue } from "../validation/types";
import { evaluatePolicy } from "./policy";
import type { PolicyInput } from "./types";

// Real engine results from docs/test-cases.md Cases 2 and 3 (opening RM 30,000.00, reserve RM 20,000.00).
const settings: ForecastSettings = { openingCashSen: 3_000_000, openingDate: "2026-11-02", reserveSen: 2_000_000, minHorizonDays: 14 };
const [BASE, DOWNSIDE] = scenarioPresets(14, 30);
const proposal = (withP3: boolean): ProposalInput => ({
  requestId: "REQ",
  startDate: "2026-11-03",
  events: [
    { id: "P1", direction: "OUT", amountSen: 1_000_000, offsetDays: 0, confidence: "CONFIRMED", label: "P1", source: "MANUAL", confirmed: true },
    { id: "P2", direction: "IN", amountSen: 2_500_000, offsetDays: 20, confidence: "ESTIMATED", label: "P2", source: "MANUAL", confirmed: true },
    ...(withP3
      ? [{ id: "P3", direction: "OUT" as const, amountSen: 333_335, offsetDays: 5, confidence: "ESTIMATED" as const, label: "P3", source: "MANUAL" as const, confirmed: true }]
      : []),
  ],
});
// Case 2: base stays exactly at the reserve (no breach), downside breaches. Case 3: base breaches on 2026-11-08.
const run = (withP3: boolean) => ({
  base: compareProposal([], [], proposal(withP3), settings, BASE),
  downside: compareProposal([], [], proposal(withP3), settings, DOWNSIDE),
});
const input = (over: Partial<PolicyInput> = {}): PolicyInput => ({
  config: { reserveSen: 2_000_000, approvalThresholdSen: 3_000_000 },
  contractValueSen: 2_500_000,
  validationIssues: [],
  ...run(false),
  ...over,
});
const ids = (i: PolicyInput) => evaluatePolicy(i).findings.map((f) => [f.ruleId, f.outcome]);

describe("policy", () => {
  it("no rule triggered gives PASS with no findings", () => {
    const noBreach = run(false).base;
    expect(evaluatePolicy(input({ downside: noBreach }))).toEqual({ outcome: "PASS", findings: [] });
  });

  it("validation ERROR gives BLOCKED and no forecast-based findings", () => {
    const error: ValidationIssue = { field: "startDate", severity: "ERROR", code: "REQUIRED", message: "x" };
    const r = evaluatePolicy(input({ validationIssues: [error], ...run(true) }));
    expect(r.outcome).toBe("BLOCKED");
    expect(r.findings.map((f) => f.ruleId)).toEqual(["DATA_INCOMPLETE"]);
  });

  it("a validation WARNING alone does not block", () => {
    const warning: ValidationIssue = { field: "events", severity: "WARNING", code: "COSTS_BELOW_BUDGET", message: "x" };
    expect(evaluatePolicy(input({ validationIssues: [warning], downside: run(false).base })).outcome).toBe("PASS");
  });

  it("base reserve breach gives NEEDS_REVIEW with value and threshold filled", () => {
    const r = evaluatePolicy(input(run(true)));
    expect(r.findings).toEqual([
      {
        ruleId: "RESERVE_BREACH_BASE",
        outcome: "NEEDS_REVIEW",
        message: "With this job, cash falls below your safety buffer on 2026-11-08.",
        value: "RM 16,666.65",
        threshold: "RM 20,000.00",
      },
    ]);
  });

  it("downside-only breach gives NEEDS_REVIEW worded as a risk", () => {
    const r = evaluatePolicy(input());
    expect(ids(input())).toEqual([["RESERVE_BREACH_DOWNSIDE", "NEEDS_REVIEW"]]);
    expect(r.findings[0].message).toMatch(/could fall below/);
    expect(r.findings[0].value).toBe("RM 19,000.00");
  });

  it("contract value above threshold gives NEEDS_REVIEW; equal to threshold does not", () => {
    const quiet = { downside: run(false).base };
    expect(ids(input({ ...quiet, contractValueSen: 3_000_001 }))).toEqual([["ABOVE_APPROVAL_THRESHOLD", "NEEDS_REVIEW"]]);
    expect(ids(input({ ...quiet, contractValueSen: 3_000_000 }))).toEqual([]);
  });

  it("overall outcome is the worst finding", () => {
    const error: ValidationIssue = { field: "title", severity: "ERROR", code: "REQUIRED", message: "x" };
    const r = evaluatePolicy(input({ validationIssues: [error], contractValueSen: 9_000_000 }));
    expect(r.findings.map((f) => f.outcome)).toEqual(["BLOCKED", "NEEDS_REVIEW"]);
    expect(r.outcome).toBe("BLOCKED");
  });
});
