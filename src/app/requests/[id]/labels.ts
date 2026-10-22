// Plain-language names for scenarios and policy outcomes. Shared by server and client components.
import type { ScenarioName } from "@/lib/engine/types";
import type { PolicyResult } from "@/lib/policy/types";

export const SCENARIO_TEXT: Record<ScenarioName, { name: string; help: string }> = {
  BASE: { name: "As planned", help: "Payments arrive on the dates entered" },
  DOWNSIDE: { name: "If things slip", help: "Customers pay late, costs rise 10%, unconfirmed receipts left out" },
  DEFERRED_START: { name: "Start later", help: "Same job, started later" },
};

export const OUTCOME: Record<PolicyResult["outcome"], { text: string; tone: string }> = {
  PASS: { text: "No rule triggered", tone: "ok" },
  NEEDS_REVIEW: { text: "Needs your review", tone: "warn" },
  BLOCKED: { text: "Missing information", tone: "danger" },
};
