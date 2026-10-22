// POST /api/reset -> re-seed the demo data (owner only). Lets the judges' demo be replayed cleanly.
// Deletes every request, check and log entry, then loads src/lib/demo/data.ts again.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canDecide, getSession } from "@/lib/session";
import { seedDemo } from "@/lib/demo/seed";

export async function POST() {
  const session = await getSession();
  if (!canDecide(session)) return NextResponse.json({ error: "Only the owner can reset the demo data" }, { status: 403 });
  // The reset itself is the first entry in the new activity log
  await seedDemo(prisma, session.name);
  return NextResponse.json({ ok: true });
}
