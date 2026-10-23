import { generateBrief } from "../src/lib/ai/brief";
import {
  compareProposal,
  scenarioPresets,
} from "../src/lib/engine";
import type {
  CashEventInput,
  RecurringCostInput,
} from "../src/lib/engine";
import { evaluatePolicy } from "../src/lib/policy/policy";
import {
  DEMO_COMPANY,
  DEMO_EVENTS,
  DEMO_PROPOSAL,
  DEMO_RECURRING,
} from "../src/lib/demo/data";

async function main() {
  const existing: CashEventInput[] = DEMO_EVENTS.map((event) => ({
    id: event.key,
    projectId: event.projectKey,
    direction: event.direction,
    amountSen: event.amountSen,
    paidSen: event.paidSen ?? 0,
    date: event.date,
    status: event.status,
    confidence: event.confidence,
    label: event.label,
    source: "SEEDED",
    confirmed: true,
  }));

  const recurring: RecurringCostInput[] = DEMO_RECURRING.map(
    (cost, index) => ({
      id: `recurring-${index}`,
      ...cost,
      endDate: cost.endDate ?? null,
    }),
  );

  const settings = {
    openingCashSen: DEMO_COMPANY.openingCashSen,
    openingDate: DEMO_COMPANY.openingDate,
    reserveSen: DEMO_COMPANY.reserveSen,
    minHorizonDays: 91,
  };

  const proposal = {
    requestId: "live-ai-test",
    startDate: DEMO_PROPOSAL.startDate,
    events: DEMO_PROPOSAL.events,
  };

  const comparisons = scenarioPresets(
    DEMO_COMPANY.customerDelayDays,
  ).map((scenario) =>
    compareProposal(existing, recurring, proposal, settings, scenario),
  );

  const base = comparisons.find(
    (result) => result.scenario.name === "BASE",
  )!;
  const downside = comparisons.find(
    (result) => result.scenario.name === "DOWNSIDE",
  )!;

  const policy = evaluatePolicy({
    config: {
      reserveSen: DEMO_COMPANY.reserveSen,
      approvalThresholdSen: DEMO_COMPANY.approvalThresholdSen,
    },
    contractValueSen: DEMO_PROPOSAL.contractValueSen,
    validationIssues: [],
    base,
    downside,
  });

  console.log("Calculated metrics:", {
    base: base.withProposal.metrics,
    downside: downside.withProposal.metrics,
    policy,
  });

  const brief = await generateBrief(base, downside, policy);
  console.log("AI brief:", JSON.stringify(brief, null, 2));
}

main().catch((error) => {
  console.error(
    "Brief test failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});