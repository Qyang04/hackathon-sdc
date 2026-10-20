// GET /api/portfolio -> settings, projects with events, recurring costs. Owner: B.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [settings, projects, recurring] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: 1 } }),
    prisma.project.findMany({ include: { events: true }, orderBy: { startDate: "asc" } }),
    prisma.recurringCost.findMany(),
  ]);
  return NextResponse.json({ settings, projects, recurring, source: "SIMULATED" });
}
