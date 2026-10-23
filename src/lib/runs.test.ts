import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import type { PolicyResult } from "./policy/types";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  createRun: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("./db", () => ({
  prisma: {
    forecastRun: {
      findFirst: mocks.findFirst,
    },
    $transaction: mocks.transaction,
  },
}));

import { loadLatestCheck, saveCheck } from "./runs";

function savedRow(settings: unknown) {
  return {
    id: "run-1",
    requestId: "request-1",
    scenario: "BASE",
    createdAt: new Date("2026-11-02T00:00:00Z"),
    inputJson: JSON.stringify({
      settings,
      proposal: {},
      validation: [],
    }),
    // A blocked check can legitimately have no calculation result.
    resultJson: "null",
    policyJson: JSON.stringify({
      outcome: "BLOCKED",
      findings: [],
    }),
    briefJson: null,
  };
}

describe("loadLatestCheck: saved reserve", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when no check exists", async () => {
    mocks.findFirst.mockResolvedValue(null);

    expect(await loadLatestCheck("request-1")).toBeNull();
  });

  it("returns the reserve stored with the check", async () => {
    mocks.findFirst.mockResolvedValue(
      savedRow({ reserveSen: 3_000_000 }),
    );

    const check = await loadLatestCheck("request-1");

    expect(check?.reserveSen).toBe(3_000_000);
    expect(check?.runId).toBe("run-1");
    expect(check?.validation).toEqual([]);
  });

  it("preserves zero as a valid saved reserve", async () => {
    mocks.findFirst.mockResolvedValue(
      savedRow({ reserveSen: 0 }),
    );

    const check = await loadLatestCheck("request-1");

    expect(check?.reserveSen).toBe(0);
  });

  it("returns a null reserve when the saved field is missing", async () => {
    mocks.findFirst.mockResolvedValue(savedRow({}));

    const check = await loadLatestCheck("request-1");

    expect(check).not.toBeNull();
    expect(check?.reserveSen).toBeNull();
  });

  it.each([
    ["negative", -1],
    ["fractional", 1.5],
    ["string", "3000000"],
    ["null", null],
  ])("rejects a %s saved reserve", async (_label, reserveSen) => {
    mocks.findFirst.mockResolvedValue(
      savedRow({ reserveSen }),
    );

    const check = await loadLatestCheck("request-1");

    expect(check?.reserveSen).toBeNull();
  });

  it("returns a null reserve when settings are missing", async () => {
    mocks.findFirst.mockResolvedValue(savedRow(undefined));

    const check = await loadLatestCheck("request-1");

    expect(check?.reserveSen).toBeNull();
  });
});

describe("saveCheck transactions", () => {
  // Partial database client used only by these unit tests.
  const tx = {
    forecastRun: {
      create: mocks.createRun,
    },
  } as unknown as Prisma.TransactionClient;

  const inputs = {
    settings: { reserveSen: 3_000_000 },
    proposal: {},
    validation: [],
  };

  const policy: PolicyResult = {
    outcome: "BLOCKED",
    findings: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mocks.createRun.mockResolvedValue({ id: "saved-run-1" });

    mocks.transaction.mockImplementation(
      async (
        callback: (client: Prisma.TransactionClient) => Promise<unknown>,
      ) => callback(tx),
    );
  });

  it("creates a transaction when no client is supplied", async () => {
    const runId = await saveCheck(
      "request-1",
      inputs,
      [],
      policy,
      null,
    );

    expect(runId).toBe("saved-run-1");
    expect(mocks.transaction).toHaveBeenCalledOnce();

    expect(mocks.createRun).toHaveBeenCalledWith({
      data: {
        requestId: "request-1",
        scenario: "BASE",
        inputJson: JSON.stringify(inputs),
        resultJson: "null",
        policyJson: JSON.stringify(policy),
        briefJson: null,
      },
    });
  });

  it("reuses a supplied transaction without nesting another", async () => {
    const runId = await saveCheck(
      "request-1",
      inputs,
      [],
      policy,
      null,
      tx,
    );

    expect(runId).toBe("saved-run-1");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.createRun).toHaveBeenCalledOnce();
  });

  it("propagates a save failure to the owning transaction", async () => {
    mocks.createRun.mockRejectedValue(
      new Error("Forecast save failed"),
    );

    await expect(
      saveCheck("request-1", inputs, [], policy, null, tx),
    ).rejects.toThrow("Forecast save failed");

    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});