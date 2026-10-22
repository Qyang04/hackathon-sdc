"use client";
// Three-step wizard. Owner: Workstream C (calls B's APIs).
// 1. Describe the job (title, client, start date, duration, contract value, budget)
// 2. Paste the quotation / PO -> AI suggests payment dates -> confirm or edit each one (manual entry always available)
// 3. Run the check -> redirect to /requests/[id]
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRM, rmToSen } from "@/lib/engine/money";
import { addDays, daysBetween } from "@/lib/engine/dates";

interface ProposalEvent {
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

interface Job {
  id: string;
  title: string;
  client: string;
  startDate: string;
  contractValueSen: number;
}

const STEPS = ["Describe the job", "Payment dates", "Run the check"];

export default function NewRequestPage() {
  const [step, setStep] = useState(0);
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<ProposalEvent[]>([]);

  async function reloadEvents(id: string) {
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) setEvents((await res.json()).request.events);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Before you accept a job</div>
          <h1>New commitment check</h1>
        </div>
      </div>
      <div className="steps">
        {STEPS.map((s, i) => (
          <span key={s} className={i === step ? "current" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined}>
            <span className="n">{i < step ? "✓" : i + 1}</span>
            {s}
          </span>
        ))}
      </div>
      {step === 0 && (
        <JobStep
          onCreated={(j) => {
            setJob(j);
            setStep(1);
          }}
        />
      )}
      {step === 1 && job && (
        <PaymentsStep job={job} events={events} reload={() => reloadEvents(job.id)} onNext={() => setStep(2)} />
      )}
      {step === 2 && job && <RunStep job={job} events={events} onBack={() => setStep(1)} />}
    </>
  );
}

function JobStep({ onCreated }: { onCreated: (job: Job) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    let contractValueSen: number, budgetSen: number;
    try {
      contractValueSen = rmToSen(String(f.get("contractValue")));
      budgetSen = rmToSen(String(f.get("budget")));
    } catch {
      setError("Enter amounts as numbers, e.g. 45000 or 45,000.00");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: f.get("title"),
        client: f.get("client"),
        startDate: f.get("startDate"),
        durationDays: Number(f.get("durationDays")),
        contractValueSen,
        budgetSen,
        justification: f.get("justification") ?? "",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not save the job. Check every field is filled in.");
      return;
    }
    onCreated((await res.json()).request);
  }

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 760 }}>
      <h2>What is the job?</h2>
      <div className="row">
        <div className="field">
          <label htmlFor="title">Job name</label>
          <input id="title" name="title" required placeholder="e.g. Office fit-out, Level 3" />
        </div>
        <div className="field">
          <label htmlFor="client">Client</label>
          <input id="client" name="client" required />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="startDate">Planned start date</label>
          <input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="field">
          <label htmlFor="durationDays">How many days it runs</label>
          <input id="durationDays" name="durationDays" type="number" min={1} required />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="contractValue">Contract value (RM), what the client pays you</label>
          <input id="contractValue" name="contractValue" inputMode="decimal" required />
        </div>
        <div className="field">
          <label htmlFor="budget">Your cost budget (RM), what you expect to spend</label>
          <input id="budget" name="budget" inputMode="decimal" required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="justification">Notes (optional)</label>
        <input id="justification" name="justification" />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Next: payment dates"}</button>
      </div>
    </form>
  );
}

function PaymentsStep({
  job,
  events,
  reload,
  onNext,
}: {
  job: Job;
  events: ProposalEvent[];
  reload: () => Promise<void>;
  onNext: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function extract() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: job.id, sourceText: text }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not read the quotation. You can still enter payments by hand.");
      return;
    }
    const data = (await res.json()) as { missingInfo: string[] };
    setNotes(data.missingInfo ?? []);
    await reload();
  }

  async function confirm(ids: string[]) {
    await fetch(`/api/requests/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEventIds: ids }),
    });
    await reload();
  }

  async function remove(id: string) {
    await fetch(`/api/requests/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeEventIds: [id] }),
    });
    await reload();
  }

  const unconfirmed = events.filter((e) => !e.confirmed);

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h2>Paste the quotation or purchase order</h2>
          <span className="ai-label" style={{ margin: 0 }}>Suggestions only</span>
        </div>
        <p className="muted small">
          The assistant suggests payment dates and amounts from the text. Nothing is used until you confirm it.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the payment terms here…" />
        <div className="actions">
          <button onClick={extract} disabled={busy || text.trim() === ""}>{busy ? "Reading…" : "Suggest payment dates"}</button>
        </div>
        {error && <p className="error">{error}</p>}
        {notes.length > 0 && (
          <ul className="small" style={{ color: "var(--warn)" }}>
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
      </div>

      <div className="card overflow">
        <h2>Payments for this job</h2>
        <EventTable job={job} events={events} onConfirm={(id) => confirm([id])} onRemove={remove} />
        <ManualEventForm job={job} onAdded={reload} />
        <div className="actions">
          {unconfirmed.length > 0 && (
            <button className="secondary" onClick={() => confirm(unconfirmed.map((e) => e.id))}>
              Confirm all {unconfirmed.length} suggestion(s)
            </button>
          )}
          <button onClick={onNext}>Next: run the check</button>
        </div>
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

function RunStep({ job, events, onBack }: { job: Job; events: ProposalEvent[]; onBack: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unconfirmed = events.filter((e) => !e.confirmed).length;
  const receipts = events.filter((e) => e.direction === "IN").reduce((s, e) => s + e.amountSen, 0);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/requests/${job.id}/forecast`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "The check could not run.");
      return;
    }
    router.push(`/requests/${job.id}`);
  }

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <h2>Ready to check {job.title}</h2>
      <div className="stats" style={{ marginBottom: 12 }}>
        <div className="stat"><div className="label">Client</div><div className="value" style={{ fontFamily: "inherit" }}>{job.client}</div></div>
        <div className="stat"><div className="label">Starts</div><div className="value">{job.startDate}</div></div>
        <div className="stat"><div className="label">Contract value</div><div className="value">{formatRM(job.contractValueSen)}</div></div>
        <div className="stat"><div className="label">Client payments listed</div><div className="value">{formatRM(receipts)}</div></div>
      </div>
      <p className="muted small">{events.length} payment(s) entered. The check compares your cash with and without this job over the next 13 weeks.</p>
      {unconfirmed > 0 && (
        <p className="error">{unconfirmed} suggested payment(s) are not confirmed yet. The check will not use them until you confirm.</p>
      )}
      {error && (
        <p className="error">
          {error} <Link href={`/requests/${job.id}`}>Open the saved check</Link>
        </p>
      )}
      <div className="actions">
        <button className="secondary" onClick={onBack}>Back</button>
        <button onClick={run} disabled={busy}>{busy ? "Checking…" : "Run the check"}</button>
      </div>
    </div>
  );
}
