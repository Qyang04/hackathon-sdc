import type { ScenarioParams } from "./types";

// Demo scenario presets. The numbers are example parameters, not industry standards;
// customerDelayDays comes from CompanySettings so the owner can change it.
export function scenarioPresets(customerDelayDays: number, deferDays = 30): ScenarioParams[] {
  return [
    { name: "BASE", receiptDelayDays: 0, costIncreasePct: 0, excludeUnconfirmedReceipts: false, startShiftDays: 0 },
    {
      name: "DOWNSIDE",
      receiptDelayDays: customerDelayDays,
      costIncreasePct: 10,
      excludeUnconfirmedReceipts: true,
      startShiftDays: 0,
    },
    {
      name: "DEFERRED_START",
      receiptDelayDays: 0,
      costIncreasePct: 0,
      excludeUnconfirmedReceipts: false,
      startShiftDays: deferDays,
    },
  ];
}
