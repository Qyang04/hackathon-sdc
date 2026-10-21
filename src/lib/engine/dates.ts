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

/** Number of days in a month (month 1-12). Day 0 of the next month is the last day of this one. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Same day of the month, `months` later, capped at that month's last day.
 * Always count from the original date: 2027-01-31 + 1 = 2027-02-28, + 2 = 2027-03-31.
 */
export function addMonthsCapped(d: ISODate, months: number): ISODate {
  assertISODate(d);
  const [y, m, day] = d.split("-").map(Number);
  const index = y * 12 + (m - 1) + months; // months since year 0, so December + 1 rolls into January
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const cappedDay = Math.min(day, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(cappedDay).padStart(2, "0")}`;
}
