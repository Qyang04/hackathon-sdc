// AI extraction of payment milestones. Owner: Workstream B.
import { completeJson } from "./client";
import { ExtractionResult } from "./schemas";

export async function extractMilestones(_sourceText: string): Promise<ExtractionResult> {
  // TODO(B): write the system prompt (Malaysian quotations/POs, RM amounts, "upon signing", "upon handover",
  // "30 days after invoice"), call completeJson(ExtractionResult, system, sourceText),
  // then check every sourceSnippet really appears in sourceText (drop any that do not).
  void completeJson;
  throw new Error("extractMilestones is not implemented yet");
}
