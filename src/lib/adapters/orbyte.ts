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

// Seeded implementations backed by Prisma (simulated Orbyte data).

import { prisma } from "../db";

export const simulatedProjects: OrbyteProjectsAdapter = {
  async listActiveProjects() {
    const projects = await prisma.project.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, client: true, status: true },
      orderBy: { startDate: "asc" },
    });
    return projects;
  },
};

export const simulatedAccounting: OrbyteAccountingAdapter = {
  async listCashEvents() {
    const events = await prisma.cashEvent.findMany({
      where: { requestId: null }, // Only existing events, not proposal events
      orderBy: { date: "asc" },
    });
    // Map to CashEventInput (date is required for existing events)
    return events
      .filter((e): e is typeof e & { date: string } => e.date !== null)
      .map((e) => ({
        id: e.id,
        projectId: e.projectId,
        direction: e.direction as "IN" | "OUT",
        amountSen: e.amountSen,
        paidSen: e.paidSen,
        date: e.date,
        status: e.status as "PLANNED" | "COMMITTED" | "PAID" | "CANCELLED",
        confidence: e.confidence as "CONFIRMED" | "ESTIMATED",
        label: e.label,
        source: e.source as "SEEDED" | "MANUAL" | "AI_EXTRACTED",
        confirmed: e.confirmed,
      }));
  },

  async listRecurringCosts() {
    const costs = await prisma.recurringCost.findMany();
    return costs.map((c) => ({
      id: c.id,
      label: c.label,
      amountSen: c.amountSen,
      frequency: c.frequency as "WEEKLY" | "MONTHLY",
      nextDate: c.nextDate,
      endDate: c.endDate,
    }));
  },
};
