// Activity log across all requests (must-have 4). Owner: Workstream C.
// Shown as a timeline grouped by day (Malaysia time), newest first.
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ACTION_TEXT: Record<string, string> = {
  REQUEST_CREATED: "Created",
  AI_EXTRACTED: "AI read quotation",
  EVENT_CONFIRMED: "Payment confirmed",
  EVENT_ADDED: "Payment added",
  EVENT_REMOVED: "Payment removed",
  FORECAST_RUN: "Check run",
  STATUS_CHANGED: "Status changed",
  DECISION: "Owner decision",
  OUTCOME_SENT: "E-signature sent",
  OUTCOME_FAILED: "E-signature failed",
  SETTINGS_UPDATED: "Settings changed",
};

const tz = { timeZone: "Asia/Kuala_Lumpur" } as const;

export default async function ActivityPage() {
  const entries = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { request: { select: { title: true } } },
  });

  const days: { day: string; items: typeof entries }[] = [];
  for (const e of entries) {
    const day = e.createdAt.toLocaleDateString("en-MY", { ...tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (days.at(-1)?.day !== day) days.push({ day, items: [] });
    days.at(-1)!.items.push(e);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Audit trail</div>
          <h1>Activity</h1>
          <div className="meta">Every change to a check, who made it and when. Entries cannot be edited.</div>
        </div>
      </div>
      <div className="card">
        {entries.length === 0 ? (
          <p className="muted">Nothing has happened yet.</p>
        ) : (
          days.map((d) => (
            <div key={d.day}>
              <div className="day-head">{d.day}</div>
              <ul className="timeline">
                {d.items.map((e) => (
                  <li key={e.id} className={e.action === "DECISION" ? "decision" : undefined}>
                    <div>
                      <div className="tag">{ACTION_TEXT[e.action] ?? e.action}</div>
                      <div className="what">{e.detail}</div>
                      <div className="when">
                        {e.actor} · {e.createdAt.toLocaleTimeString("en-MY", { ...tz, hour: "2-digit", minute: "2-digit" })}
                        {e.request && <> · <Link href={`/requests/${e.requestId}`}>{e.request.title}</Link></>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </>
  );
}
