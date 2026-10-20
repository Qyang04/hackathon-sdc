import type { Sen } from "./types";

/** Parse "12,345.60" or "12345.6" (RM) into integer sen. Throws on invalid input. */
export function rmToSen(input: string): Sen {
  const clean = input.replace(/[,\s]/g, "").replace(/^RM/i, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) throw new Error(`Invalid RM amount: "${input}"`);
  const negative = clean.startsWith("-");
  const [whole, frac = ""] = clean.replace("-", "").split(".");
  const sen = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return negative ? -sen : sen;
}

/** Format integer sen as "RM 12,345.60". */
export function formatRM(sen: Sen): string {
  if (!Number.isInteger(sen)) throw new Error(`Sen must be an integer, got ${sen}`);
  const sign = sen < 0 ? "-" : "";
  const abs = Math.abs(sen);
  const whole = Math.floor(abs / 100).toLocaleString("en-MY");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}RM ${whole}.${frac}`;
}
