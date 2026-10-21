// Request body shapes shared by /api/requests routes. Shape check only; business rules live in validateRequest (A).
import { z } from "zod";

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
export const Sen = z.number().int().nonnegative();

/** A payment entered by a person (not AI); saved with source MANUAL and confirmed = true. */
export const ManualEvent = z.object({
  direction: z.enum(["IN", "OUT"]),
  amountSen: Sen,
  offsetDays: z.number().int().nonnegative(),
  confidence: z.enum(["CONFIRMED", "ESTIMATED"]),
  counterparty: z.string().trim().min(1),
  label: z.string().trim().min(1),
});
