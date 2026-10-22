// Saving and loading a commitment check. Owner: Workstream B.
// One check = one ForecastRun row per scenario (schema: scenario + resultJson = ComparisonResult), saved together.
// The BASE row is the run a decision references; the brief is stored on it. A BLOCKED check saves only a BASE row
// with resultJson "null" so the validation issues can still be shown.
import { prisma } from "./db";
import type { ComparisonResult, ScenarioName } from "./engine/types";
import type { PolicyResult } from "./policy/types";
import type { ValidationIssue } from "./validation/types";
import type { DecisionBrief } from "./ai/schemas";

export interface CheckInputs {
  settings: unknown; // ForecastSettings + policy config, as used
  proposal: unknown;
  validation: ValidationIssue[];
}

export interface SavedCheck {
  runId: string;
  createdAt: Date;
  validation: ValidationIssue[];
  comparisons: ComparisonResult[];
  policy: PolicyResult;
  brief: DecisionBrief | null;
}

export async function saveCheck(
  requestId: string,
  inputs: CheckInputs,
  comparisons: ComparisonResult[],
  policy: PolicyResult,
  brief: DecisionBrief | null,
): Promise<string> {
  const inputJson = JSON.stringify(inputs);
  const policyJson = JSON.stringify(policy);
  const base = comparisons.find((c) => c.scenario.name === "BASE") ?? null;
  const others = comparisons.filter((c) => c.scenario.name !== "BASE");

  return prisma.$transaction(async (tx) => {
    // Other scenarios first, BASE last, so the BASE row is never older than its siblings
    for (const c of others) {
      await tx.forecastRun.create({
        data: { requestId, scenario: c.scenario.name, inputJson, resultJson: JSON.stringify(c), policyJson },
      });
    }
    const run = await tx.forecastRun.create({
      data: {
        requestId,
        scenario: "BASE",
        inputJson,
        resultJson: JSON.stringify(base),
        policyJson,
        briefJson: brief ? JSON.stringify(brief) : null,
      },
    });
    return run.id;
  }, { maxWait: 10_000, timeout: 20_000 }); // above Prisma's 2 s / 5 s defaults: Replit Postgres may be waking from sleep
}

/** The latest check for a request, or null if it has never run. */
export async function loadLatestCheck(requestId: string): Promise<SavedCheck | null> {
  const base = await prisma.forecastRun.findFirst({ where: { requestId, scenario: "BASE" }, orderBy: { createdAt: "desc" } });
  if (!base) return null;

  const comparisons: ComparisonResult[] = [];
  const baseResult = JSON.parse(base.resultJson) as ComparisonResult | null;
  if (baseResult) {
    comparisons.push(baseResult);
    // Siblings from the same check: the newest row of each other scenario at or before the BASE row
    for (const scenario of ["DOWNSIDE", "DEFERRED_START"] satisfies ScenarioName[]) {
      const row = await prisma.forecastRun.findFirst({
        where: { requestId, scenario, createdAt: { lte: base.createdAt } },
        orderBy: { createdAt: "desc" },
      });
      if (row) comparisons.push(JSON.parse(row.resultJson) as ComparisonResult);
    }
  }

  return {
    runId: base.id,
    createdAt: base.createdAt,
    validation: (JSON.parse(base.inputJson) as CheckInputs).validation,
    comparisons,
    policy: JSON.parse(base.policyJson) as PolicyResult,
    brief: base.briefJson ? (JSON.parse(base.briefJson) as DecisionBrief) : null,
  };
}
