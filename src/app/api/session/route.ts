// POST /api/session { role: "OWNER" | "STAFF" } -> switches the simulated role.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { role } = (await req.json()) as { role?: string };
  if (role !== "OWNER" && role !== "STAFF") return NextResponse.json({ error: "Unknown role" }, { status: 400 });
  const res = NextResponse.json({ role });
  res.cookies.set("role", role, { path: "/", sameSite: "lax" });
  return res;
}
