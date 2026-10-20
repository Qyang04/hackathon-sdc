// AI decision-support brief. Owner: Workstream B.
// Input = computed ComparisonResult + PolicyResult only. Label in UI: "Decision support, not financial advice".
import { completeJson } from "./client";
import { DecisionBrief } from "./schemas";
import type { ComparisonResult } from "../engine/types";
import type { PolicyResult } from "../policy/types";

export async function generateBrief(_base: ComparisonResult, _downside: ComparisonResult, _policy: PolicyResult): Promise<DecisionBrief> {
  // TODO(B): build a compact evidence JSON (formatted RM figures, dates, findings), ask for the brief,
  // then reject the brief if it contains any RM figure not present in the evidence.
  void completeJson;
  throw new Error("generateBrief is not implemented yet");
}
