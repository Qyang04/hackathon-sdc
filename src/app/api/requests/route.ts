// Owner: B. Contract in docs/CONTRACTS.md.
// GET  /api/requests        -> list requests (id, title, client, status, createdAt)
// POST /api/requests        -> create a DRAFT request with proposal events; logs REQUEST_CREATED
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notImplemented } from "../notImplemented";

export async function GET() {
  const requests = await prisma.commitmentRequest.findMany({
    select: { id: true, title: true, client: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}
export async function POST() {
  return notImplemented("POST /api/requests");
}
