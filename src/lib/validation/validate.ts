// Request validation. Owner: Workstream A (rules) with B (wiring).
import type { ProposalInput } from "../engine/types";
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

export function validateRequest(_draft: RequestDraft): ValidationIssue[] {
  // TODO(A): required fields; valid dates; amounts > 0 and integer sen;
  // receipts total vs contract value (WARNING); costs total vs budget (WARNING);
  // possible duplicates (same counterparty, amount, date within 3 days) (WARNING);
  // any unconfirmed AI_EXTRACTED event (ERROR until confirmed).
  throw new Error("validateRequest is not implemented yet");
}
