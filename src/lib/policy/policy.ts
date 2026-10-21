// Deterministic policy check. Owner: Workstream A.
// The outcome sets the request status; AI never changes it (F5 in the review).
// Wording describes what the figures show; it never tells the owner to accept or reject.
import { formatRM } from "../engine/money";
import type { PolicyFinding, PolicyInput, PolicyOutcome, PolicyResult } from "./types";

const RANK: Record<PolicyOutcome, number> = { PASS: 0, NEEDS_REVIEW: 1, BLOCKED: 2 };

export function evaluatePolicy(input: PolicyInput): PolicyResult {
  const { config, contractValueSen, validationIssues, base, downside } = input;
  const findings: PolicyFinding[] = [];

  const errors = validationIssues.filter((i) => i.severity === "ERROR");
  if (errors.length > 0) {
    // No forecast-based findings: the figures cannot be trusted until the inputs are fixed
    findings.push({
      ruleId: "DATA_INCOMPLETE",
      outcome: "BLOCKED",
      message: `${errors.length} item(s) must be fixed before the check can run.`,
      value: null,
      threshold: null,
    });
  } else {
    const baseBreach = base?.withProposal.metrics.firstBreachDate ?? null;
    const downBreach = downside?.withProposal.metrics.firstBreachDate ?? null;
    if (base && baseBreach) {
      const alreadyBelow = base.baseline.metrics.firstBreachDate !== null;
      findings.push({
        ruleId: "RESERVE_BREACH_BASE",
        outcome: "NEEDS_REVIEW",
        message: alreadyBelow
          ? `Cash already falls below your safety buffer without this job; with it, cash is below the buffer from ${baseBreach}.`
          : `With this job, cash falls below your safety buffer on ${baseBreach}.`,
        value: formatRM(base.withProposal.metrics.minBalanceSen),
        threshold: formatRM(config.reserveSen),
      });
    } else if (downside && downBreach) {
      findings.push({
        ruleId: "RESERVE_BREACH_DOWNSIDE",
        outcome: "NEEDS_REVIEW",
        message: `As planned, cash stays above your safety buffer. If customers pay late and costs rise, it could fall below on ${downBreach}.`,
        value: formatRM(downside.withProposal.metrics.minBalanceSen),
        threshold: formatRM(config.reserveSen),
      });
    }
  }

  if (contractValueSen > config.approvalThresholdSen) {
    findings.push({
      ruleId: "ABOVE_APPROVAL_THRESHOLD",
      outcome: "NEEDS_REVIEW",
      message: "The contract value is above the amount you asked to always review.",
      value: formatRM(contractValueSen),
      threshold: formatRM(config.approvalThresholdSen),
    });
  }

  const outcome = findings.reduce<PolicyOutcome>((worst, f) => (RANK[f.outcome] > RANK[worst] ? f.outcome : worst), "PASS");
  return { outcome, findings };
}
