// Result + decision page. Owner: Workstream C.
// Shows: plain-language result ("Lowest cash: RM 12,400 in week of 18 Nov, below your RM 20,000 buffer"),
// base / downside / deferred-start comparison, main contributing payments, unconfirmed inputs,
// AI brief labelled "Decision support, not financial advice", owner actions, activity for this request.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, canDecide } from "@/lib/session";
import { formatRM } from "@/lib/engine/money";
import { addDays } from "@/lib/engine/dates";
import { loadLatestCheck } from "@/lib/runs";
import { StatusPill } from "../../StatusPill";
import { ResultView } from "./ResultView";
import { RunCheckButton } from "./RunCheckButton";

export const dynamic = "force-dynamic";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [request, check, company, session] = await Promise.all([
    prisma.commitmentRequest.findUnique({
      where: { id },
      include: {
        events: { orderBy: { offsetDays: "asc" } },
        activities: { orderBy: { createdAt: "desc" } },
      },
    }),
    loadLatestCheck(id),
    prisma.companySettings.findUnique({ where: { id: 1 } }),
    getSession(),
  ]);
  if (!request) notFound();

  const unconfirmed = request.events.filter((e) => !e.confirmed);
  const receiptsSen = request.events.filter((e) => e.direction === "IN").reduce((s, e) => s + e.amountSen, 0);

  return (
    <>
      <h1>{request.title}</h1>
      <p>
        <StatusPill status={request.status} />{" "}
        <span className="muted small">
          for {request.client} · requested by {request.requestedBy} · starts {request.startDate}, runs {request.durationDays} days
        </span>
      </p>

      <div className="card stats">
        <div className="stat">
          <div className="label">Contract value</div>
          <div className="value">{formatRM(request.contractValueSen)}</div>
        </div>
        <div className="stat">
          <div className="label">Cost budget</div>
          <div className="value">{formatRM(request.budgetSen)}</div>
        </div>
        <div className="stat">
          <div className="label">Client payments entered</div>
          <div className="value">{formatRM(receiptsSen)}</div>
        </div>
      </div>

      <div className="card">
        <h2>Result</h2>
        {check ? (
          <p className="muted small">Checked {check.createdAt.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}.</p>
        ) : (
          <p className="muted">The check has not been run yet.</p>
        )}
        {check && check.validation.length > 0 && (
          <ul className="small">
            {check.validation.map((v, i) => (
              <li key={i} style={{ color: v.severity === "ERROR" ? "var(--danger)" : "var(--warn)" }}>
                {v.severity === "ERROR" ? "Must fix: " : "Note: "}
                {v.message}
              </li>
            ))}
          </ul>
        )}
        {(request.status === "DRAFT" || request.status === "NEEDS_INFO") && (
          <RunCheckButton requestId={request.id} label={check ? "Run the check again" : "Run the check"} />
        )}
      </div>

      {check && check.comparisons.length > 0 && company && (
        <ResultView comparisons={check.comparisons} policy={check.policy} brief={check.brief} reserveSen={company.reserveSen} />
      )}

      <div className="card overflow">
        <h2>Payments for this job</h2>
        {unconfirmed.length > 0 && (
          <p className="error">{unconfirmed.length} suggested payment(s) are not confirmed and will not be used in the check.</p>
        )}
        {request.events.length === 0 ? (
          <p className="muted">No payments entered.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Expected date</th><th>What</th><th className="num">In</th><th className="num">Out</th><th></th></tr>
            </thead>
            <tbody>
              {request.events.map((e) => (
                <tr key={e.id}>
                  <td className="small">{e.offsetDays === null ? "Unknown" : addDays(request.startDate, e.offsetDays)}</td>
                  <td>
                    {e.label} <span className="muted small">· {e.counterparty}</span>
                    {e.confidence === "ESTIMATED" && <> <span className="pill warn">estimated</span></>}
                  </td>
                  <td className="num">{e.direction === "IN" ? formatRM(e.amountSen) : ""}</td>
                  <td className="num">{e.direction === "OUT" ? formatRM(e.amountSen) : ""}</td>
                  <td>
                    {e.confirmed ? (
                      <span className="pill ok">{e.source === "AI_EXTRACTED" ? "AI, confirmed" : "entered"}</span>
                    ) : (
                      <span className="pill warn">not confirmed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Owner decision</h2>
        {/* TODO(C): decision buttons + reason once POST /decision exists; the server enforces canDecide */}
        {canDecide(session) ? (
          <p className="muted">Approve, decline or ask for more information here after the check has run.</p>
        ) : (
          <p className="muted">Only the owner can decide on this commitment. You are viewing as {session.name}.</p>
        )}
      </div>

      <div className="card overflow">
        <h2>Activity for this check</h2>
        <table>
          <tbody>
            {request.activities.map((a) => (
              <tr key={a.id}>
                <td className="small">{a.createdAt.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</td>
                <td>{a.actor}</td>
                <td>{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small"><Link href="/activity">All activity</Link></p>
      </div>
    </>
  );
}
