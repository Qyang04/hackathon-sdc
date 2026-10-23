// "How the numbers work": the engine explained for judges. Owner: Workstream A.
// Pure presentation: every figure is computed live by src/lib/engine — nothing typed in by hand.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { simulatedAccounting } from "@/lib/adapters/orbyte";
import { addDays, compareProposal, formatRM, scenarioPresets } from "@/lib/engine";
import { DEMO_PROPOSAL } from "@/lib/demo/data";
import { buildSettingsRows, PIPELINE_STEPS, summariseComparison, WARNING_GLOSSARY } from "./explain";

export const dynamic = "force-dynamic";

const HORIZON_DAYS = 91; // 13 weeks, same as a real check

export default async function HowItWorksPage() {
  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });

  if (!settings) {
    return (
      <>
        <h1>How the numbers work</h1>
        <div className="card error">No company settings found. Run <code>npm run db:reset</code> to load the demo data.</div>
      </>
    );
  }

  const forecastSettings = { openingCashSen: settings.openingCashSen, openingDate: settings.openingDate, reserveSen: settings.reserveSen, minHorizonDays: HORIZON_DAYS };
  const horizonEnd = addDays(settings.openingDate, HORIZON_DAYS - 1);
  const [existing, recurringInputs] = await Promise.all([simulatedAccounting.listCashEvents(), simulatedAccounting.listRecurringCosts()]);
  const exampleProposal = { requestId: "how-example", startDate: DEMO_PROPOSAL.startDate, events: DEMO_PROPOSAL.events };
  const comparisons = scenarioPresets(settings.customerDelayDays).map((s) =>
    compareProposal(existing, recurringInputs, exampleProposal, forecastSettings, s),
  );
  const scenarioRows = comparisons.map(summariseComparison);
  const settingRows = buildSettingsRows(settings);
  const worstScenario = scenarioRows.find((r) => r.firstBreachDate) ?? null;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">How the numbers work · figures computed live</div>
          <h1>From promises to a decision</h1>
        </div>
      </div>

      <p className="muted" style={{ maxWidth: "70ch" }}>
        This page shows the same engine that runs every check, on the demo data — so the figures below always match
        the <Link href="/">Overview</Link> banner. Nothing here is typed in by hand: <code>src/lib/engine</code> produces every number.
      </p>

      <section className="card">
        <div className="card-head"><h2>The check, in five steps</h2></div>
        <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.8rem" }}>
          {PIPELINE_STEPS.map((s) => (
            <li key={s.n}>
              <b>Step {s.n} · {s.title}.</b> {s.text}
            </li>
          ))}
        </ol>
      </section>

      <section className="card overflow">
        <div className="card-head">
          <h2>Worked example: {DEMO_PROPOSAL.title}</h2>
          <span className="source">contract {formatRM(DEMO_PROPOSAL.contractValueSen)} · starts {DEMO_PROPOSAL.startDate} · {DEMO_PROPOSAL.durationDays} days</span>
        </div>
        <p className="muted">The payments staff entered for this job:</p>
        <table>
          <thead><tr><th>Date</th><th>What</th><th className="num">In</th><th className="num">Out</th></tr></thead>
          <tbody>
            {DEMO_PROPOSAL.events.map((e) => (
              <tr key={e.id}>
                <td className="date">{addDays(DEMO_PROPOSAL.startDate, e.offsetDays)}</td>
                <td>{e.label}{e.confidence === "ESTIMATED" && <> <span className="pill warn">estimated</span></>}</td>
                <td className="num" style={{ color: "var(--ok)" }}>{e.direction === "IN" ? formatRM(e.amountSen) : ""}</td>
                <td className="num">{e.direction === "OUT" ? formatRM(e.amountSen) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow">
        <div className="card-head"><h2>Three futures for this job</h2></div>
        <table>
          <thead>
            <tr><th>Scenario</th><th className="num">Lowest cash, as planned</th><th className="num">Lowest cash, with this job</th><th>First day below buffer</th><th className="num">Extra cash needed</th></tr>
          </thead>
          <tbody>
            {scenarioRows.map((r) => (
              <tr key={r.key}>
                <td>
                  <b>{r.key}</b>
                  <div className="muted small">{r.blurb}</div>
                </td>
                <td className="num">{formatRM(r.plannedMinSen)} <span className="muted small">on {r.plannedDate}</span></td>
                <td className="num">{formatRM(r.withJobMinSen)} <span className="muted small">on {r.withJobDate}</span></td>
                <td>{r.firstBreachDate ? <span className="pill warn">{r.firstBreachDate}</span> : <span className="pill plain">never</span>}</td>
                <td className="num">{r.peakNeedSen > 0 ? formatRM(r.peakNeedSen) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small" style={{ marginBottom: 0 }}>
          {worstScenario
            ? worstScenario.key === "BASE"
              ? `Reading the table: cash dips below the buffer from ${worstScenario.firstBreachDate} even as planned — the ${worstScenario.key} row shows it first.`
              : `Reading the table: as planned, cash stays above the buffer, but in the ${worstScenario.key} scenario it dips below from ${worstScenario.firstBreachDate} — the risk the owner is shown, not hidden.`
            : "Reading the table: cash stays above the buffer in every scenario."}
        </p>
      </section>

      <section className="card overflow">
        <div className="card-head"><h2>Your three settings, in plain words</h2><span className="source">current values shown live</span></div>
        <table>
          <thead><tr><th>Setting</th><th>What it does when on</th><th className="num">Current value</th><th>What 0 means</th></tr></thead>
          <tbody>
            {settingRows.map((r) => (
              <tr key={r.key}>
                <td><b>{r.label}</b></td>
                <td>{r.whatItDoes}</td>
                <td className="num">{r.key === "customerDelayDays" ? `${r.valueSen} days` : formatRM(r.valueSen)}</td>
                <td className="small">{r.zeroMeans}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow">
        <div className="card-head"><h2>Every message, in plain words</h2></div>
        <table>
          <thead><tr><th>Code</th><th>Where</th><th>Meaning</th></tr></thead>
          <tbody>
            {WARNING_GLOSSARY.map((g) => (
              <tr key={g.code}>
                <td><code>{g.code}</code></td>
                <td className="small">{g.where}</td>
                <td>{g.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="muted small">
        Where the rules live: validation <code>src/lib/validation/validate.ts</code> · cash engine <code>src/lib/engine/forecast.ts</code> ·
        scenarios <code>src/lib/engine/scenarios.ts</code> · decision rules <code>src/lib/policy/policy.ts</code>.
      </p>
    </>
  );
}
