/**
 * Flips agents to ON_LEAVE when a leave starts and back to ACTIVE when it ends.
 * Idempotent. Runs alongside the SLA engine (every 5 minutes).
 */
import { prisma } from "@/lib/db";
import { applyLeaveState } from "@/lib/leave";

export async function runLeaveSync(now = new Date()) {
  const candidates = await prisma.agent.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { status: "ON_LEAVE" },
        { leaves: { some: { deletedAt: null, startDate: { lte: now }, endDate: { gte: now } } } },
      ],
    },
    select: { id: true },
  });

  let started = 0;
  let ended = 0;
  for (const { id } of candidates) {
    const result = await prisma.$transaction((tx) => applyLeaveState(tx, id, now));
    if (result === "started") started++;
    if (result === "ended") ended++;
  }
  return { checked: candidates.length, started, ended };
}

if (require.main === module) {
  runLeaveSync()
    .then((r) => console.log(`[leave-sync] checked=${r.checked} started=${r.started} ended=${r.ended}`))
    .catch((err) => {
      console.error("[leave-sync] Fatal error:", err instanceof Error ? err.message : "unknown");
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
