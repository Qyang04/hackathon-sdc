"use client";
// Edits the three owner settings. RM is typed by the person and converted to integer sen with rmToSen;
// the server validates again (PATCH /api/settings) and logs the change.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { rmToSen } from "@/lib/engine/money";
import type { SettingRow } from "../how/explain";

type Values = { reserveSen: number; approvalThresholdSen: number; customerDelayDays: number };

const MAX_DELAY_DAYS = 90;

function senToInput(sen: number): string {
  return sen % 100 === 0 ? String(sen / 100) : (sen / 100).toFixed(2);
}

export function SettingsForm({ rows, initial }: { rows: SettingRow[]; initial: Values }) {
  const router = useRouter();
  const [reserve, setReserve] = useState(senToInput(initial.reserveSen));
  const [threshold, setThreshold] = useState(senToInput(initial.approvalThresholdSen));
  const [delay, setDelay] = useState(String(initial.customerDelayDays));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const text = Object.fromEntries(rows.map((r) => [r.key, r]));

  function parse(): Values | string {
    let reserveSen: number, approvalThresholdSen: number;
    try {
      reserveSen = rmToSen(reserve);
      approvalThresholdSen = rmToSen(threshold);
    } catch {
      return "Enter amounts in RM, for example 30000 or 30,000.50.";
    }
    if (reserveSen < 0 || approvalThresholdSen < 0) return "Amounts cannot be negative.";
    if (!/^\d+$/.test(delay.trim())) return "Customer delay must be a whole number of days.";
    const customerDelayDays = Number(delay);
    if (customerDelayDays > MAX_DELAY_DAYS) return `Customer delay can be at most ${MAX_DELAY_DAYS} days.`;
    return { reserveSen, approvalThresholdSen, customerDelayDays };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const values = parse();
    if (typeof values === "string") {
      setError(values);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "The settings could not be saved.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <div className="field">
        <label htmlFor="reserve">{text.reserveSen?.label} (RM)</label>
        <input id="reserve" inputMode="decimal" value={reserve} onChange={(e) => setReserve(e.target.value)} required />
        <span className="small muted">{text.reserveSen?.whatItDoes} {text.reserveSen?.zeroMeans}</span>
      </div>
      <div className="field">
        <label htmlFor="threshold">{text.approvalThresholdSen?.label} (RM)</label>
        <input id="threshold" inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} required />
        <span className="small muted">{text.approvalThresholdSen?.whatItDoes} {text.approvalThresholdSen?.zeroMeans}</span>
      </div>
      <div className="field">
        <label htmlFor="delay">{text.customerDelayDays?.label} (days, 0–{MAX_DELAY_DAYS})</label>
        <input id="delay" type="number" min={0} max={MAX_DELAY_DAYS} step={1} value={delay} onChange={(e) => setDelay(e.target.value)} required />
        <span className="small muted">{text.customerDelayDays?.whatItDoes} {text.customerDelayDays?.zeroMeans}</span>
      </div>
      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
      </div>
      {error && <p className="error">{error}</p>}
      {saved && <p className="small">Saved. Jobs already checked must be checked again before the owner can approve them.</p>}
    </form>
  );
}
