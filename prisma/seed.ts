// Seed data for the demo. Owner: Workstream A.
// The demo company itself lives in src/lib/demo/data.ts (shared with the reset endpoint and the demo-story test).
// Every figure is synthetic.
import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../src/lib/demo/seed";

const prisma = new PrismaClient();

seedDemo(prisma)
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
