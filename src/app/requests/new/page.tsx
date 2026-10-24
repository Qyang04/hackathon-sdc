"use client";
// Three-step wizard. Owner: Workstream C (calls B's APIs).
// 1. Describe the job (title, client, start date, duration, contract value, budget)
// 2. Upload a PDF or paste the quotation / PO -> AI suggests payment dates -> confirm or edit each one (manual entry always available)
// 3. Run the check -> redirect to /requests/[id]
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRM, rmToSen } from "@/lib/engine/money";
import { PaymentsEditor, type Job, type ProposalEvent } from "../PaymentsEditor";

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
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  // Reads the PDF's text into the box so the person sees exactly what the AI will read
  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setUploadNote(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "The PDF could not be read. Paste the payment terms instead.");
      return;
    }
    if (!data.hasText) {
      setUploadNote(`${file.name} has no readable text (it looks like a scan or photo). Type or paste the payment terms instead.`);
      return;
    }
    setText(data.text);
    setUploadNote(`Read ${file.name} (${data.pages} page${data.pages === 1 ? "" : "s"}). Check the text below, then ask for suggestions.`);
  }

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

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h2>Upload or paste the quotation or purchase order</h2>
          <span className="ai-label" style={{ margin: 0 }}>Suggestions only</span>
        </div>
        <p className="muted small">
          The assistant suggests payment dates and amounts from the text. Nothing is used until you confirm it.
        </p>
        <div className="field">
          <label htmlFor="pdf">Upload a PDF (text PDFs from accounting software; scans and photos are not read)</label>
          <input
            id="pdf"
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          {uploadNote && <span className="small muted">{uploadNote}</span>}
        </div>
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
        <PaymentsEditor job={job} events={events} reload={reload}>
          <button onClick={onNext}>Next: run the check</button>
        </PaymentsEditor>
      </div>
    </>
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
