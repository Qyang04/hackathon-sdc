import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canDecide } from "@/lib/session";
import { UpdateSettings } from "./schemas";
import { lockCompanySettings } from "@/lib/settings-lock";

export async function PATCH(req: Request) {
  // Check permission before processing an update.
  const session = await getSession();

  if (!canDecide(session)) {
    return NextResponse.json(
      { error: "Only the owner can update settings." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateSettings.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid settings.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  // Save the update and its activity record together.
  const settings = await prisma.$transaction(async (tx) => {
    await lockCompanySettings(tx); 
    // ensure two settings updates cannot both read the same old values before writing their audit records

    const previous = await tx.companySettings.findUnique({
      where: { id: 1 },
    });

    if (!previous) {
      return null;
    }

    const updated = await tx.companySettings.update({
      where: { id: 1 },
      data: parsed.data,
    });

    await tx.activityLog.create({
      data: {
        requestId: null,
        actor: session.name,
        action: "SETTINGS_UPDATED",
        detail: JSON.stringify({
          before: {
            reserveSen: previous.reserveSen,
            approvalThresholdSen: previous.approvalThresholdSen,
            customerDelayDays: previous.customerDelayDays,
          },
          after: {
            reserveSen: updated.reserveSen,
            approvalThresholdSen: updated.approvalThresholdSen,
            customerDelayDays: updated.customerDelayDays,
          },
        }),
      },
    });

    return {
      reserveSen: updated.reserveSen,
      approvalThresholdSen: updated.approvalThresholdSen,
      customerDelayDays: updated.customerDelayDays,
    };
  });

  if (!settings) {
    return NextResponse.json(
      { error: "Company settings have not been initialised." },
      { status: 404 },
    );
  }

  return NextResponse.json({ settings });
}