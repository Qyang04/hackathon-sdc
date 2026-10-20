// Seed data for the demo. Owner: Workstream A.
// TODO(A): replace this minimal example with the agreed, internally consistent demo company
// (3 projects, company recurring costs, at least one PAID and one unpaid committed event,
// one overdue unpaid event, and a proposal that dips below the reserve only in the downside case).
// Every figure here is synthetic. Keep a hand calculation of the expected results in docs/test-cases.md.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.forecastRun.deleteMany();
  await prisma.cashEvent.deleteMany();
  await prisma.commitmentRequest.deleteMany();
  await prisma.recurringCost.deleteMany();
  await prisma.project.deleteMany();
  await prisma.companySettings.deleteMany();

  await prisma.companySettings.create({
    data: {
      id: 1,
      companyName: "Contoh Renovation Sdn Bhd (synthetic)",
      openingCashSen: 8_000_000, // RM 80,000.00
      openingDate: "2026-11-02",
      reserveSen: 2_000_000, // RM 20,000.00
      approvalThresholdSen: 3_000_000, // RM 30,000.00
      customerDelayDays: 14,
    },
  });

  await prisma.recurringCost.create({
    data: { label: "Payroll", amountSen: 2_400_000, frequency: "MONTHLY", nextDate: "2026-11-28" },
  });

  const p1 = await prisma.project.create({
    data: {
      name: "Shoplot renovation, Jalan Example",
      client: "Example Cafe (synthetic)",
      status: "ACTIVE",
      startDate: "2026-10-01",
      endDate: "2026-12-15",
      contractValueSen: 12_000_000,
    },
  });

  await prisma.cashEvent.createMany({
    data: [
      {
        projectId: p1.id, direction: "OUT", amountSen: 1_500_000, date: "2026-11-09",
        status: "COMMITTED", confidence: "CONFIRMED", counterparty: "Tile supplier (synthetic)",
        label: "Tiles PO balance", source: "SEEDED",
      },
      {
        projectId: p1.id, direction: "IN", amountSen: 4_000_000, date: "2026-11-20",
        status: "PLANNED", confidence: "ESTIMATED", counterparty: "Example Cafe (synthetic)",
        label: "Progress claim 2", source: "SEEDED",
      },
    ],
  });

  await prisma.activityLog.create({
    data: { actor: "system", action: "SEED_RESET", detail: "Demo data reset" },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
