import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findRequest: vi.fn(),
  findRun: vi.fn(),
  findCompany: vi.fn(),
  createDecision: vi.fn(),
  updateRequest: vi.fn(),
  transaction: vi.fn(),
  logActivity: vi.fn(),
  sendForSignature: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    commitmentRequest: {
      findUnique: mocks.findRequest,
      update: mocks.updateRequest,
    },
    forecastRun: {
      findFirst: mocks.findRun,
    },
    companySettings: {
      findUnique: mocks.findCompany,
    },
    decision: {
      create: mocks.createDecision,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
  canDecide: (session: { role: string }) =>
    session.role === "OWNER",
}));

vi.mock("@/lib/audit", () => ({
  logActivity: mocks.logActivity,
}));

vi.mock("@/lib/adapters/orbyte", () => ({
  simulatedESign: {
    sendForSignature: mocks.sendForSignature,
  },
}));

import { POST } from "./route";

const settings = {
  openingCashSen: 10_000_000,
  openingDate: "2026-11-02",
  reserveSen: 3_000_000,
  approvalThresholdSen: 10_000_000,
  customerDelayDays: 14,
};

const savedRun = {
  id: "run-1",
  inputJson: JSON.stringify({ settings }),
};

function decide(
  outcome: "APPROVED" | "REJECTED" | "NEEDS_INFO" = "APPROVED",
) {
  const request = new Request(
    "http://localhost/api/requests/request-1/decision",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome,
        reason: "Demo decision",
        forecastRunId: "run-1",
      }),
    },
  );

  return POST(request, {
    params: Promise.resolve({ id: "request-1" }),
  });
}

function expectNoDecisionWrites() {
  expect(mocks.createDecision).not.toHaveBeenCalled();
  expect(mocks.updateRequest).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.logActivity).not.toHaveBeenCalled();
  expect(mocks.sendForSignature).not.toHaveBeenCalled();
}

describe("decision settings freshness", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.getSession.mockResolvedValue({
      role: "OWNER",
      name: "Demo Owner",
    });

    mocks.findRequest.mockResolvedValue({
      id: "request-1",
      status: "CHECKED",
      requestedBy: "Demo Staff",
      title: "Demo Job",
      client: "Demo Client",
    });

    mocks.findRun.mockResolvedValue({ ...savedRun });
    mocks.findCompany.mockResolvedValue({ ...settings });
    mocks.createDecision.mockResolvedValue({ id: "decision-1" });
    mocks.updateRequest.mockResolvedValue({ status: "APPROVED" });
    mocks.logActivity.mockResolvedValue({ id: "activity-1" });

    mocks.transaction.mockImplementation(
      (operations: Promise<unknown>[]) => Promise.all(operations),
    );

    mocks.sendForSignature.mockResolvedValue({
      envelopeId: "SIM-1",
      simulated: true,
    });
  });

  it("allows approval when saved and current settings match", async () => {
    const response = await decide();

    expect(response.status).toBe(200);
    expect(mocks.createDecision).toHaveBeenCalledOnce();
    expect(mocks.sendForSignature).toHaveBeenCalledOnce();
  });

  it.each([
    ["openingCashSen", 11_000_000],
    ["openingDate", "2026-11-03"],
    ["reserveSen", 5_000_000],
    ["approvalThresholdSen", 12_000_000],
    ["customerDelayDays", 30],
  ])("blocks approval when %s changes", async (field, value) => {
    mocks.findCompany.mockResolvedValue({
      ...settings,
      [field]: value,
    });

    const response = await decide();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "Company settings have changed since this check. Run the check again before approving.",
    });
    expectNoDecisionWrites();
  });

  it("blocks approval when saved JSON is malformed", async () => {
    mocks.findRun.mockResolvedValue({
      ...savedRun,
      inputJson: "{",
    });

    const response = await decide();

    expect(response.status).toBe(409);
    expectNoDecisionWrites();
  });

  it("blocks approval when saved settings are incomplete", async () => {
    mocks.findRun.mockResolvedValue({
      ...savedRun,
      inputJson: JSON.stringify({
        settings: { reserveSen: 3_000_000 },
      }),
    });

    const response = await decide();

    expect(response.status).toBe(409);
    expectNoDecisionWrites();
  });

  it("blocks approval when current settings are missing", async () => {
    mocks.findCompany.mockResolvedValue(null);

    const response = await decide();

    expect(response.status).toBe(503);
    expectNoDecisionWrites();
  });

  it.each(["REJECTED", "NEEDS_INFO"] as const)(
    "allows %s without requiring matching settings",
    async (outcome) => {
      mocks.findCompany.mockResolvedValue({
        ...settings,
        reserveSen: 5_000_000,
      });

      const response = await decide(outcome);

      expect(response.status).toBe(200);
      expect(mocks.createDecision).toHaveBeenCalledWith({
        data: expect.objectContaining({ outcome }),
      });
      expect(mocks.findCompany).not.toHaveBeenCalled();
      expect(mocks.sendForSignature).not.toHaveBeenCalled();
    },
  );

  it("blocks staff before reading financial records", async () => {
    mocks.getSession.mockResolvedValue({
      role: "STAFF",
      name: "Demo Staff",
    });

    const response = await decide();

    expect(response.status).toBe(403);
    expect(mocks.findRequest).not.toHaveBeenCalled();
    expect(mocks.findRun).not.toHaveBeenCalled();
    expect(mocks.findCompany).not.toHaveBeenCalled();
    expectNoDecisionWrites();
  });
});