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
import { lockCompanySettings } from "@/lib/settings-lock";

const DecisionBody = z.object({
  outcome: z.enum(["APPROVED", "REJECTED", "NEEDS_INFO"]),
  reason: z.string().trim().min(1, "Give a short reason"),
  forecastRunId: z.string().min(1),
});

const SavedForecastInput = z.object({
  settings: z.object({
    openingCashSen: z.number().int(),
    openingDate: z.string(),
    reserveSen: z.number().int(),
    approvalThresholdSen: z.number().int(),
    customerDelayDays: z.number().int(),
  }),
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
  const result = await prisma.$transaction(async (tx) => {
    await lockCompanySettings(tx);

    const request = await tx.commitmentRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.status !== "CHECKED") {
      return NextResponse.json({ error: `Only a checked request can be decided (status ${request.status})` }, { status: 409 });
    }
    // The decision must refer to the figures the owner saw: the latest check
    const latest = await tx.forecastRun.findFirst({ where: { requestId: id, scenario: "BASE" }, orderBy: { createdAt: "desc" } });
    if (!latest || latest.id !== forecastRunId) {
      return NextResponse.json({ error: "The figures have changed since this page was loaded. Reload and decide again." }, { status: 409 });
    }

    
    // Approval requires a check calculated with current settings.
    if (outcome === "APPROVED") {
      const company = await tx.companySettings.findUnique({
        where: { id: 1 },
      });

      if (!company) {
        return NextResponse.json(
          { error: "Company settings are unavailable. Approval cannot proceed." },
          { status: 503 },
        );
      }

      let savedInput: unknown;

      try {
        savedInput = JSON.parse(latest.inputJson);
      } catch {
        return NextResponse.json(
          { error: "The saved check cannot be verified. Run the check again." },
          { status: 409 },
        );
      }

      const saved = SavedForecastInput.safeParse(savedInput);

      if (!saved.success) {
        return NextResponse.json(
          { error: "The saved settings cannot be verified. Run the check again." },
          { status: 409 },
        );
      }

      const fields = [
        "openingCashSen",
        "openingDate",
        "reserveSen",
        "approvalThresholdSen",
        "customerDelayDays",
      ] as const;

      const settingsChanged = fields.some(
        (field) => saved.data.settings[field] !== company[field],
      );

      if (settingsChanged) {
        return NextResponse.json(
          {
            error:
              "Company settings have changed since this check. Run the check again before approving.",
          },
          { status: 409 },
        );
      }
    }


    const selfApproved = request.requestedBy === session.name;

    // Claim the checked request before recording the decision.
    const claimed = await tx.commitmentRequest.updateMany({
      where: { id, status: "CHECKED" },
      data: { status: outcome },
    });

    if (claimed.count !== 1) {
      return NextResponse.json(
        { error: "The request has changed. Reload before deciding." },
        { status: 409 },
      );
    }

    await tx.decision.create({
      data: {
        requestId: id,
        forecastRunId,
        actorRole: session.role,
        actorName: session.name,
        outcome,
        reason,
        selfApproved,
      },
    });

    await tx.activityLog.create({
      data: {
        requestId: id,
        actor: session.name,
        action: "DECISION",
        detail:
          `${OUTCOME_TEXT[outcome]}: ${reason}` +
          (selfApproved
            ? " (decided by the person who created the request)"
            : ""),
      },
    });

    return { request, selfApproved };
  }, {
    maxWait: 10_000,
    timeout: 20_000,
  });

  if (result instanceof NextResponse) {
    return result;
  }

  const { request, selfApproved } = result;

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
