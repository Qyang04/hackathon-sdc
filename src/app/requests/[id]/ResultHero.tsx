"use client";
// Navy banner at the top of a checked request: outcome, one-sentence answer, chart and scenario tabs.
// Display only; every figure comes from the saved ComparisonResult.
import { useState } from "react";
import type { ComparisonResult, ScenarioName } from "@/lib/engine/types";
import type { PolicyResult } from "@/lib/policy/types";
import { CashChart } from "./CashChart";
import { prettyDate, shortRM } from "../../format";
import { OUTCOME, SCENARIO_TEXT } from "./labels";

export function ResultHero({
  comparisons,
  policy,
  reserveSen,
  context,
}: {
  comparisons: ComparisonResult[];
  policy: PolicyResult;
  reserveSen: number;
  context?: string;
}) {
  const [shown, setShown] = useState<ScenarioName>("BASE");
  const base = comparisons.find((c) => c.scenario.name === "BASE");
  const downside = comparisons.find((c) => c.scenario.name === "DOWNSIDE");
  const current = comparisons.find((c) => c.scenario.name === shown) ?? base;
  const outcome = OUTCOME[policy.outcome];

  return (
    <section className="hero">
      <div className="eyebrow">
        <span className={`pill ${outcome.tone}`}>{outcome.text}</span>
        {context && <span>{context}</span>}
      </div>
      {base && <Headline base={base} downside={downside} reserveSen={reserveSen} />}
      {current && (
        <CashChart key={shown} baseline={current.baseline.weeks} withJob={current.withProposal.weeks} reserveSen={reserveSen} />
      )}
      <div className="scenario-tabs" role="group" aria-label="Choose a situation to show on the chart">
        {comparisons.map((c) => {
          const m = c.withProposal.metrics;
          const below = m.minBalanceSen < reserveSen;
          return (
            <button
              key={c.scenario.name}
              type="button"
              className={below ? "bad" : undefined}
              aria-pressed={c.scenario.name === shown}
              onClick={() => setShown(c.scenario.name)}
              title={SCENARIO_TEXT[c.scenario.name].help}
            >
              <span className="name">{SCENARIO_TEXT[c.scenario.name].name}</span>
              <span className="v">{shortRM(m.minBalanceSen)}</span>
              <span className="s">
                {prettyDate(m.minBalanceDate, false)} · {below ? `below buffer by ${shortRM(reserveSen - m.minBalanceSen)}` : "above buffer"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// Plain sentence built from the figures (no AI): as planned, then if things slip.
function Headline({ base, downside, reserveSen }: { base: ComparisonResult; downside?: ComparisonResult; reserveSen: number }) {
  const b = base.withProposal.metrics;
  const bBelow = b.minBalanceSen < reserveSen;
  const d = downside?.withProposal.metrics;
  const dBelow = d ? d.minBalanceSen < reserveSen : false;
  return (
    <p className="headline">
      As planned, your lowest cash is <em className={bBelow ? "bad" : undefined}>{shortRM(b.minBalanceSen)}</em> on {prettyDate(b.minBalanceDate)},{" "}
      {bBelow ? "below" : "above"} your {shortRM(reserveSen)} buffer.
      {d && (
        <>
          {" "}If things slip, it is <em className={dBelow ? "bad" : undefined}>{shortRM(d.minBalanceSen)}</em> on {prettyDate(d.minBalanceDate)}
          {dBelow ? ", below the buffer." : "."}
        </>
      )}
    </p>
  );
}
