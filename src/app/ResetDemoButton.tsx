"use client";
// Owner-only: reload the synthetic demo company. Asks once on the page before deleting anything
// (the server checks the role again).
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetDemoButton() {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reset", { method: "POST" });
    setBusy(false);
    setAsking(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "The demo data could not be reset.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (!asking) {
    return (
      <>
        <button type="button" className="secondary" onClick={() => setAsking(true)}>Reset demo data</button>
        {error && <span className="error">{error}</span>}
      </>
    );
  }
  return (
    <span className="confirm">
      <span className="small">Delete every check and reload the demo company?</span>
      <button type="button" className="danger" onClick={reset} disabled={busy}>{busy ? "Resetting…" : "Yes, reset"}</button>
      <button type="button" className="secondary" onClick={() => setAsking(false)} disabled={busy}>Cancel</button>
    </span>
  );
}
