"use client";
// Runs (or re-runs) the check from the request page, then reloads the server-rendered result.
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunCheckButton({ requestId, label }: { requestId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/requests/${requestId}/forecast`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "The check could not run.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button onClick={run} disabled={busy}>{busy ? "Checking…" : label}</button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
