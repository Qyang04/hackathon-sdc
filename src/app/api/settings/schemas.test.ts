import { describe, expect, it } from "vitest";
import { UpdateSettings } from "./schemas";

// to check the partial updates and reject unwanted fields or invalid numbers reacheing the database
//Currently: accept ZERO under these rule, need to confirm business limit with A.

describe("UpdateSettings", () => {
  it("accepts a partial update", () => {
    const result = UpdateSettings.safeParse({
      reserveSen: 3_000_000,
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({ reserveSen: 3_000_000 });
    }
  });

  it("accepts all three settings", () => {
    expect(
      UpdateSettings.safeParse({
        reserveSen: 3_000_000,
        approvalThresholdSen: 10_000_000,
        customerDelayDays: 14,
      }).success,
    ).toBe(true);
  });

  it("accepts zero under the current rules", () => {
    expect(
      UpdateSettings.safeParse({
        reserveSen: 0,
        approvalThresholdSen: 0,
        customerDelayDays: 0,
      }).success,
    ).toBe(true);
  });

  it("accepts a customer delay up to 90 days and rejects more", () => {
    expect(UpdateSettings.safeParse({ customerDelayDays: 90 }).success).toBe(true);
    expect(UpdateSettings.safeParse({ customerDelayDays: 91 }).success).toBe(false);
  });

  it("rejects an empty update", () => {
    expect(UpdateSettings.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(
      UpdateSettings.safeParse({
        reserveSen: 100,
        openingCashSen: 999,
      }).success,
    ).toBe(false);
  });

  // create 3 separate tests in each field, file will run 8 test in total
  it.each([
    "reserveSen",
    "approvalThresholdSen",
    "customerDelayDays",
  ])("rejects invalid values for %s", (field) => {
    const invalidValues = [
      -1,
      1.5,
      "100",
      null,
      2_147_483_648,
    ];

    for (const value of invalidValues) {
      expect(
        UpdateSettings.safeParse({ [field]: value }).success,
      ).toBe(false);
    }
  });
});