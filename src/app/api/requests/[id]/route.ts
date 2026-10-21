// GET   /api/requests/:id -> request + events + latest forecast run + decisions + activity
// PATCH /api/requests/:id -> edit draft fields / confirm AI-extracted events (logs EVENT_CONFIRMED)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notImplemented } from "../../notImplemented";

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
export async function PATCH() {
  return notImplemented("PATCH /api/requests/:id");
}
