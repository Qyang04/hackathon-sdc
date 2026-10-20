// Simulated Orbyte connections. Owner: Workstream B.
// Nothing here talks to a real Orbyte system; every adapter returns seeded data and the UI labels it "Simulated".
// The interfaces show how the Copilot would plug into Orbyte's hub (Work/Projects, Connect accounting & payments, eSign).
import type { CashEventInput, RecurringCostInput } from "../engine/types";

export interface OrbyteProjectsAdapter {
  listActiveProjects(): Promise<{ id: string; name: string; client: string; status: string }[]>;
}

export interface OrbyteAccountingAdapter {
  /** Payables, receivables and payroll as dated cash events (Connect: accounting & payroll, payments & collections). */
  listCashEvents(): Promise<CashEventInput[]>;
  listRecurringCosts(): Promise<RecurringCostInput[]>;
}

export interface OrbyteESignAdapter {
  /** Outcome action after approval: send the acceptance for e-signature. */
  sendForSignature(input: { requestId: string; title: string; client: string }): Promise<{ envelopeId: string; simulated: true }>;
}

export const simulatedESign: OrbyteESignAdapter = {
  async sendForSignature({ requestId }) {
    return { envelopeId: `SIM-ESIGN-${requestId.slice(-6).toUpperCase()}`, simulated: true };
  },
};

// TODO(B): seeded implementations of OrbyteProjectsAdapter and OrbyteAccountingAdapter backed by Prisma.
