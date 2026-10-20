export type IssueSeverity = "ERROR" | "WARNING";

export interface ValidationIssue {
  field: string; // e.g. "startDate", "events[2].amountSen"
  severity: IssueSeverity;
  code: string; // e.g. "REQUIRED", "RECEIPTS_NOT_EQUAL_CONTRACT", "POSSIBLE_DUPLICATE", "UNCONFIRMED_AI_FIELD"
  message: string; // plain language
}
