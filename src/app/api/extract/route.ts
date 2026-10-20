// POST /api/extract { requestId, sourceText } -> ExtractionResult; saves events as AI_EXTRACTED, confirmed=false.
// If AI is not configured or fails: 200 with { milestones: [], missingInfo: [...], aiAvailable: false } so the UI offers manual entry.
import { notImplemented } from "../notImplemented";

export async function POST() {
  return notImplemented("POST /api/extract");
}
