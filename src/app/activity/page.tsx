// Activity log across all requests (must-have 4). Owner: Workstream C.
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const entries = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { request: { select: { title: true } } },
  });

  return (
    <>
      <h1>Activity</h1>
      <div className="card overflow">
        {entries.length === 0 ? (
          <p className="muted">Nothing has happened yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>When</th><th>Who</th><th>What</th><th>Check</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="small">{e.createdAt.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</td>
                  <td>{e.actor}</td>
                  <td>
                    <span className="small muted">{e.action}</span>
                    <br />
                    {e.detail}
                  </td>
                  <td>{e.request ? <Link href={`/requests/${e.requestId}`}>{e.request.title}</Link> : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
