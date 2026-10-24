import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  initialRequest: vi.fn(),
  initialCompany: vi.fn(),
  currentRequest: vi.fn(),
  currentCompany: vi.fn(),
  queryRaw: vi.fn(),
  claimRequest: vi.fn(),
  createActivity: vi.fn(),
  transaction: vi.fn(),
  listCashEvents: vi.fn(),
  listRecurringCosts: vi.fn(),
  generateBrief: vi.fn(),
  saveCheck: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    commitmentRequest: {
      findUnique: mocks.initialRequest,
    },
    companySettings: {
      findUnique: mocks.initialCompany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({
    role: "OWNER",
    name: "Demo Owner",
  }),
}));

vi.mock("@/lib/adapters/orbyte", () => ({
  simulatedAccounting: {
    listCashEvents: mocks.listCashEvents,
    listRecurringCosts: mocks.listRecurringCosts,
  },
}));

vi.mock("@/lib/ai/brief", () => ({
  generateBrief: mocks.generateBrief,
}));

vi.mock("@/lib/runs", () => ({
  saveCheck: mocks.saveCheck,
}));

vi.mock("@/lib/notify", () => ({
  checkNotification: vi.fn(() => ({ to: "Demo Owner", subject: "Check ready", summary: "" })),
  sendNotification: mocks.sendNotification,
}));

import { POST } from "./route";

const company = {
  openingCashSen: 10_000_000,
  openingDate: "2026-11-02",
  reserveSen: 3_000_000,
  approvalThresholdSen: 5_000_000,
  customerDelayDays: 21,
};

const request = {
  id: "request-1",
  title: "Synthetic test job",
  client: "Demo Client",
  status: "DRAFT",
  startDate: "2026-11-02",
  durationDays: 30,
  contractValueSen: 2_000_000,
  budgetSen: 1_000_000,
  events: [
    {
      id: "event-1",
      direction: "OUT",
      amountSen: 1_000_000,
      offsetDays: 0,
      confidence: "CONFIRMED",
      label: "Materials",
      source: "MANUAL",
      confirmed: true,
    },
    {
      id: "event-2",
      direction: "IN",
      amountSen: 2_000_000,
      offsetDays: 30,
      confidence: "CONFIRMED",
      label: "Customer receipt",
      source: "MANUAL",
      confirmed: true,
    },
  ],
};

const brief = {
  summary: "Synthetic test summary.",
  risks: [],
  missingInfo: [],
  possibleConditions: [],
};

const tx = {
  $queryRaw: mocks.queryRaw,
  commitmentRequest: {
    findUnique: mocks.currentRequest,
    updateMany: mocks.claimRequest,
  },
  companySettings: {
    findUnique: mocks.currentCompany,
  },
  activityLog: {
    create: mocks.createActivity,
  },
};

function runCheck() {
  return POST(
    new Request(
      "http://localhost/api/requests/request-1/forecast",
      { method: "POST" },
    ),
    { params: Promise.resolve({ id: "request-1" }) },
  );
}

function expectNoWrites() {
  expect(mocks.claimRequest).not.toHaveBeenCalled();
  expect(mocks.saveCheck).not.toHaveBeenCalled();
  expect(mocks.createActivity).not.toHaveBeenCalled();
  expect(mocks.sendNotification).not.toHaveBeenCalled();
}

describe("forecast save protection", () => {
  beforeEach(() => {
    // Clear call history and implementations of the mocks above.
    Object.values(mocks).forEach((mock) => mock.mockReset());

    mocks.initialRequest.mockResolvedValue(structuredClone(request));
    mocks.currentRequest.mockResolvedValue(structuredClone(request));
    mocks.initialCompany.mockResolvedValue({ ...company });
    mocks.currentCompany.mockResolvedValue({ ...company });

    mocks.queryRaw.mockResolvedValue([{ id: 1 }]);
    mocks.claimRequest.mockResolvedValue({ count: 1 });
    mocks.createActivity.mockResolvedValue({ id: "activity-1" });
    mocks.listCashEvents.mockResolvedValue([]);
    mocks.listRecurringCosts.mockResolvedValue([]);
    mocks.generateBrief.mockResolvedValue(brief);
    mocks.saveCheck.mockResolvedValue("run-1");

    mocks.transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
  });

  it("saves through the supplied transaction", async () => {
    const response = await runCheck();

    expect(response.status).toBe(200);
    expect(mocks.queryRaw).toHaveBeenCalledOnce();

    expect(mocks.claimRequest).toHaveBeenCalledWith({
      where: { id: "request-1", status: "DRAFT" },
      data: { status: "CHECKED" },
    });

    expect(mocks.saveCheck).toHaveBeenCalledOnce();
    expect(mocks.saveCheck.mock.calls[0][5]).toBe(tx);

    expect(mocks.createActivity).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: "request-1",
        action: "FORECAST_RUN",
      }),
    });
    expect(mocks.sendNotification).toHaveBeenCalledOnce();
  });

  it.each(["APPROVED", "REJECTED", "COMPLETED"])(
    "does not save if the request becomes %s during calculation",
    async (status) => {
      mocks.currentRequest.mockResolvedValue({
        ...structuredClone(request),
        status,
      });

      const response = await runCheck();

      expect(response.status).toBe(409);
      expectNoWrites();
    },
  );

  it("does not save when company settings changed", async () => {
    mocks.currentCompany.mockResolvedValue({
      ...company,
      reserveSen: 5_000_000,
    });

    const response = await runCheck();

    expect(response.status).toBe(409);
    expectNoWrites();
  });

  it("does not save when a proposal payment changed", async () => {
    const changed = structuredClone(request);
    changed.events[0].amountSen = 1_100_000;
    mocks.currentRequest.mockResolvedValue(changed);

    const response = await runCheck();

    expect(response.status).toBe(409);
    expectNoWrites();
  });

  it("accepts equivalent events returned in a different order", async () => {
    const reordered = structuredClone(request);
    reordered.events.reverse();
    mocks.currentRequest.mockResolvedValue(reordered);

    const response = await runCheck();

    expect(response.status).toBe(200);
    expect(mocks.saveCheck).toHaveBeenCalledOnce();
  });

  it("does not save a forecast when the status claim fails", async () => {
    mocks.claimRequest.mockResolvedValue({ count: 0 });

    const response = await runCheck();

    expect(response.status).toBe(409);
    expect(mocks.saveCheck).not.toHaveBeenCalled();
    expect(mocks.createActivity).not.toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("propagates a save failure without writing the activity", async () => {
    mocks.saveCheck.mockRejectedValue(
      new Error("Forecast save failed"),
    );

    await expect(runCheck()).rejects.toThrow(
      "Forecast save failed",
    );

    expect(mocks.createActivity).not.toHaveBeenCalled();
  });

  it("still saves deterministic results when AI fails", async () => {
    mocks.generateBrief.mockRejectedValue(
      new Error("AI unavailable"),
    );

    const response = await runCheck();

    expect(response.status).toBe(200);
    expect(mocks.saveCheck.mock.calls[0][4]).toBeNull();
    expect((await response.json()).brief).toBeNull();
  });
});