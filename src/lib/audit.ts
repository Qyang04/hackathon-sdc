import { prisma } from "./db";

/** Append-only activity record (must-have 4). Call it for every state change. */
export async function logActivity(entry: { requestId?: string | null; actor: string; action: string; detail: string }) {
  return prisma.activityLog.create({
    data: { requestId: entry.requestId ?? null, actor: entry.actor, action: entry.action, detail: entry.detail },
  });
}
