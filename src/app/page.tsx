// Overview: cash position, active projects, open requests. Owner: Workstream C.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { simulatedAccounting } from "@/lib/adapters/orbyte";
import { addDays, expandRecurring, formatRM, normaliseExisting, runForecast, scenarioPresets } from "@/lib/engine";
import { StatusPill } from "./StatusPill";
import { prettyDate, shortRM } from "./format";

export const dynamic = "force-dynamic";

const HORIZON_DAYS = 91; // 13 weeks, same as the check

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

  // Lowest point over the next 13 weeks with existing commitments only (as planned, no new job)
  const forecastSettings = { openingCashSen: settings.openingCashSen, openingDate: settings.openingDate, reserveSen: settings.reserveSen, minHorizonDays: HORIZON_DAYS };
  const horizonEnd = addDays(settings.openingDate, HORIZON_DAYS - 1);
  const [existing, recurringInputs] = await Promise.all([simulatedAccounting.listCashEvents(), simulatedAccounting.listRecurringCosts()]);
  const base = scenarioPresets(settings.customerDelayDays)[0];
  const outlook = runForecast(
    [...normaliseExisting(existing, forecastSettings, base).events, ...expandRecurring(recurringInputs, settings.openingDate, horizonEnd)],
    forecastSettings,
    horizonEnd,
  ).metrics;
  const outlookBelow = outlook.minBalanceSen < settings.reserveSen;
  const awaiting = requests.filter((r) => r.status === "CHECKED").length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Overview · simulated demo data</div>
          <h1>{settings.companyName}</h1>
        </div>
        <Link href="/requests/new" className="button">Start a new check</Link>
      </div>

      <section className="hero">
        <div className="eyebrow"><span>Cash position as at the start of {prettyDate(settings.openingDate)}</span></div>
        <div className="hero-stats">
          <div>
            <div className="label">Cash in the bank</div>
            <div className="value big">{shortRM(settings.openingCashSen)}</div>
          </div>
          <div>
            <div className="label">Lowest point, next 13 weeks</div>
            <div className={`value big${outlookBelow ? " bad" : ""}`}>{shortRM(outlook.minBalanceSen)}</div>
            <div className="note">{prettyDate(outlook.minBalanceDate)} · {outlookBelow ? "below" : "above"} your buffer, before any new job</div>
          </div>
          <div>
            <div className="label">Safety buffer you want to keep</div>
            <div className="value">{shortRM(settings.reserveSen)}</div>
          </div>
          <div>
            <div className="label">Jobs above this always go to you</div>
            <div className="value">{shortRM(settings.approvalThresholdSen)}</div>
          </div>
        </div>
      </section>

      <div className="card overflow">
        <div className="card-head">
          <h2>Commitment checks</h2>
          {awaiting > 0 && <span className="pill info">{awaiting} awaiting the owner</span>}
        </div>
        {requests.length === 0 ? (
          <p className="muted">No checks yet. Start one before you accept a new job or large order.</p>
        ) : (
          <table>
            <thead><tr><th>Job</th><th>Client</th><th>Starts</th><th className="num">Contract value</th><th>Status</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/requests/${r.id}`}>{r.title}</Link></td>
                  <td>{r.client}</td>
                  <td className="date">{r.startDate}</td>
                  <td className="num">{formatRM(r.contractValueSen)}</td>
                  <td><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow">
        <div className="card-head">
          <h2>Active projects</h2>
          <span className="source">from Orbyte Projects (simulated)</span>
        </div>
        <table>
          <thead><tr><th>Project</th><th>Client</th><th>Runs</th><th className="num">Contract value</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td><b>{p.name}</b></td>
                <td>{p.client}</td>
                <td className="date">{p.startDate} → {p.endDate}</td>
                <td className="num">{formatRM(p.contractValueSen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow">
        <div className="card-head">
          <h2>Money already promised</h2>
          <span className="source">from Orbyte accounting (simulated)</span>
        </div>
        <table>
          <thead><tr><th>Date</th><th>What</th><th>Project</th><th className="num">In</th><th className="num">Out</th></tr></thead>
          <tbody>
            {upcoming.map((e) => {
              const remaining = e.amountSen - e.paidSen;
              return (
                <tr key={e.id}>
                  <td className="date">{e.date}</td>
                  <td>
                    {e.label} <span className="muted small">· {e.counterparty}</span>
                    {e.confidence === "ESTIMATED" && <> <span className="pill warn">estimated</span></>}
                  </td>
                  <td className="small">{e.project?.name ?? "Company"}</td>
                  <td className="num" style={{ color: "var(--ok)" }}>{e.direction === "IN" ? formatRM(remaining) : ""}</td>
                  <td className="num">{e.direction === "OUT" ? formatRM(remaining) : ""}</td>
                </tr>
              );
            })}
            {recurring.map((c) => (
              <tr key={c.id}>
                <td className="date">from {c.nextDate}</td>
                <td>{c.label} <span className="pill plain">every {c.frequency === "WEEKLY" ? "week" : "month"}</span></td>
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
