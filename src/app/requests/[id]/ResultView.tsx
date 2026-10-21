// Renders a computed check: plain-language headline, policy findings, scenario comparison, chart,
// main contributing payments, engine warnings and the AI brief. Display only; never computes figures.
import type { ComparisonResult, ScenarioName } from "@/lib/engine/types";
import type { PolicyResult } from "@/lib/policy/types";
import type { DecisionBrief } from "@/lib/ai/schemas";
import { formatRM } from "@/lib/engine/money";
import { CashChart } from "./CashChart";

const SCENARIO_TEXT: Record<ScenarioName, { name: string; help: string }> = {
  BASE: { name: "As planned", help: "Payments arrive on the dates entered" },
  DOWNSIDE: { name: "If things slip", help: "Customers pay late, costs rise 10%, unconfirmed receipts left out" },
  DEFERRED_START: { name: "Start later", help: "Same job, started later" },
};

const OUTCOME: Record<PolicyResult["outcome"], { text: string; tone: string }> = {
  PASS: { text: "No rule triggered", tone: "ok" },
  NEEDS_REVIEW: { text: "Needs your review", tone: "warn" },
  BLOCKED: { text: "Missing information", tone: "danger" },
};

export function ResultView({
  comparisons,
  policy,
  brief,
  reserveSen,
}: {
  comparisons: ComparisonResult[];
  policy: PolicyResult;
  brief: DecisionBrief | null;
  reserveSen: number;
}) {
  const base = comparisons.find((c) => c.scenario.name === "BASE");
  const outcome = OUTCOME[policy.outcome];

  return (
    <>
      <div className="card">
        <p>
          <span className={`pill ${outcome.tone}`}>{outcome.text}</span>
        </p>
        {base && <p style={{ fontSize: 18, margin: "8px 0" }}>{headline(base, reserveSen)}</p>}
        {policy.findings.length > 0 && (
          <ul>
            {policy.findings.map((f) => (
              <li key={f.ruleId}>
                {f.message}
                {f.value && f.threshold && <span className="muted small"> ({f.value} vs {f.threshold})</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">
          Every commitment still needs your decision. &ldquo;No rule triggered&rdquo; only means none of your rules were crossed.
        </p>
      </div>

      {base && (
        <div className="card">
          <h2>Cash over the next weeks</h2>
          <CashChart baseline={base.baseline.weeks} withJob={base.withProposal.weeks} reserveSen={reserveSen} />
        </div>
      )}

      <div className="card overflow">
        <h2>Compare situations</h2>
        <table>
          <thead>
            <tr>
              <th>Situation</th>
              <th className="num">Lowest cash without job</th>
              <th className="num">Lowest cash with job</th>
              <th className="num">Change</th>
              <th>First day below buffer</th>
              <th className="num">Extra cash needed</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c) => {
              const m = c.withProposal.metrics;
              const s = SCENARIO_TEXT[c.scenario.name];
              return (
                <tr key={c.scenario.name}>
                  <td>{s.name}<div className="muted small">{s.help}</div></td>
                  <td className="num">{formatRM(c.baseline.metrics.minBalanceSen)}</td>
                  <td className="num">{formatRM(m.minBalanceSen)}<div className="muted small">{m.minBalanceDate}</div></td>
                  <td className="num">{formatRM(c.minBalanceDeltaSen)}</td>
                  <td>{m.firstBreachDate ? <span className="pill danger">{m.firstBreachDate}</span> : <span className="muted">Stays above</span>}</td>
                  <td className="num">{m.peakFundingNeedSen > 0 ? formatRM(m.peakFundingNeedSen) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {base && base.mainContributors.length > 0 && (
        <div className="card overflow">
          <h2>What drives the lowest point</h2>
          <p className="muted small">Largest payments in the two weeks up to {base.withProposal.metrics.minBalanceDate} (as planned).</p>
          <table>
            <tbody>
              {base.mainContributors.map((c) => (
                <tr key={c.sourceId}>
                  <td className="small">{c.date}</td>
                  <td>{c.label}</td>
                  <td className="num">{formatRM(c.signedSen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {base && base.withProposal.warnings.length > 0 && (
        <div className="card">
          <h2>Things to know about these figures</h2>
          <ul className="small">
            {base.withProposal.warnings.map((w) => <li key={w.code + w.sourceId}>{w.message}</li>)}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>Summary <span className="badge">Decision support, not financial advice</span></h2>
        {brief ? (
          <>
            <p>{brief.summary}</p>
            <BriefList title="Risks" items={brief.risks} />
            <BriefList title="Information still missing" items={brief.missingInfo} />
            <BriefList title="Conditions you could attach" items={brief.possibleConditions} />
          </>
        ) : (
          <p className="muted">The written summary is not available right now. The figures above are complete and unaffected.</p>
        )}
      </div>
    </>
  );
}

function headline(c: ComparisonResult, reserveSen: number): string {
  const m = c.withProposal.metrics;
  const where = m.minBalanceSen < reserveSen ? "below" : "above";
  return `With this job, your lowest cash is ${formatRM(m.minBalanceSen)} on ${m.minBalanceDate}, ${where} your ${formatRM(reserveSen)} safety buffer.`;
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="small muted" style={{ marginTop: 8 }}>{title}</div>
      <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </>
  );
}
