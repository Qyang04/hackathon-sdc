// Deterministic policy check. Owner: Workstream A.
// The outcome sets the request status; AI never changes it (F5 in the review).
import type { PolicyInput, PolicyResult } from "./types";

export function evaluatePolicy(_input: PolicyInput): PolicyResult {
  // TODO(A): rules agreed in docs/CONTRACTS.md, e.g.
  //  - any validation ERROR -> BLOCKED ("DATA_INCOMPLETE")
  //  - base scenario breaches reserve -> NEEDS_REVIEW
  //  - downside breaches reserve -> NEEDS_REVIEW (worded as a risk, not a verdict)
  //  - contract value above approvalThreshold -> NEEDS_REVIEW
  //  - otherwise PASS
  throw new Error("evaluatePolicy is not implemented yet");
}
