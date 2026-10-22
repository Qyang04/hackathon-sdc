// Display helpers for the UI only. Money formatting stays in the engine (formatRM).
import { formatRM } from "@/lib/engine/money";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-12-28" -> "28 Dec 2026" (or "28 Dec" with year=false). String-based, so no timezone shift. */
export function prettyDate(iso: string, year = true): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}${year ? ` ${y}` : ""}`;
}

/** "RM 37,000.00" -> "RM 37,000" when the sen part is zero; keeps sen otherwise. */
export function shortRM(sen: number): string {
  return sen % 100 === 0 ? formatRM(sen).replace(/\.00$/, "") : formatRM(sen);
}

export function prettyTime(d: Date): string {
  return d.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
