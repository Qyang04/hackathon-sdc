// Printable commitment report: the figures, rules, decision and log on one page. Owner: Workstream C.
// Linked from every simulated email; the browser's "Save as PDF" turns it into the exported report.
// Every figure comes from the saved check (loadLatestCheck); nothing is recalculated or written by AI here.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatRM } from "@/lib/engine/money";
import { addDays } from "@/lib/engine/dates";
import { loadLatestCheck } from "@/lib/runs";
import { prettyDate, prettyTime } from "../../../format";
import { OUTCOME, SCENARIO_TEXT } from "../labels";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

const DECISION_TEXT: Record<string, string> = { APPROVED: "Approved", REJECTED: "Declined", NEEDS_INFO: "Asked for more information" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [request, check, company] = await Promise.all([
    prisma.commitmentRequest.findUnique({
      where: { id },
      include: {
        events: { orderBy: { offsetDays: "asc" } },
        activities: { orderBy: { createdAt: "asc" } },
        decisions: { orderBy: { createdAt: "desc" } },
      },
    }),
    loadLatestCheck(id),
    prisma.companySettings.findUnique({ where: { id: 1 }, select: { companyName: true } }),
  ]);
  if (!request) notFound();

  const decision = request.decisions[0] ?? null;

  return (
    <article className="report">
      <div className="page-head">
        <div>
          <div className="crumbs no-print"><Link href={`/requests/${id}`}>Back to the check</Link></div>
          <div className="eyebrow">Commitment report · {company?.companyName ?? "Demo company"} · simulated data</div>
          <h1>{request.title}</h1>
          <div className="meta">
            <span>{request.client}</span>
            <span>starts {prettyDate(request.startDate)}, {request.durationDays} days</span>
            <span>contract {formatRM(request.contractValueSen)} · budget {formatRM(request.budgetSen)}</span>
            <span>requested by {request.requestedBy}</span>
          </div>
        </div>
        <PrintButton />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Result of the check</h2>
          {check && <span className="source">checked {prettyTime(check.createdAt)}{check.reserveSen != null && ` · safety buffer ${formatRM(check.reserveSen)}`}</span>}
        </div>
        {!check ? (
          <p className="muted">The check has not been run yet.</p>
        ) : (
          <>
            <p><span className={`pill ${OUTCOME[check.policy.outcome].tone}`}>{OUTCOME[check.policy.outcome].text}</span></p>
            {check.policy.findings.length > 0 && (
              <ul>
                {check.policy.findings.map((f, i) => (
                  <li key={i}>{f.message}{f.value && ` (${f.value}${f.threshold ? ` vs ${f.threshold}` : ""})`}</li>
                ))}
              </ul>
            )}
            {check.comparisons.length > 0 && (
              <div className="overflow">
                <table>
                  <thead>
                    <tr><th>Scenario</th><th className="num">Lowest cash with the job</th><th>On</th><th>Below the buffer from</th><th className="num">Change vs without the job</th></tr>
                  </thead>
                  <tbody>
                    {check.comparisons.map((c) => {
                      const m = c.withProposal.metrics;
                      return (
                        <tr key={c.scenario.name}>
                          <td><b>{SCENARIO_TEXT[c.scenario.name].name}</b><div className="small muted">{SCENARIO_TEXT[c.scenario.name].help}</div></td>
                          <td className="num">{formatRM(m.minBalanceSen)}</td>
                          <td className="date">{prettyDate(m.minBalanceDate)}</td>
                          <td className="date">{m.firstBreachDate ? prettyDate(m.firstBreachDate) : "Never"}</td>
                          <td className="num">{formatRM(c.minBalanceDeltaSen)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {check.validation.length > 0 && (
              <>
                <h3>Notes on the inputs</h3>
                <ul className="small">{check.validation.map((v, i) => <li key={i}>{v.message}</li>)}</ul>
              </>
            )}
            {check.brief && (
              <>
                <h3>Summary (written by AI from the figures above)</h3>
                <p>{check.brief.summary}</p>
              </>
            )}
          </>
        )}
      </section>

      <section className="card overflow">
        <h2>Payments for this job</h2>
        <table>
          <thead><tr><th>Expected date</th><th>What</th><th className="num">In</th><th className="num">Out</th></tr></thead>
          <tbody>
            {request.events.map((e) => (
              <tr key={e.id}>
                <td className="date">{e.offsetDays === null ? "Unknown" : prettyDate(addDays(request.startDate, e.offsetDays))}</td>
                <td>{e.label}{e.confidence === "ESTIMATED" && " (estimated)"}{!e.confirmed && " (not confirmed, not used)"}</td>
                <td className="num">{e.direction === "IN" ? formatRM(e.amountSen) : ""}</td>
                <td className="num">{e.direction === "OUT" ? formatRM(e.amountSen) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Owner decision</h2>
        {decision ? (
          <p>
            <b>{DECISION_TEXT[decision.outcome] ?? decision.outcome}</b> by {decision.actorName}, {prettyTime(decision.createdAt)}: &ldquo;{decision.reason}&rdquo;
            {decision.selfApproved && " (decided by the person who created the request)"}
          </p>
        ) : (
          <p className="muted">No decision yet.</p>
        )}
      </section>

      <section className="card">
        <h2>Activity log</h2>
        <ul className="timeline">
          {request.activities.map((a) => (
            <li key={a.id}>
              <div>
                <div className="what">{a.detail}</div>
                <div className="when">{a.actor} · {prettyTime(a.createdAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="small muted">Decision support, not financial advice. All data is synthetic and Orbyte connections are simulated. The owner makes every decision.</p>
    </article>
  );
}
