import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRequest: vi.fn(),
  createActivity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    commitmentRequest: {
      create: mocks.createRequest,
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logActivity: mocks.createActivity,
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({
    role: "STAFF",
    name: "Wei Jie (Project lead)",
  }),
}));

import { DEMO_QUOTATION } from "@/lib/demo/data";
import { POST } from "./route";

function call(body?: unknown) {
  return POST(
    new Request("http://localhost/api/auto-check", {
      method: "POST",
      ...(body === undefined
        ? {}
        : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
    }),
  );
}

describe("POST /api/auto-check (simulated Orbyte Sales webhook)", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.createRequest.mockImplementation(async ({ data }) => ({
      id: "request-new",
      ...data,
      events: data.events.create.map((e: Record<string, unknown>, i: number) => ({ id: `event-${i}`, ...e })),
    }));
    mocks.createActivity.mockResolvedValue({ id: "activity-1" });
  });

  it("uses the demo quotation when the body is empty", async () => {
    const response = await call();
    expect(response.status).toBe(201);

    expect(mocks.createRequest).toHaveBeenCalledOnce();
    const { data } = mocks.createRequest.mock.calls[0][0];
    expect(data.title).toBe(DEMO_QUOTATION.title);
    expect(data.status).toBe("DRAFT");
    expect(data.requestedBy).toContain("Orbyte Sales (simulated)");
    expect(data.events.create).toHaveLength(DEMO_QUOTATION.events.length);
    for (const e of data.events.create) {
      expect(e).toMatchObject({ status: "PLANNED", source: "MANUAL", confirmed: true });
    }

    const json = await response.json();
    expect(json.request.id).toBe("request-new");
    expect(json.check).toEqual({
      method: "POST",
      path: "/api/requests/request-new/forecast",
    });

    expect(mocks.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "request-new",
        actor: "Orbyte Sales (simulated)",
        action: "REQUEST_CREATED",
      }),
    );
  });

  it("uses the posted quotation when the body is a valid payload", async () => {
    const payload = {
      title: "Custom job",
      client: "Custom Client",
      startDate: "2026-11-30",
      durationDays: 14,
      contractValueSen: 500_000,
      budgetSen: 300_000,
      events: [
        {
          direction: "IN",
          amountSen: 500_000,
          offsetDays: 14,
          confidence: "CONFIRMED",
          counterparty: "Custom Client",
          label: "Full payment",
        },
      ],
    };
    const response = await call(payload);

    expect(response.status).toBe(201);
    const { data } = mocks.createRequest.mock.calls[0][0];
    expect(data.title).toBe("Custom job");
    expect(data.requestedBy).toContain("Wei Jie (Project lead)");
  });

  it.each([
    ["negative amount", { ...DEMO_QUOTATION, events: [{ ...DEMO_QUOTATION.events[0], amountSen: -1 }] }],
    ["no events", { ...DEMO_QUOTATION, events: [] }],
    ["bad date", { ...DEMO_QUOTATION, startDate: "23/11/2026" }],
    ["non-integer money", { ...DEMO_QUOTATION, contractValueSen: 1.5 }],
    ["unknown field", { ...DEMO_QUOTATION, eventsAreGreat: true }],
  ])("rejects a payload with %s", async (_name, body) => {
    const response = await call(body);

    expect(response.status).toBe(400);
    expect(mocks.createRequest).not.toHaveBeenCalled();
    expect(mocks.createActivity).not.toHaveBeenCalled();
  });
});
