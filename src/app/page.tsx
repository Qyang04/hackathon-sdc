// Overview: cash position, active projects, open requests. Owner: Workstream C.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatRM } from "@/lib/engine/money";
import { StatusPill } from "./StatusPill";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [settings, projects, recurring, requests, upcoming] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: 1 } }),
    prisma.project.findMany({ where: { status: "ACTIVE" }, orderBy: { startDate: "asc" } }),
    prisma.recurringCost.findMany({ orderBy: { nextDate: "asc" } }),
    prisma.commitmentRequest.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.cashEvent.findMany({
      where: { requestId: null, status: { notIn: ["PAID", "CANCELLED"] } },
      orderBy: { date: "asc" },
      include: { project: { select: { name: true } } },
    }),
  ]);

  if (!settings) {
    return (
      <>
        <h1>Overview</h1>
        <div className="card error">No company settings found. Run <code>npm run db:reset</code> to load the demo data.</div>
      </>
    );
  }

  return (
    <>
      <h1>{settings.companyName}</h1>
      <p className="muted small">Cash position as at the start of {settings.openingDate}. All figures are simulated demo data.</p>

      <div className="card stats">
        <div className="stat">
          <div className="label">Cash in the bank</div>
          <div className="value">{formatRM(settings.openingCashSen)}</div>
        </div>
        <div className="stat">
          <div className="label">Safety buffer you want to keep</div>
          <div className="value">{formatRM(settings.reserveSen)}</div>
        </div>
        <div className="stat">
          <div className="label">Lowest point, next 13 weeks</div>
          {/* TODO(C): fill from runForecast once the engine (A) is implemented */}
          <div className="value muted">Not yet available</div>
        </div>
        <div className="stat">
          <div className="label">Jobs above this always go to you</div>
          <div className="value">{formatRM(settings.approvalThresholdSen)}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Commitment checks</h2>
          <Link href="/requests/new">Start a new check</Link>
        </div>
        {requests.length === 0 ? (
          <p className="muted">No checks yet. Start one before you accept a new job or large order.</p>
        ) : (
          <table>
            <thead><tr><th>Job</th><th>Client</th><th className="num">Contract value</th><th>Status</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/requests/${r.id}`}>{r.title}</Link></td>
                  <td>{r.client}</td>
                  <td className="num">{formatRM(r.contractValueSen)}</td>
                  <td><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow">
        <h2>Active projects <span className="badge">from Orbyte Projects (simulated)</span></h2>
        <table>
          <thead><tr><th>Project</th><th>Client</th><th>Runs</th><th className="num">Contract value</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.client}</td>
                <td className="small">{p.startDate} to {p.endDate}</td>
                <td className="num">{formatRM(p.contractValueSen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow">
        <h2>Money already promised <span className="badge">from Orbyte accounting (simulated)</span></h2>
        <table>
          <thead><tr><th>Date</th><th>What</th><th>Project</th><th className="num">In</th><th className="num">Out</th></tr></thead>
          <tbody>
            {upcoming.map((e) => {
              const remaining = e.amountSen - e.paidSen;
              return (
                <tr key={e.id}>
                  <td className="small">{e.date}</td>
                  <td>
                    {e.label} <span className="muted small">· {e.counterparty}</span>
                    {e.confidence === "ESTIMATED" && <> <span className="pill warn">estimated</span></>}
                  </td>
                  <td className="small">{e.project?.name ?? "Company"}</td>
                  <td className="num">{e.direction === "IN" ? formatRM(remaining) : ""}</td>
                  <td className="num">{e.direction === "OUT" ? formatRM(remaining) : ""}</td>
                </tr>
              );
            })}
            {recurring.map((c) => (
              <tr key={c.id}>
                <td className="small">from {c.nextDate}</td>
                <td>{c.label} <span className="muted small">· every {c.frequency === "WEEKLY" ? "week" : "month"}</span></td>
                <td className="small">Company</td>
                <td className="num"></td>
                <td className="num">{formatRM(c.amountSen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
