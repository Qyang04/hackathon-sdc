import { describe, expect, it, vi } from "vitest";

vi.mock("./audit", () => ({ logActivity: vi.fn() }));

import { checkNotification, decisionNotification } from "./notify";
import type { ComparisonResult } from "./engine/types";

const request = { title: "Office fit-out", requestedBy: "Wei Jie (Project lead)" };

function base(firstBreachDate: string | null): ComparisonResult {
  return { withProposal: { metrics: { minBalanceSen: 2_500_000, minBalanceDate: "2026-12-28", firstBreachDate, peakFundingNeedSen: 0 } } } as ComparisonResult;
}

describe("notification wording", () => {
  it("sends a complete check to the owner with the computed figures", () => {
    const n = checkNotification(request, { outcome: "NEEDS_REVIEW", findings: [] }, base("2026-12-21"));
    expect(n.to).toBe("Aisyah (Owner)");
    expect(n.subject).toBe("Check ready for your decision: Office fit-out");
    expect(n.summary).toContain("RM 25,000.00 on 2026-12-28");
    expect(n.summary).toContain("below the safety buffer from 2026-12-21");
  });

  it("sends a blocked check back to the requester", () => {
    const n = checkNotification(request, { outcome: "BLOCKED", findings: [] }, null);
    expect(n.to).toBe(request.requestedBy);
    expect(n.subject).toBe("Missing information: Office fit-out");
  });

  it("never words a check as advice to accept or reject", () => {
    const n = checkNotification(request, { outcome: "PASS", findings: [] }, base(null));
    expect(`${n.subject} ${n.summary}`).not.toMatch(/recommend|should (accept|reject)/i);
  });

  it("tells the requester the decision and the e-sign envelope", () => {
    const n = decisionNotification(request, "APPROVED", "Cash stays above the buffer.", "SIM-ESIGN-ABC123");
    expect(n.to).toBe(request.requestedBy);
    expect(n.subject).toBe("Approved: Office fit-out");
    expect(n.summary).toContain("SIM-ESIGN-ABC123");
  });
});
