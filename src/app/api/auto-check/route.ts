// Owner: Workstream A. Contract in docs/CONTRACTS.md (stretch: "New quotation in Orbyte Sales
// starts a check automatically · simulated", Plan v2).
// POST /api/auto-check -> simulated webhook: a new quotation arrives in Orbyte Sales.
//   - Creates a DRAFT request + payment events from a structured quotation payload (no AI involved;
//     a real Sales integration sends structured data).
//   - Empty or missing body = the demo quotation (DEMO_QUOTATION in src/lib/demo/data.ts).
//   - It does NOT run the check itself: the caller then POSTs /api/requests/:id/forecast, which owns
//     the validate → scenarios → policy → brief → save pipeline and its 409 protection.
//   - Staff may trigger it (same as creating a request); only the owner approves.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { DEMO_QUOTATION } from "@/lib/demo/data";
import { QuotationPayload } from "./schemas";

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const isEmptyBody = raw === null || (typeof raw === "object" && raw !== null && Object.keys(raw).length === 0);
  const payload = isEmptyBody ? DEMO_QUOTATION : raw;

  const parsed = QuotationPayload.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quotation", issues: parsed.error.issues }, { status: 400 });
  }
  const { events, ...fields } = parsed.data;
  const session = await getSession();

  const created = await prisma.commitmentRequest.create({
    data: {
      ...fields,
      // The person who receives the quotation; the Sales source is in the activity log. Keeps selfApproved honest.
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
    actor: "Orbyte Sales (simulated)",
    action: "REQUEST_CREATED",
    detail: `${created.title} for ${created.client}, ${events.length} payment(s), triggered from Orbyte Sales`,
  });

  return NextResponse.json({
    request: { id: created.id, title: created.title, client: created.client, status: created.status },
    check: { method: "POST", path: `/api/requests/${created.id}/forecast` },
  }, { status: 201 });
}
