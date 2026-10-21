// Owner: B. Contract in docs/CONTRACTS.md.
// GET  /api/requests        -> list requests (id, title, client, status, createdAt)
// POST /api/requests        -> create a DRAFT request with proposal events; logs REQUEST_CREATED
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { getSession } from "@/lib/session";
import { IsoDate, ManualEvent, Sen } from "./schemas";

// AI-extracted events are added by /api/extract, never here.
const CreateRequest = z.object({
  title: z.string().trim().min(1),
  client: z.string().trim().min(1),
  startDate: IsoDate,
  durationDays: z.number().int().positive(),
  contractValueSen: Sen,
  budgetSen: Sen,
  justification: z.string().default(""),
  sourceText: z.string().default(""),
  events: z.array(ManualEvent).default([]),
});

export async function GET() {
  const requests = await prisma.commitmentRequest.findMany({
    select: { id: true, title: true, client: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const { events, ...fields } = parsed.data;
  const session = await getSession();

  const created = await prisma.commitmentRequest.create({
    data: {
      ...fields,
      requestedBy: session.name,
      status: "DRAFT",
      events: {
        create: events.map((e) => ({ ...e, status: "PLANNED", source: "MANUAL", confirmed: true })),
      },
    },
    include: { events: true },
  });

  await logActivity({
    requestId: created.id,
    actor: session.name,
    action: "REQUEST_CREATED",
    detail: `${created.title} for ${created.client}, ${events.length} payment(s)`,
  });

  return NextResponse.json({ request: created }, { status: 201 });
}
