// Unit tests for the "How the numbers work" page helpers. Owner: Workstream A.
import { describe, expect, it } from "vitest";
import type { ComparisonResult, EngineWarningCode, ForecastResult, ScenarioParams } from "@/lib/engine/types";
import { buildSettingsRows, glossaryCoversCodes, PIPELINE_STEPS, summariseComparison, WARNING_GLOSSARY } from "./explain";

const BASE: ScenarioParams = { name: "BASE", receiptDelayDays: 0, costIncreasePct: 0, excludeUnconfirmedReceipts: false, startShiftDays: 0 };

function result(minBalanceSen: number, minBalanceDate: string, firstBreachDate: string | null, peakFundingNeedSen: number): ForecastResult {
  return {
    horizonEnd: "2027-02-05",
    days: [],
    weeks: [],
    metrics: { minBalanceSen, minBalanceDate, firstBreachDate, peakFundingNeedSen },
    events: [],
    warnings: [],
  };
}

describe("summariseComparison", () => {
  it("flattens a no-breach comparison into a row", () => {
    const c: ComparisonResult = {
      scenario: BASE,
      baseline: result(9_136_000, "2026-12-05", null, 0),
      withProposal: result(4_986_000, "2026-12-05", null, 0),
      minBalanceDeltaSen: -4_150_000,
      mainContributors: [],
    };
    const row = summariseComparison(c);
    expect(row.key).toBe("BASE");
    expect(row.plannedMinSen).toBe(9_136_000);
    expect(row.withJobMinSen).toBe(4_986_000);
    expect(row.firstBreachDate).toBeNull();
    expect(row.peakNeedSen).toBe(0);
  });

  it("carries the breach date and peak funding need through", () => {
    const c: ComparisonResult = {
      scenario: { name: "DOWNSIDE", receiptDelayDays: 21, costIncreasePct: 10, excludeUnconfirmedReceipts: true, startShiftDays: 0 },
      baseline: result(9_136_000, "2026-12-05", null, 0),
      withProposal: result(1_182_000, "2027-01-03", "2026-12-24", 1_818_000),
      minBalanceDeltaSen: -7_954_000,
      mainContributors: [],
    };
    const row = summariseComparison(c);
    expect(row.firstBreachDate).toBe("2026-12-24");
    expect(row.peakNeedSen).toBe(1_818_000);
    expect(row.blurb).toContain("arrive late");
    expect(row.blurb).toContain("dropped");
  });
});

describe("buildSettingsRows", () => {
  it("returns one row per owner setting with the live value", () => {
    const rows = buildSettingsRows({ reserveSen: 3_000_000, approvalThresholdSen: 5_000_000, customerDelayDays: 21 });
    expect(rows.map((r) => r.key)).toEqual(["reserveSen", "approvalThresholdSen", "customerDelayDays"]);
    expect(rows.map((r) => r.valueSen)).toEqual([3_000_000, 5_000_000, 21]);
  });

  it("documents that threshold 0 is the strictest setting, not off", () => {
    const rows = buildSettingsRows({ reserveSen: 0, approvalThresholdSen: 0, customerDelayDays: 0 });
    const threshold = rows.find((r) => r.key === "approvalThresholdSen");
    expect(threshold?.zeroMeans).toContain("strictest");
    const reserve = rows.find((r) => r.key === "reserveSen");
    expect(reserve?.zeroMeans).toContain("negative");
  });
});

describe("PIPELINE_STEPS and WARNING_GLOSSARY", () => {
  it("names the five real pipeline stages", () => {
    expect(PIPELINE_STEPS.map((s) => s.title)).toEqual([
      "You type the job",
      "We check the data",
      "Count cash day by day",
      "Imagine three futures",
      "Fixed rules decide",
    ]);
    expect(PIPELINE_STEPS.every((s) => s.text.length > 0)).toBe(true);
  });

  it("covers the engine warning codes (list kept manually in sync with EngineWarningCode)", () => {
    const codes: EngineWarningCode[] = ["OVERDUE_MOVED_TO_DAY0", "EVENT_BEYOND_HORIZON", "UNCONFIRMED_EXCLUDED"];
    expect(glossaryCoversCodes(codes)).toBe(true);
  });

  it("covers the decision rules", () => {
    for (const rule of ["DATA_INCOMPLETE", "RESERVE_BREACH_BASE", "RESERVE_BREACH_DOWNSIDE", "ABOVE_APPROVAL_THRESHOLD"]) {
      expect(WARNING_GLOSSARY.some((g) => g.code === rule)).toBe(true);
    }
  });
});
