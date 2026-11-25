/**
 * Seeds the database from leads_seed.json (masked data only — no real PII).
 * Run: npm run db:seed
 */
import { prisma } from "@/lib/db";

async function main() {
  console.log("[seed] Seeding database with masked test data…");

  // Create a system actor used for seeded events
  const systemAgent = await prisma.agent.upsert({
    where: { email: "system@nobroker.in" },
    update: {},
    create: {
      name: "System",
      email: "system@nobroker.in",
      noBrokerLogin: "system",
      team: "ops",
      role: "admin",
      status: "ACTIVE",
    },
  });

  console.log(`[seed] System agent: ${systemAgent.id}`);
  console.log("[seed] Done. Add leads_seed.json import in M7.");
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
