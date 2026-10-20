// AI output contracts. Owner: Workstream B. The UI (C) renders these; the engine never reads them directly.
import { z } from "zod";

/** One payment milestone the AI found in a quotation / PO / contract text. Always needs human confirmation. */
export const ExtractedMilestone = z.object({
  direction: z.enum(["IN", "OUT"]),
  amountRM: z.string().describe("Amount as written, e.g. '12,000.00'; converted to sen in code, not by the AI"),
  timing: z.string().describe("Timing as written, e.g. '30% upon signing', '14 days after handover'"),
  offsetDays: z.number().int().nullable().describe("Best guess of days after project start; null if unclear"),
  label: z.string(),
  sourceSnippet: z.string().describe("Exact text the milestone was read from"),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
});
export const ExtractionResult = z.object({
  milestones: z.array(ExtractedMilestone),
  missingInfo: z.array(z.string()).describe("Things a person must supply, e.g. 'No due date for final 10%'"),
});
export type ExtractionResult = z.infer<typeof ExtractionResult>;

/** Decision-support brief. Explains computed results; never a verdict, never new numbers. */
export const DecisionBrief = z.object({
  summary: z.string().describe("2-3 plain sentences using only figures supplied in the input"),
  risks: z.array(z.string()),
  missingInfo: z.array(z.string()),
  possibleConditions: z.array(z.string()).describe("Options the owner may attach, e.g. 'ask for 30% deposit'"),
});
export type DecisionBrief = z.infer<typeof DecisionBrief>;
