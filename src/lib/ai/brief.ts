// AI decision-support brief. Owner: Workstream B.
// Input = computed ComparisonResult + PolicyResult only. Label in UI: "Decision support, not financial advice".
import { completeJson } from "./client";
import { DecisionBrief } from "./schemas";
import type { ComparisonResult } from "../engine/types";
import type { PolicyResult } from "../policy/types";
import { formatRM } from "../engine/money";

export async function generateBrief(
  base: ComparisonResult,
  downside: ComparisonResult,
  policy: PolicyResult,
): Promise<DecisionBrief> {
  // TODO(B): build a compact evidence JSON (formatted RM figures, dates, findings), ask for the brief,
  // then reject the brief if it contains any RM figure not present in the evidence.
  const evidence = {
    base: {
      lowestCash: formatRM(base.withProposal.metrics.minBalanceSen),
      lowestCashDate: base.withProposal.metrics.minBalanceDate,
      firstBreachDate: base.withProposal.metrics.firstBreachDate,
      fundingNeeded: formatRM(base.withProposal.metrics.peakFundingNeedSen),
    },

    downside: {
      lowestCash: formatRM(downside.withProposal.metrics.minBalanceSen),
      lowestCashDate: downside.withProposal.metrics.minBalanceDate,
      firstBreachDate: downside.withProposal.metrics.firstBreachDate,
      fundingNeeded: formatRM(downside.withProposal.metrics.peakFundingNeedSen),
    },

    policy: {
      outcome: policy.outcome,
      findings: policy.findings,
    },
  };


// The lowest cash balance under each scenario.
// When that lowest balance occurs.
// The first date below the reserve—null means no breach.
// Extra cash needed to meet the reserve.
// The policy findings.


  void completeJson;
  throw new Error("generateBrief is not implemented yet");
}
