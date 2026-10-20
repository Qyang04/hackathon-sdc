// POST /api/requests/:id/decision { outcome: "APPROVED"|"REJECTED"|"NEEDS_INFO", reason, forecastRunId }
// Server checks: canDecide(session); request status is CHECKED; forecastRunId is the latest run.
// On APPROVED: simulatedESign.sendForSignature -> status COMPLETED -> log DECISION + OUTCOME_SENT.
// selfApproved = true when the owner also created the request.
import { notImplemented } from "../../../notImplemented";

export async function POST() {
  return notImplemented("POST /api/requests/:id/decision");
}
