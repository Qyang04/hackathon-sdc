// GET   /api/requests/:id -> request + events + latest forecast run + decisions + activity
// PATCH /api/requests/:id -> edit draft fields / confirm AI-extracted events (logs EVENT_CONFIRMED)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const request = await prisma.commitmentRequest.findUnique({
    where: { id },
    include: {
      events: true,
      decisions: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Latest forecast run (most recent by createdAt)
  const latestRun = await prisma.forecastRun.findFirst({
    where: { requestId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ request, latestRun });
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const request = await prisma.commitmentRequest.findUnique({ where: { id } });
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Only allow edits while in DRAFT or NEEDS_INFO status
  if (request.status !== "DRAFT" && request.status !== "NEEDS_INFO") {
    return NextResponse.json({ error: "Request cannot be edited in this status" }, { status: 400 });
  }

  const { confirmEventIds, ...fields } = body as {
    confirmEventIds?: string[];
    title?: string;
    client?: string;
    startDate?: string;
    durationDays?: number;
    contractValueSen?: number;
    budgetSen?: number;
    justification?: string;
  };

  // Confirm AI-extracted events
  if (confirmEventIds && Array.isArray(confirmEventIds) && confirmEventIds.length > 0) {
    const { getSession } = await import("@/lib/session");
    const { logActivity } = await import("@/lib/audit");
    const session = await getSession();

    await prisma.cashEvent.updateMany({
      where: { id: { in: confirmEventIds }, requestId: id, confirmed: false },
      data: { confirmed: true },
    });

    for (const eventId of confirmEventIds) {
      await logActivity({
        requestId: id,
        actor: session.name,
        action: "EVENT_CONFIRMED",
        detail: `Confirmed event ${eventId}`,
      });
    }
  }

  // Update draft fields if any provided
  const allowedFields = ["title", "client", "startDate", "durationDays", "contractValueSen", "budgetSen", "justification"];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in fields && fields[key as keyof typeof fields] !== undefined) {
      updates[key] = fields[key as keyof typeof fields];
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.commitmentRequest.update({ where: { id }, data: updates });
  }

  // Return updated request
  const updated = await prisma.commitmentRequest.findUnique({
    where: { id },
    include: { events: true },
  });

  return NextResponse.json({ request: updated });
}
