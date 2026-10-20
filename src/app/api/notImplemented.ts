import { NextResponse } from "next/server";

export function notImplemented(what: string) {
  return NextResponse.json({ error: `${what} not implemented yet` }, { status: 501 });
}
