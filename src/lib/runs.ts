// Saving and loading a commitment check. Owner: Workstream B.
// One check = one ForecastRun row per scenario (schema: scenario + resultJson = ComparisonResult), saved together.
// The BASE row is the run a decision references; the brief is stored on it. A BLOCKED check saves only a BASE row
// with resultJson "null" so the validation issues can still be shown.
import { prisma } from "./db";
import type { ComparisonResult, ScenarioName } from "./engine/types";
import type { PolicyResult } from "./policy/types";
import type { ValidationIssue } from "./validation/types";
import type { DecisionBrief } from "./ai/schemas";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const SavedReserve = z.object({
  settings: z.object({
    reserveSen: z.number().int().nonnegative(),
  }),
});

export interface CheckInputs {
  settings: unknown; // ForecastSettings + policy config, as used
  proposal: unknown;
  validation: ValidationIssue[];
}

export interface SavedCheck {
  runId: string;
  createdAt: Date;
  reserveSen: number | null; // Reserve used for this calculation.
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
  transactionClient?: Prisma.TransactionClient,
): Promise<string> {
  // Existing callers still get a transaction automatically.
  // Callers with an active transaction can supply its client.
  if (!transactionClient) {
    return prisma.$transaction(
      (tx) =>
        saveCheck(
          requestId,
          inputs,
          comparisons,
          policy,
          brief,
          tx,
        ),
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );
  }

  const tx = transactionClient;
  const inputJson = JSON.stringify(inputs);
  const policyJson = JSON.stringify(policy);
  const base = comparisons.find(
    (comparison) => comparison.scenario.name === "BASE",
  ) ?? null;

  const others = comparisons.filter(
    (comparison) => comparison.scenario.name !== "BASE",
  );

  // Save other scenarios first, then the BASE record.
  for (const comparison of others) {
    await tx.forecastRun.create({
      data: {
        requestId,
        scenario: comparison.scenario.name,
        inputJson,
        resultJson: JSON.stringify(comparison),
        policyJson,
      },
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
}

/** The latest check for a request, or null if it has never run. */
export async function loadLatestCheck(requestId: string): Promise<SavedCheck | null> {
  const base = await prisma.forecastRun.findFirst({ where: { requestId, scenario: "BASE" }, orderBy: { createdAt: "desc" } });
  if (!base) return null;

  const inputs = JSON.parse(base.inputJson) as CheckInputs;
  const savedReserve = SavedReserve.safeParse(inputs);

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
    reserveSen: savedReserve.success
      ? savedReserve.data.settings.reserveSen
      : null,
    validation: inputs.validation,
    comparisons,
    policy: JSON.parse(base.policyJson) as PolicyResult,
    brief: base.briefJson 
      ? (JSON.parse(base.briefJson) as DecisionBrief) 
      : null,
  };
}
