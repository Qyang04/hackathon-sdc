import { describe, expect, it } from "vitest";
import type { ProposalEventInput } from "../engine/types";
import { validateRequest, type RequestDraft } from "./validate";

const event = (e: Partial<ProposalEventInput> & Pick<ProposalEventInput, "id" | "direction" | "amountSen" | "offsetDays">): ProposalEventInput => ({
  confidence: "CONFIRMED",
  label: e.id,
  source: "MANUAL",
  confirmed: true,
  ...e,
});

// A clean draft: receipts = contract value, costs = budget, no duplicates
const draft = (over: Partial<RequestDraft> = {}, events?: ProposalEventInput[]): RequestDraft => ({
  title: "Office fit-out",
  client: "Client (synthetic)",
  startDate: "2026-11-16",
  durationDays: 45,
  contractValueSen: 5_000_000,
  budgetSen: 3_000_000,
  proposal: {
    requestId: "REQ",
    startDate: over.startDate ?? "2026-11-16",
    events: events ?? [
      event({ id: "deposit", direction: "IN", amountSen: 1_500_000, offsetDays: 0 }),
      event({ id: "final", direction: "IN", amountSen: 3_500_000, offsetDays: 45 }),
      event({ id: "materials", direction: "OUT", amountSen: 3_000_000, offsetDays: 7 }),
    ],
  },
  ...over,
});
const codes = (d: RequestDraft) => validateRequest(d, "2026-11-02").map((i) => [i.severity, i.code]);

describe("validateRequest", () => {
  it("a complete, consistent draft has no issues", () => {
    expect(codes(draft())).toEqual([]);
  });

  it("missing start date is an ERROR", () => {
    expect(codes(draft({ startDate: "" }))).toContainEqual(["ERROR", "REQUIRED"]);
  });

  it("a start date before the opening date is an ERROR; the opening date itself is fine", () => {
    expect(codes(draft({ startDate: "2026-11-01" }))).toContainEqual(["ERROR", "START_BEFORE_OPENING"]);
    expect(codes(draft({ startDate: "2026-11-02" }))).toEqual([]);
  });

  it("zero or fractional amounts are ERRORs", () => {
    expect(codes(draft({ contractValueSen: 0 }))).toContainEqual(["ERROR", "INVALID_AMOUNT"]);
    expect(codes(draft({}, [event({ id: "x", direction: "IN", amountSen: 10.5, offsetDays: 0 })]))).toContainEqual(["ERROR", "INVALID_AMOUNT"]);
  });

  it("no payments at all is an ERROR", () => {
    expect(codes(draft({}, []))).toContainEqual(["ERROR", "NO_EVENTS"]);
  });

  it("receipts total different from contract value is a WARNING", () => {
    expect(codes(draft({ contractValueSen: 5_000_001 }))).toEqual([["WARNING", "RECEIPTS_NOT_EQUAL_CONTRACT"]]);
  });

  it("costs below or above the budget are WARNINGs", () => {
    expect(codes(draft({ budgetSen: 3_500_000 }))).toEqual([["WARNING", "COSTS_BELOW_BUDGET"]]);
    expect(codes(draft({ budgetSen: 2_500_000 }))).toEqual([["WARNING", "COSTS_OVER_BUDGET"]]);
  });

  it("unconfirmed AI-extracted event is an ERROR; once confirmed it is fine", () => {
    const ai = (confirmed: boolean) =>
      draft({}, [
        event({ id: "deposit", direction: "IN", amountSen: 5_000_000, offsetDays: 0, source: "AI_EXTRACTED", confirmed }),
        event({ id: "materials", direction: "OUT", amountSen: 3_000_000, offsetDays: 7 }),
      ]);
    expect(codes(ai(false))).toEqual([["ERROR", "UNCONFIRMED_AI_FIELD"]]);
    expect(codes(ai(true))).toEqual([]);
  });

  it("possible duplicate events give a WARNING (same direction and amount within 3 days)", () => {
    const pair = (secondOffset: number) =>
      draft({ budgetSen: 2_000_000 }, [
        event({ id: "deposit", direction: "IN", amountSen: 5_000_000, offsetDays: 0 }),
        event({ id: "a", direction: "OUT", amountSen: 1_000_000, offsetDays: 7 }),
        event({ id: "b", direction: "OUT", amountSen: 1_000_000, offsetDays: secondOffset }),
      ]);
    expect(codes(pair(10))).toEqual([["WARNING", "POSSIBLE_DUPLICATE"]]);
    expect(codes(pair(11))).toEqual([]);
  });
});
