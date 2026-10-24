// Owner settings: safety buffer, review threshold, customer delay. Owner: Workstream C.
// Staff see the values read-only; the server (PATCH /api/settings) checks the role again.
import { prisma } from "@/lib/db";
import { getSession, canDecide } from "@/lib/session";
import { formatRM } from "@/lib/engine";
import { buildSettingsRows } from "../how/explain";
import { prettyTime } from "../format";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [session, settings, history] = await Promise.all([
    getSession(),
    prisma.companySettings.findUnique({ where: { id: 1 } }),
    prisma.activityLog.findMany({ where: { action: "SETTINGS_UPDATED" }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  if (!settings) {
    return (
      <>
        <h1>Settings</h1>
        <div className="card error">No company settings found. Run <code>npm run db:reset</code> to load the demo data.</div>
      </>
    );
  }

  const rows = buildSettingsRows(settings);
  const isOwner = canDecide(session);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Owner settings</div>
          <h1>Settings</h1>
          <div className="meta">The three numbers every check uses. A change applies to the next check; checks already run keep the settings they were run with.</div>
        </div>
      </div>

      <section className="card">
        {isOwner ? (
          <SettingsForm
            rows={rows}
            initial={{ reserveSen: settings.reserveSen, approvalThresholdSen: settings.approvalThresholdSen, customerDelayDays: settings.customerDelayDays }}
          />
        ) : (
          <>
            <p className="muted">Only the owner can change these. You are viewing as {session.name}.</p>
            <ul>
              {rows.map((r) => (
                <li key={r.key}>
                  <b>{r.label}:</b> {r.key === "customerDelayDays" ? `${r.valueSen} days` : formatRM(r.valueSen)}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h2>Recent changes</h2><span className="source">from the activity log</span></div>
        {history.length === 0 ? (
          <p className="muted">No changes yet; the demo defaults are in use.</p>
        ) : (
          <ul className="timeline">
            {history.map((h) => (
              <li key={h.id}>
                <div>
                  <div className="what">{h.detail}</div>
                  <div className="when">{h.actor} · {prettyTime(h.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
