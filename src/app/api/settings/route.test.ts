// test API route
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database and session; no real database is required.
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  transaction: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  createActivity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
  canDecide: (session: { role: string }) =>
    session.role === "OWNER",
}));

import { PATCH } from "./route";

const previous = {
  id: 1,
  companyName: "Demo Company",
  openingCashSen: 10_000_000,
  openingDate: "2026-11-02",
  reserveSen: 3_000_000,
  approvalThresholdSen: 10_000_000,
  customerDelayDays: 14,
};

const updated = {
  ...previous,
  reserveSen: 4_000_000,
};

const tx = {
  companySettings: {
    findUnique: mocks.findUnique,
    update: mocks.update,
  },
  activityLog: {
    create: mocks.createActivity,
  },
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/settings", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.getSession.mockResolvedValue({
      role: "OWNER",
      name: "Demo Owner",
    });

    mocks.findUnique.mockResolvedValue(previous);
    mocks.update.mockResolvedValue(updated);
    mocks.createActivity.mockResolvedValue({ id: "activity-1" });

    mocks.transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
  });

  it("blocks staff without accessing the database", async () => {
    mocks.getSession.mockResolvedValue({
      role: "STAFF",
      name: "Demo Staff",
    });

    const response = await PATCH(
      request({ reserveSen: 4_000_000 }),
    );

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid input without accessing the database", async () => {
    const response = await PATCH(
      request({ reserveSen: -1 }),
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("saves an owner update and records before/after values", async () => {
    const response = await PATCH(
      request({ reserveSen: 4_000_000 }),
    );

    expect(response.status).toBe(200);

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { reserveSen: 4_000_000 },
    });

    expect(mocks.createActivity).toHaveBeenCalledOnce();

    const activity =
      mocks.createActivity.mock.calls[0][0].data;

    expect(activity).toMatchObject({
      requestId: null,
      actor: "Demo Owner",
      action: "SETTINGS_UPDATED",
    });

    expect(JSON.parse(activity.detail)).toEqual({
      before: {
        reserveSen: 3_000_000,
        approvalThresholdSen: 10_000_000,
        customerDelayDays: 14,
      },
      after: {
        reserveSen: 4_000_000,
        approvalThresholdSen: 10_000_000,
        customerDelayDays: 14,
      },
    });

    expect(await response.json()).toEqual({
      settings: {
        reserveSen: 4_000_000,
        approvalThresholdSen: 10_000_000,
        customerDelayDays: 14,
      },
    });
  });

  it("returns 404 when company settings are missing", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await PATCH(
      request({ reserveSen: 4_000_000 }),
    );

    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.createActivity).not.toHaveBeenCalled();
  });

  it("propagates a database update failure", async () => {
    mocks.update.mockRejectedValue(
      new Error("Database unavailable"),
    );

    await expect(
      PATCH(request({ reserveSen: 4_000_000 })),
    ).rejects.toThrow("Database unavailable");

    expect(mocks.createActivity).not.toHaveBeenCalled();
  });

  it("propagates an activity-log failure", async () => {
    mocks.createActivity.mockRejectedValue(
      new Error("Activity write failed"),
    );

    await expect(
      PATCH(request({ reserveSen: 4_000_000 })),
    ).rejects.toThrow("Activity write failed");
  });
});