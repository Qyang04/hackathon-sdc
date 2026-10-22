// Writes the demo company (src/lib/demo/data.ts) into the database, replacing everything.
// Used by `npm run db:seed` / `db:reset` and by the demo reset endpoint.
import type { PrismaClient } from "@prisma/client";
import { DEMO_COMPANY, DEMO_EVENTS, DEMO_PROJECTS, DEMO_RECURRING } from "./data";

export async function seedDemo(prisma: PrismaClient, actor = "system"): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Children before parents
    await tx.activityLog.deleteMany();
    await tx.decision.deleteMany();
    await tx.forecastRun.deleteMany();
    await tx.cashEvent.deleteMany();
    await tx.commitmentRequest.deleteMany();
    await tx.recurringCost.deleteMany();
    await tx.project.deleteMany();
    await tx.companySettings.deleteMany();

    await tx.companySettings.create({ data: { id: 1, ...DEMO_COMPANY } });

    const projectIds = new Map<string, string>();
    for (const { key, ...p } of DEMO_PROJECTS) {
      const created = await tx.project.create({ data: p });
      projectIds.set(key, created.id);
    }

    await tx.cashEvent.createMany({
      data: DEMO_EVENTS.map(({ key, projectKey, paidSen, ...e }) => ({
        ...e,
        projectId: projectKey ? projectIds.get(projectKey)! : null,
        paidSen: paidSen ?? 0,
        source: "SEEDED",
        sourceRef: key,
      })),
    });

    await tx.recurringCost.createMany({ data: DEMO_RECURRING.map((r) => ({ ...r, endDate: r.endDate ?? null })) });

    await tx.activityLog.create({ data: { actor, action: "SEED_RESET", detail: "Demo data reset (synthetic company)" } });
  }, { maxWait: 10_000, timeout: 20_000 }); // above Prisma's 2 s / 5 s defaults: Replit Postgres may be waking from sleep
}
