// POST /api/requests/:id/decision { outcome: "APPROVED"|"REJECTED"|"NEEDS_INFO", reason, forecastRunId }
// Server checks: canDecide(session); request status is CHECKED; forecastRunId is the latest run.
// On APPROVED: simulatedESign.sendForSignature -> status COMPLETED -> log DECISION + OUTCOME_SENT.
// selfApproved = true when the owner also created the request.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canDecide, getSession } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { simulatedESign } from "@/lib/adapters/orbyte";

const DecisionBody = z.object({
  outcome: z.enum(["APPROVED", "REJECTED", "NEEDS_INFO"]),
  reason: z.string().trim().min(1, "Give a short reason"),
  forecastRunId: z.string().min(1),
});

const OUTCOME_TEXT = { APPROVED: "Approved", REJECTED: "Declined", NEEDS_INFO: "Asked for more information" } as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  // Enforced here, not only by hiding buttons
  if (!canDecide(session)) return NextResponse.json({ error: "Only the owner can decide" }, { status: 403 });

  const parsed = DecisionBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision", issues: parsed.error.issues }, { status: 400 });
  const { outcome, reason, forecastRunId } = parsed.data;

  const request = await prisma.commitmentRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "CHECKED") {
    return NextResponse.json({ error: `Only a checked request can be decided (status ${request.status})` }, { status: 409 });
  }
  // The decision must refer to the figures the owner saw: the latest check
  const latest = await prisma.forecastRun.findFirst({ where: { requestId: id, scenario: "BASE" }, orderBy: { createdAt: "desc" } });
  if (!latest || latest.id !== forecastRunId) {
    return NextResponse.json({ error: "The figures have changed since this page was loaded. Reload and decide again." }, { status: 409 });
  }

  const selfApproved = request.requestedBy === session.name;
  await prisma.$transaction([
    prisma.decision.create({
      data: { requestId: id, forecastRunId, actorRole: session.role, actorName: session.name, outcome, reason, selfApproved },
    }),
    prisma.commitmentRequest.update({ where: { id }, data: { status: outcome } }),
  ]);
  await logActivity({
    requestId: id,
    actor: session.name,
    action: "DECISION",
    detail: `${OUTCOME_TEXT[outcome]}: ${reason}${selfApproved ? " (decided by the person who created the request)" : ""}`,
  });

  // Outcome action: send the acceptance for e-signature (simulated Orbyte eSign)
  let envelopeId: string | null = null;
  if (outcome === "APPROVED") {
    try {
      ({ envelopeId } = await simulatedESign.sendForSignature({ requestId: id, title: request.title, client: request.client }));
      await prisma.commitmentRequest.update({ where: { id }, data: { status: "COMPLETED" } });
      await logActivity({ requestId: id, actor: "system", action: "OUTCOME_SENT", detail: `Acceptance sent for e-signature (simulated), envelope ${envelopeId}` });
    } catch {
      // Status stays APPROVED so the owner can see the action did not go out
      await logActivity({ requestId: id, actor: "system", action: "OUTCOME_FAILED", detail: "Could not send the acceptance for e-signature" });
    }
  }

  const updated = await prisma.commitmentRequest.findUnique({ where: { id }, select: { status: true } });
  return NextResponse.json({ status: updated?.status, selfApproved, envelopeId });
}
