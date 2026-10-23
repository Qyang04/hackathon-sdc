import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeJson } from "./client";
import { generateBrief } from "./brief";
import { formatRM } from "../engine/money";
import type {
  ComparisonResult,
  ForecastResult,
} from "../engine/types";
import type { PolicyResult } from "../policy/types";
import type { DecisionBrief } from "./schemas";

// Replace the AI client only inside this test file.
vi.mock("./client", () => ({
  completeJson: vi.fn(),
}));

const mockCompleteJson = vi.mocked(completeJson);

// Small, typed forecast fixtures: no real engine call is required.
function forecast(minBalanceSen: number): ForecastResult {
  return {
    horizonEnd: "2026-12-31",
    days: [],
    weeks: [],
    metrics: {
      minBalanceSen,
      minBalanceDate: "2026-12-05",
      firstBreachDate: null,
      peakFundingNeedSen: 0,
    },
    events: [],
    warnings: [],
  };
}

const base: ComparisonResult = {
  scenario: {
    name: "BASE",
    receiptDelayDays: 0,
    costIncreasePct: 0,
    excludeUnconfirmedReceipts: false,
    startShiftDays: 0,
  },
  baseline: forecast(8_810_000),
  withProposal: forecast(4_660_000),
  minBalanceDeltaSen: -4_150_000,
  mainContributors: [],
};

const downside: ComparisonResult = {
  ...base,
  scenario: {
    ...base.scenario,
    name: "DOWNSIDE",
    receiptDelayDays: 14,
    costIncreasePct: 10,
    excludeUnconfirmedReceipts: true,
  },
  withProposal: {
    ...forecast(1_775_000),
    metrics: {
      minBalanceSen: 1_775_000,
      minBalanceDate: "2026-12-24",
      firstBreachDate: "2026-12-24",
      peakFundingNeedSen: 1_225_000,
    },
  },
  minBalanceDeltaSen: -7_035_000,
};

const policy: PolicyResult = {
  outcome: "NEEDS_REVIEW",
  findings: [],
};

function validBrief(): DecisionBrief {
  return {
    summary:
      `Lowest cash is ${formatRM(4_660_000)} in the base scenario ` +
      `and ${formatRM(1_775_000)} in the downside scenario.`,
    risks: ["The downside scenario breaches the reserve."],
    missingInfo: [],
    possibleConditions: [],
  };
}

describe("generateBrief", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("accepts a brief containing supplied amounts", async () => {
    const response = validBrief();
    mockCompleteJson.mockResolvedValue(response);

    await expect(
      generateBrief(base, downside, policy),
    ).resolves.toEqual(response);

    expect(mockCompleteJson).toHaveBeenCalledOnce();

    // Confirm the AI receives the expected computed evidence.
    const evidence = JSON.parse(
      mockCompleteJson.mock.calls[0][2],
    );

    expect(evidence.base.lowestCash).toBe(formatRM(4_660_000));
    expect(evidence.downside.fundingNeeded).toBe(
      formatRM(1_225_000),
    );
    expect(evidence.policy.outcome).toBe("NEEDS_REVIEW");
  });

  it("rejects an invented amount in the summary", async () => {
    mockCompleteJson.mockResolvedValue({
      ...validBrief(),
      summary: "Lowest cash is RM 999,999.00.",
    });

    await expect(
      generateBrief(base, downside, policy),
    ).rejects.toThrow("unsupported amount");
  });

  it.each([
    "risks",
    "missingInfo",
    "possibleConditions",
  ] as const)("checks amounts inside %s", async (field) => {
    const response = validBrief();
    response[field] = ["An unsupported amount: RM 999,999.00."];
    mockCompleteJson.mockResolvedValue(response);

    await expect(
      generateBrief(base, downside, policy),
    ).rejects.toThrow("unsupported amount");
  });

  it("detects an invented amount with a lowercase rm prefix", async () => {
    mockCompleteJson.mockResolvedValue({
      ...validBrief(),
      summary: "Lowest cash is rm 999,999.00.",
    });

    await expect(
      generateBrief(base, downside, policy),
    ).rejects.toThrow("unsupported amount");
  });

  it("propagates AI failure to the caller", async () => {
    mockCompleteJson.mockRejectedValue(
      new Error("AI provider unavailable"),
    );

    await expect(
      generateBrief(base, downside, policy),
    ).rejects.toThrow("AI provider unavailable");
  });
});