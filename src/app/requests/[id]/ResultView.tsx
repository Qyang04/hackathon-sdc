// Renders a computed check. Display only; never computes figures.
// ResultHero: outcome, headline, chart, scenario tabs (navy banner).
// ResultDetails: policy findings, scenario table, main contributing payments, engine warnings, AI brief.
import type { ComparisonResult } from "@/lib/engine/types";
import type { PolicyFinding, PolicyResult } from "@/lib/policy/types";
import type { DecisionBrief } from "@/lib/ai/schemas";
import { formatRM } from "@/lib/engine/money";
import { ResultHero } from "./ResultHero";
import { SCENARIO_TEXT } from "./labels";

export { ResultHero };

/** Hero + details stacked; used by the preview page. The request page places them separately. */
export function ResultView(props: { comparisons: ComparisonResult[]; policy: PolicyResult; brief: DecisionBrief | null; reserveSen: number }) {
  return (
    <>
      <ResultHero comparisons={props.comparisons} policy={props.policy} reserveSen={props.reserveSen} />
      <ResultDetails {...props} />
    </>
  );
}

// Reserve breaches are shown as danger, other review rules as warning
function tone(f: PolicyFinding): string {
  if (f.outcome === "BLOCKED" || f.ruleId.startsWith("RESERVE_BREACH")) return "danger";
  return f.outcome === "PASS" ? "ok" : "";
}

export function ResultDetails({
  comparisons,
  policy,
  brief,
}: {
  comparisons: ComparisonResult[];
  policy: PolicyResult;
  brief: DecisionBrief | null;
  reserveSen: number;
}) {
  const base = comparisons.find((c) => c.scenario.name === "BASE");

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h2>{policy.findings.length > 0 ? "Rules triggered" : "Your rules"}</h2>
          <span className="source">from your company settings</span>
        </div>
        {policy.findings.length > 0 ? (
          <div className="findings">
            {policy.findings.map((f) => (
              <div key={f.ruleId} className={`finding fade-in ${tone(f)}`}>
                <b>{f.message}</b>
                {f.value && f.threshold && <span className="vs">{f.value} · threshold {f.threshold}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="findings"><div className="finding ok"><b>None of your rules were crossed.</b></div></div>
        )}
        <p className="muted small">Every commitment still needs your decision. &ldquo;No rule triggered&rdquo; only means none of your rules were crossed.</p>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Summary</h2>
          <span className="badge">Decision support, not financial advice</span>
        </div>
        {brief ? (
          <>
            <div className="ai-label">Written by AI from the figures above</div>
            <p className="ai-text">{brief.summary}</p>
            <BriefList title="Risks" items={brief.risks} />
            <BriefList title="Information still missing" items={brief.missingInfo} />
            <BriefList title="Conditions you could attach" items={brief.possibleConditions} />
          </>
        ) : (
          <p className="muted">The written summary is not available right now. The figures are complete and unaffected.</p>
        )}
      </div>

      <div className="card overflow">
        <h2>Compare situations</h2>
        <table>
          <thead>
            <tr>
              <th>Situation</th>
              <th className="num">Lowest without job</th>
              <th className="num">Lowest with job</th>
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
                  <td><b>{s.name}</b><div className="muted small">{s.help}</div></td>
                  <td className="num">{formatRM(c.baseline.metrics.minBalanceSen)}</td>
                  <td className="num">{formatRM(m.minBalanceSen)}<div className="muted small">{m.minBalanceDate}</div></td>
                  <td className="num">{formatRM(c.minBalanceDeltaSen)}</td>
                  <td>{m.firstBreachDate ? <span className="pill danger">{m.firstBreachDate}</span> : <span className="pill ok">Stays above</span>}</td>
                  <td className="num">{m.peakFundingNeedSen > 0 ? formatRM(m.peakFundingNeedSen) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {base && base.mainContributors.length > 0 && (
        <div className="card overflow">
          <div className="card-head">
            <h2>What drives the lowest point</h2>
            <span className="source">largest payments in the two weeks up to {base.withProposal.metrics.minBalanceDate}, as planned</span>
          </div>
          <table>
            <tbody>
              {base.mainContributors.map((c) => (
                <tr key={c.sourceId}>
                  <td className="date">{c.date}</td>
                  <td>{c.label}</td>
                  <td className="num" style={{ color: c.signedSen < 0 ? "var(--danger)" : "var(--ok)" }}>{formatRM(c.signedSen)}</td>
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
    </>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="eyebrow" style={{ marginTop: 12, marginBottom: 4 }}>{title}</div>
      <ul className="ai-text" style={{ fontSize: 16 }}>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </>
  );
}
