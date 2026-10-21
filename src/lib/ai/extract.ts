// AI extraction of payment milestones. Owner: Workstream B.
import { completeJson } from "./client";
import { ExtractionResult } from "./schemas";

const SYSTEM_PROMPT = `You extract payment milestones from Malaysian quotations, purchase orders and contracts.

For each payment milestone found, return:
- direction: "IN" for money the company will receive, "OUT" for money it must pay
- amountRM: the amount exactly as written (e.g. "12,000.00", "RM 5,000")
- timing: the timing exactly as written (e.g. "30% upon signing", "upon handover", "30 days after invoice")
- offsetDays: your best guess of days after project start (0 for "upon signing", null if unclear)
- label: a short description (e.g. "Deposit", "Progress claim 1", "Final payment")
- sourceSnippet: the exact text you extracted this from (must appear verbatim in the input)
- confidence: HIGH if amount and timing are clear, MEDIUM if one is ambiguous, LOW if guessing

Also return missingInfo: things a person must supply (e.g. "No due date for final 10%").

Return valid JSON matching this schema:
{
  "milestones": [...],
  "missingInfo": [...]
}`;

export async function extractMilestones(sourceText: string): Promise<ExtractionResult> {
  const result = await completeJson(ExtractionResult, SYSTEM_PROMPT, sourceText);

  // Verify each sourceSnippet actually appears in the source text
  const validMilestones = result.milestones.filter((m) =>
    sourceText.includes(m.sourceSnippet)
  );

  return {
    milestones: validMilestones,
    missingInfo: result.missingInfo,
  };
}
