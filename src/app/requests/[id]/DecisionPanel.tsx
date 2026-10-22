"use client";
// Owner decision form. The server re-checks the role, status and run id; this only collects the input.
import { useState } from "react";
import { useRouter } from "next/navigation";

type Outcome = "APPROVED" | "REJECTED" | "NEEDS_INFO";

export function DecisionPanel({ requestId, forecastRunId }: { requestId: string; forecastRunId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(outcome: Outcome) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, reason, forecastRunId }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "The decision could not be saved.");
      return;
    }
    router.refresh();
  }

  const noReason = reason.trim() === "";
  return (
    <div>
      <div className="field">
        <label htmlFor="reason">Reason (kept in the activity log)</label>
        <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ minHeight: 80 }} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions stack">
        <button onClick={() => decide("APPROVED")} disabled={busy || noReason}>Approve and send for signature</button>
        <button className="secondary" onClick={() => decide("NEEDS_INFO")} disabled={busy || noReason}>Ask for more information</button>
        <button className="secondary" onClick={() => decide("REJECTED")} disabled={busy || noReason}>Decline</button>
      </div>
    </div>
  );
}
