// Request validation. Owner: Workstream A (rules) with B (wiring).
// ERROR = the check cannot run until it is fixed. WARNING = the check runs and the owner sees the note.
import type { ProposalInput } from "../engine/types";
import { formatRM } from "../engine/money";
import type { ValidationIssue } from "./types";

export interface RequestDraft {
  title: string;
  client: string;
  startDate: string;
  durationDays: number;
  contractValueSen: number;
  budgetSen: number;
  proposal: ProposalInput;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isPositiveInt = (n: number) => Number.isInteger(n) && n > 0;

/** openingDate = the forecast's day 0; a job cannot start before it (normaliseProposal relies on this). */
export function validateRequest(draft: RequestDraft, openingDate: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (field: string, code: string, message: string) => issues.push({ field, severity: "ERROR", code, message });
  const warning = (field: string, code: string, message: string) => issues.push({ field, severity: "WARNING", code, message });

  // Required fields and valid values
  if (!draft.title.trim()) error("title", "REQUIRED", "Give the job a name.");
  if (!draft.client.trim()) error("client", "REQUIRED", "Enter the client.");
  if (!draft.startDate) {
    error("startDate", "REQUIRED", "Enter the planned start date.");
  } else if (!ISO.test(draft.startDate) || Number.isNaN(Date.parse(draft.startDate))) {
    error("startDate", "INVALID_DATE", "The start date is not a valid date.");
  } else if (draft.startDate < openingDate) {
    error("startDate", "START_BEFORE_OPENING", `The job cannot start before ${openingDate}, the date the cash figures are from.`);
  }
  if (!isPositiveInt(draft.durationDays)) error("durationDays", "INVALID_NUMBER", "Duration must be a whole number of days, at least 1.");
  if (!isPositiveInt(draft.contractValueSen)) error("contractValueSen", "INVALID_AMOUNT", "Contract value must be more than zero.");
  if (!isPositiveInt(draft.budgetSen)) error("budgetSen", "INVALID_AMOUNT", "Cost budget must be more than zero.");

  const events = draft.proposal.events;
  if (events.length === 0) error("events", "NO_EVENTS", "Add at least one payment, otherwise the check cannot show the job's effect.");

  events.forEach((e, i) => {
    if (!isPositiveInt(e.amountSen)) error(`events[${i}].amountSen`, "INVALID_AMOUNT", `"${e.label}": amount must be more than zero.`);
    if (!Number.isInteger(e.offsetDays) || e.offsetDays < 0) {
      error(`events[${i}].offsetDays`, "INVALID_DATE", `"${e.label}": the date must be on or after the start date.`);
    }
    if (e.source === "AI_EXTRACTED" && !e.confirmed) {
      error(`events[${i}]`, "UNCONFIRMED_AI_FIELD", `"${e.label}" was suggested by AI and is not confirmed yet.`);
    }
  });

  // Totals are warnings: the owner may know why they differ. Skipped while any amount is invalid (already an ERROR).
  if (events.some((e) => !isPositiveInt(e.amountSen))) return issues;
  const receipts = events.filter((e) => e.direction === "IN").reduce((s, e) => s + e.amountSen, 0);
  const costs = events.filter((e) => e.direction === "OUT").reduce((s, e) => s + e.amountSen, 0);
  if (isPositiveInt(draft.contractValueSen) && receipts !== draft.contractValueSen) {
    warning(
      "events",
      "RECEIPTS_NOT_EQUAL_CONTRACT",
      `Client payments add up to ${formatRM(receipts)}, but the contract value is ${formatRM(draft.contractValueSen)}.`,
    );
  }
  if (isPositiveInt(draft.budgetSen) && costs < draft.budgetSen) {
    warning(
      "events",
      "COSTS_BELOW_BUDGET",
      `Costs entered add up to ${formatRM(costs)}, less than the ${formatRM(draft.budgetSen)} budget. Missing costs make cash look better than it is.`,
    );
  }
  if (isPositiveInt(draft.budgetSen) && costs > draft.budgetSen) {
    warning("events", "COSTS_OVER_BUDGET", `Costs entered add up to ${formatRM(costs)}, more than the ${formatRM(draft.budgetSen)} budget.`);
  }

  // Possible duplicates: same direction and amount within 3 days (proposal events carry no counterparty)
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      if (a.direction === b.direction && a.amountSen === b.amountSen && Math.abs(a.offsetDays - b.offsetDays) <= 3) {
        warning(`events[${j}]`, "POSSIBLE_DUPLICATE", `"${b.label}" looks like a repeat of "${a.label}" (same amount, within 3 days).`);
      }
    }
  }
  return issues;
}
