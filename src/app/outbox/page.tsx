// Outbox: the simulated Orbyte Connect emails the app has sent, newest first. Owner: Workstream C.
// Read from the activity log (NOTIFICATION_SENT); nothing is actually emailed.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { prettyTime } from "../format";

export const dynamic = "force-dynamic";

export default async function OutboxPage() {
  const emails = await prisma.activityLog.findMany({
    where: { action: "NOTIFICATION_SENT" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { request: { select: { title: true } } },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Orbyte Connect · simulated email</div>
          <h1>Outbox</h1>
          <div className="meta">Who was told what, and when. Each email links to the report for that job, which can be saved as a PDF.</div>
        </div>
      </div>
      <div className="card">
        {emails.length === 0 ? (
          <p className="muted">No emails yet. One is sent when a check finishes and when the owner decides.</p>
        ) : (
          <ul className="timeline">
            {emails.map((e) => (
              <li key={e.id}>
                <div>
                  <div className="what">{e.detail.replace(/ Report: \S+$/, "")}</div>
                  <div className="when">
                    {prettyTime(e.createdAt)}
                    {e.requestId && <> · <Link href={`/requests/${e.requestId}/report`}>Report: {e.request?.title}</Link></>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
