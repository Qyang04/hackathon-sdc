// Simulated Orbyte Connect email. Owner: Workstream B.
// Nothing leaves the app: each message is saved as a NOTIFICATION_SENT activity row, listed in the Outbox and
// linked to the printable report. A failed notification never blocks a check or a decision.
import { logActivity } from "./audit";
import { NAMES } from "./session";
import { formatRM } from "./engine/money";
import type { ComparisonResult } from "./engine/types";
import type { PolicyResult } from "./policy/types";

export interface Notification {
  to: string;
  subject: string;
  summary: string;
}

const OUTCOME_TEXT: Record<PolicyResult["outcome"], string> = {
  PASS: "no rule triggered",
  NEEDS_REVIEW: "needs your review",
  BLOCKED: "missing information",
};

const DECISION_TEXT: Record<string, string> = { APPROVED: "Approved", REJECTED: "Declined", NEEDS_INFO: "More information requested" };

/** Message after a check. A complete check goes to the owner; a blocked one goes back to the person who asked. */
export function checkNotification(request: { title: string; requestedBy: string }, policy: PolicyResult, base: ComparisonResult | null): Notification {
  if (policy.outcome === "BLOCKED" || !base) {
    return {
      to: request.requestedBy,
      subject: `Missing information: ${request.title}`,
      summary: "Some details need fixing before the cash check can run.",
    };
  }
  const m = base.withProposal.metrics;
  return {
    to: NAMES.OWNER,
    subject: `Check ready for your decision: ${request.title}`,
    summary:
      `Rules: ${OUTCOME_TEXT[policy.outcome]}. Lowest cash with the job ${formatRM(m.minBalanceSen)} on ${m.minBalanceDate}` +
      (m.firstBreachDate ? `; below the safety buffer from ${m.firstBreachDate}.` : "; stays above the safety buffer as planned."),
  };
}

/** Message after the owner decides, to the person who asked for the check. */
export function decisionNotification(request: { title: string; requestedBy: string }, outcome: string, reason: string, envelopeId: string | null): Notification {
  return {
    to: request.requestedBy,
    subject: `${DECISION_TEXT[outcome] ?? outcome}: ${request.title}`,
    summary: `Owner's reason: ${reason}` + (envelopeId ? ` Acceptance sent for e-signature (simulated), envelope ${envelopeId}.` : ""),
  };
}

export async function sendNotification(requestId: string, n: Notification): Promise<void> {
  try {
    await logActivity({
      requestId,
      actor: "system",
      action: "NOTIFICATION_SENT",
      detail: `Email to ${n.to} (simulated): ${n.subject}. ${n.summary} Report: /requests/${requestId}/report`,
    });
  } catch {
    // The check or decision is already saved; a missing email must not undo it
  }
}
