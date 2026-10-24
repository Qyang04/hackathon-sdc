// Request body shapes for /api/auto-check. Shape check only; business rules live in validateRequest (A).
// Reuses the payment shape staff type by hand, because a simulated Sales integration delivers the
// same structured fields (see docs/CONTRACTS.md, POST /api/auto-check).
import { z } from "zod";
import { IsoDate, ManualEvent, Sen } from "../requests/schemas";

export const QuotationPayload = z.object({
  title: z.string().trim().min(1),
  client: z.string().trim().min(1),
  startDate: IsoDate,
  durationDays: z.number().int().positive(),
  contractValueSen: Sen,
  budgetSen: Sen,
  justification: z.string().default(""),
  sourceText: z.string().default(""),
  events: z.array(ManualEvent).min(1),
}).strict();
