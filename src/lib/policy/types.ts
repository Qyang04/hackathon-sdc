// Policy contracts. Owner: Workstream A.
import type { ComparisonResult, Sen } from "../engine/types";
import type { ValidationIssue } from "../validation/types";

export type PolicyOutcome = "PASS" | "NEEDS_REVIEW" | "BLOCKED";

/** Example values set by the business owner (CompanySettings), saved with every run. */
export interface PolicyConfig {
  reserveSen: Sen;
  approvalThresholdSen: Sen;
}

export interface PolicyFinding {
  ruleId: string; // e.g. "RESERVE_BREACH_BASE", "ABOVE_APPROVAL_THRESHOLD", "DATA_INCOMPLETE"
  outcome: PolicyOutcome;
  message: string; // plain language, shown to the owner
  value: string | null; // the calculated value, formatted
  threshold: string | null; // the rule's threshold, formatted
}

export interface PolicyResult {
  outcome: PolicyOutcome; // worst outcome across findings: BLOCKED > NEEDS_REVIEW > PASS
  findings: PolicyFinding[];
}

export interface PolicyInput {
  config: PolicyConfig;
  contractValueSen: Sen;
  validationIssues: ValidationIssue[];
  base: ComparisonResult | null; // null when validation blocked the forecast
  downside: ComparisonResult | null;
}
