"use client";
// One click runs the whole chain: a quotation arrives from Orbyte Sales (POST /api/auto-check), the check runs
// (POST the forecast path it returns: validate -> three scenarios -> rules -> brief -> save -> email the owner),
// then the result page opens. Each step is the normal API, so the owner still decides on the result page.
import { useState } from "react";
import { useRouter } from "next/navigation";

const STEP_TEXT = ["Quotation arriving from Orbyte Sales…", "Checking cash and rules…"];

export function SimulateQuotationButton() {
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setStep(0);
    const created = await fetch("/api/auto-check", { method: "POST" });
    if (!created.ok) {
      setStep(null);
      setError((await created.json().catch(() => ({}))).error ?? "The quotation could not be received.");
      return;
    }
    const { request, check } = (await created.json()) as { request: { id: string }; check: { method: string; path: string } };

    setStep(1);
    const checked = await fetch(check.path, { method: check.method });
    setStep(null);
    if (!checked.ok) {
      // The job exists; open it so the check can be run again from there
      setError((await checked.json().catch(() => ({}))).error ?? "The check could not run.");
    }
    router.push(`/requests/${request.id}`);
    router.refresh();
  }

  return (
    <>
      <button type="button" className="secondary" onClick={run} disabled={step !== null} title="Simulated: a new quotation lands in Orbyte Sales and is checked automatically">
        {step === null ? "Simulate quotation from Orbyte Sales" : `${step + 1}/2 ${STEP_TEXT[step]}`}
      </button>
      {error && <span className="error">{error}</span>}
    </>
  );
}
