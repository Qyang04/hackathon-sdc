// Result + decision page. Owner: Workstream C.
// Layout: navy banner with the answer and chart; below, the details on the left and the owner's decision
// with the activity timeline pinned on the right.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, canDecide } from "@/lib/session";
import { formatRM } from "@/lib/engine/money";
import { addDays } from "@/lib/engine/dates";
import { loadLatestCheck } from "@/lib/runs";
import { StatusPill } from "../../StatusPill";
import { prettyDate, prettyTime } from "../../format";
import { ResultDetails, ResultHero } from "./ResultView";
import { RunCheckButton } from "./RunCheckButton";
import { DecisionPanel } from "./DecisionPanel";
import { EditPayments } from "./EditPayments";

export const dynamic = "force-dynamic";

const DECISION_TEXT: Record<string, string> = { APPROVED: "Approved", REJECTED: "Declined", NEEDS_INFO: "Asked for more information" };

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [request, check, company, session] = await Promise.all([
    prisma.commitmentRequest.findUnique({
      where: { id },
      include: {
        events: { orderBy: { offsetDays: "asc" } },
        activities: { orderBy: { createdAt: "desc" } },
        decisions: { orderBy: { createdAt: "desc" } },
      },
    }),
    loadLatestCheck(id),
    prisma.companySettings.findUnique({ where: { id: 1 } }),
    getSession(),
  ]);
  if (!request) notFound();

  const unconfirmed = request.events.filter((e) => !e.confirmed);
  const receiptsSen = request.events.filter((e) => e.direction === "IN").reduce((s, e) => s + e.amountSen, 0);
  const costsSen = request.events.filter((e) => e.direction === "OUT").reduce((s, e) => s + e.amountSen, 0);
  const canRun = request.status === "DRAFT" || request.status === "NEEDS_INFO";
  const hasResult = check && check.comparisons.length > 0 && company;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs"><Link href="/">Overview</Link> / Check</div>
          <h1>{request.title}</h1>
          <div className="meta">
            <StatusPill status={request.status} />
            <span>{request.client}</span>
            <span>starts {prettyDate(request.startDate)}, {request.durationDays} days</span>
            <span>requested by {request.requestedBy}</span>
          </div>
        </div>
        {canRun && <RunCheckButton requestId={request.id} label={check ? "Run the check again" : "Run the check"} />}
      </div>

      {hasResult ? (
        <ResultHero
          comparisons={check.comparisons}
          policy={check.policy}
          reserveSen={company.reserveSen}
          context={`${formatRM(request.contractValueSen)} contract · checked ${prettyTime(check.createdAt)}`}
        />
      ) : (
        <section className="hero">
          <div className="eyebrow">
            {check ? <span className="pill danger">Missing information</span> : <span>Not checked yet</span>}
          </div>
          <p className="headline">
            {check
              ? "Some details need fixing before the cash check can run."
              : "Run the check to see how this job changes your cash over the next 13 weeks."}
          </p>
          {check && check.validation.some((v) => v.severity === "ERROR") && (
            <ul className="small" style={{ color: "#fff" }}>
              {check.validation.filter((v) => v.severity === "ERROR").map((v, i) => <li key={i}>{v.message}</li>)}
            </ul>
          )}
        </section>
      )}

      <div className="split">
        <div>
          {check && check.validation.some((v) => v.severity === "WARNING") && (
            <div className="card">
              <h2>Notes on the inputs</h2>
              <div className="findings">
                {check.validation.filter((v) => v.severity === "WARNING").map((v, i) => (
                  <div key={i} className="finding"><b>{v.message}</b></div>
                ))}
              </div>
            </div>
          )}

          {hasResult && <ResultDetails comparisons={check.comparisons} policy={check.policy} brief={check.brief} reserveSen={company.reserveSen} />}

          <div className="card overflow">
            <div className="card-head">
              <h2>Payments for this job</h2>
              <span className="source">in {formatRM(receiptsSen)} · out {formatRM(costsSen)} · contract {formatRM(request.contractValueSen)} · budget {formatRM(request.budgetSen)}</span>
            </div>
            {unconfirmed.length > 0 && (
              <p className="error">{unconfirmed.length} suggested payment(s) are not confirmed and will not be used in the check.</p>
            )}
            {canRun ? (
              <>
                <p className="muted small">You can still change the payments. Run the check again afterwards.</p>
                <EditPayments
                  job={{ id: request.id, title: request.title, client: request.client, startDate: request.startDate, contractValueSen: request.contractValueSen }}
                  events={request.events.map((e) => ({
                    id: e.id,
                    direction: e.direction as "IN" | "OUT",
                    amountSen: e.amountSen,
                    offsetDays: e.offsetDays,
                    confidence: e.confidence,
                    label: e.label,
                    source: e.source,
                    sourceRef: e.sourceRef,
                    confirmed: e.confirmed,
                  }))}
                />
              </>
            ) : request.events.length === 0 ? (
              <p className="muted">No payments entered.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Expected date</th><th>What</th><th className="num">In</th><th className="num">Out</th><th></th></tr>
                </thead>
                <tbody>
                  {request.events.map((e) => (
                    <tr key={e.id}>
                      <td className="date">{e.offsetDays === null ? "Unknown" : addDays(request.startDate, e.offsetDays)}</td>
                      <td>
                        {e.label} <span className="muted small">· {e.counterparty}</span>
                        {e.confidence === "ESTIMATED" && <> <span className="pill warn">estimated</span></>}
                      </td>
                      <td className="num">{e.direction === "IN" ? formatRM(e.amountSen) : ""}</td>
                      <td className="num">{e.direction === "OUT" ? formatRM(e.amountSen) : ""}</td>
                      <td>
                        {e.confirmed ? (
                          <span className="pill plain">{e.source === "AI_EXTRACTED" ? "AI, confirmed" : "entered"}</span>
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
        </div>

        <div className="aside">
          <div className="card">
            <h2>Owner decision</h2>
            {request.decisions.length > 0 && (
              <div className="findings">
                {request.decisions.map((d) => (
                  <div key={d.id} className={`finding ${d.outcome === "APPROVED" ? "ok" : d.outcome === "REJECTED" ? "danger" : ""}`}>
                    <b>{DECISION_TEXT[d.outcome] ?? d.outcome}</b>
                    <span className="small">&ldquo;{d.reason}&rdquo;</span>
                    <div className="vs">{d.actorName} · {prettyTime(d.createdAt)}</div>
                    {d.selfApproved && <div className="muted small">Decided by the person who created the request</div>}
                  </div>
                ))}
              </div>
            )}
            {request.status === "COMPLETED" && <p className="small">Acceptance sent for e-signature (simulated Orbyte eSign).</p>}
            {request.status === "CHECKED" && check ? (
              canDecide(session) ? (
                <DecisionPanel requestId={request.id} forecastRunId={check.runId} />
              ) : (
                <p className="muted small">Only the owner can decide on this commitment. You are viewing as {session.name}.</p>
              )
            ) : (
              request.decisions.length === 0 && <p className="muted small">A decision can be made once the check has run.</p>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Activity</h2>
              <Link href="/activity" className="small">All activity</Link>
            </div>
            <ul className="timeline">
              {request.activities.map((a) => (
                <li key={a.id} className={a.action === "DECISION" ? "decision" : undefined}>
                  <div>
                    <div className="what">{a.detail}</div>
                    <div className="when">{a.actor} · {prettyTime(a.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
