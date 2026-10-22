"use client";
// Payments of a job: table (confirm / remove), "add a payment by hand" form and "confirm all".
// Used by the new-check wizard and by a request's page while it is DRAFT or NEEDS_INFO.
import { useState } from "react";
import { formatRM, rmToSen } from "@/lib/engine/money";
import { addDays, daysBetween } from "@/lib/engine/dates";

export interface ProposalEvent {
  id: string;
  direction: "IN" | "OUT";
  amountSen: number;
  offsetDays: number | null;
  confidence: string;
  label: string;
  source: string;
  sourceRef: string | null;
  confirmed: boolean;
}

export interface Job {
  id: string;
  title: string;
  client: string;
  startDate: string;
  contractValueSen: number;
}

export function PaymentsEditor({
  job,
  events,
  reload,
  children,
}: {
  job: Job;
  events: ProposalEvent[];
  reload: () => Promise<void> | void;
  children?: React.ReactNode; // extra actions, e.g. the wizard's "Next" button
}) {
  async function patch(body: object) {
    await fetch(`/api/requests/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await reload();
  }
  const unconfirmed = events.filter((e) => !e.confirmed);

  return (
    <>
      <EventTable job={job} events={events} onConfirm={(id) => patch({ confirmEventIds: [id] })} onRemove={(id) => patch({ removeEventIds: [id] })} />
      <ManualEventForm job={job} onAdded={async () => { await reload(); }} />
      <div className="actions">
        {unconfirmed.length > 0 && (
          <button className="secondary" onClick={() => patch({ confirmEventIds: unconfirmed.map((e) => e.id) })}>
            Confirm all {unconfirmed.length} suggestion(s)
          </button>
        )}
        {children}
      </div>
    </>
  );
}

function ManualEventForm({ job, onAdded }: { job: Job; onAdded: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    const date = String(f.get("date"));
    const offsetDays = /^\d{4}-\d{2}-\d{2}$/.test(date) ? daysBetween(job.startDate, date) : -1;
    if (offsetDays < 0) {
      setError("The date must be on or after the job start date.");
      return;
    }
    let amountSen: number;
    try {
      amountSen = rmToSen(String(f.get("amount")));
    } catch {
      setError("Enter the amount as a number, e.g. 15000 or 15,000.00");
      return;
    }
    const direction = f.get("direction") as "IN" | "OUT";
    const res = await fetch(`/api/requests/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addEvents: [{
          direction,
          amountSen,
          offsetDays,
          confidence: f.get("estimated") ? "ESTIMATED" : "CONFIRMED",
          counterparty: direction === "IN" ? job.client : String(f.get("counterparty") || "Supplier"),
          label: f.get("label"),
        }],
      }),
    });
    if (!res.ok) {
      setError("Could not add the payment. Check every field.");
      return;
    }
    form.reset();
    await onAdded();
  }

  return (
    <form onSubmit={submit} className="subform">
      <h2>Add a payment by hand</h2>
      <div className="row">
        <div className="field">
          <label htmlFor="m-direction">Type</label>
          <select id="m-direction" name="direction">
            <option value="IN">Client pays you</option>
            <option value="OUT">You pay a supplier</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="m-label">What for</label>
          <input id="m-label" name="label" required placeholder="e.g. 30% deposit" />
        </div>
        <div className="field">
          <label htmlFor="m-counterparty">Supplier (if you pay)</label>
          <input id="m-counterparty" name="counterparty" />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="m-date">Expected date</label>
          <input id="m-date" name="date" type="date" min={job.startDate} required />
        </div>
        <div className="field">
          <label htmlFor="m-amount">Amount (RM)</label>
          <input id="m-amount" name="amount" inputMode="decimal" required />
        </div>
        <div className="field">
          <label className="check">
            <input type="checkbox" name="estimated" /> Date is only an estimate
          </label>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="secondary">Add payment</button>
    </form>
  );
}

function EventTable({
  job,
  events,
  onConfirm,
  onRemove,
}: {
  job: Job;
  events: ProposalEvent[];
  onConfirm?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  if (events.length === 0) return <p className="muted">No payments yet.</p>;
  return (
    <table>
      <thead>
        <tr><th>Expected date</th><th>What</th><th className="num">In</th><th className="num">Out</th><th></th></tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.id}>
            <td className="date">
              {e.offsetDays === null ? "Unknown" : addDays(job.startDate, e.offsetDays)}
              <div className="muted small">day {e.offsetDays ?? "?"} after start</div>
            </td>
            <td>
              {e.label}
              {e.source === "AI_EXTRACTED" && <> <span className="pill info">AI suggestion</span></>}
              {e.sourceRef && <div className="ai-text small">“{e.sourceRef}”</div>}
            </td>
            <td className="num">{e.direction === "IN" ? formatRM(e.amountSen) : ""}</td>
            <td className="num">{e.direction === "OUT" ? formatRM(e.amountSen) : ""}</td>
            <td>
              {e.confirmed ? (
                <span className="pill ok">confirmed</span>
              ) : onConfirm ? (
                <button className="small" onClick={() => onConfirm(e.id)}>Confirm</button>
              ) : (
                <span className="pill warn">not confirmed</span>
              )}
              {onRemove && (
                <>
                  {" "}
                  <button className="secondary small" onClick={() => onRemove(e.id)} aria-label={`Remove ${e.label}`}>Remove</button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
