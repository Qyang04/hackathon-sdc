import type { ISODate } from "./types";

// Calendar-date helpers. All arithmetic is in UTC on date-only values, so no timezone drift.

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function assertISODate(d: string): asserts d is ISODate {
  if (!ISO.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) {
    throw new Error(`Invalid date "${d}", expected YYYY-MM-DD`);
  }
}

export function addDays(d: ISODate, days: number): ISODate {
  assertISODate(d);
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  assertISODate(a);
  assertISODate(b);
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Monday of the week containing d. */
export function weekStart(d: ISODate): ISODate {
  assertISODate(d);
  const day = new Date(`${d}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(d, day === 0 ? -6 : 1 - day);
}
