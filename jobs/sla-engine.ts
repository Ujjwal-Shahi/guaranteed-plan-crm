/**
 * SLA engine — runs every 5 minutes via Cloud Scheduler.
 * Recomputes status on all open SlaClocks and flips leads to OVERDUE/BLOCKED.
 * Idempotent: safe to re-run at any time.
 */
import { prisma } from "@/lib/db";
import { workingDaysBetween, DUE_SOON_THRESHOLD } from "@/lib/sla";
import type { SlaStatus } from "@prisma/client";

async function run() {
  const now = new Date();
  const openClocks = await prisma.slaClock.findMany({
    where: {
      completedAt: null,
      deletedAt: null,
    },
  });

  console.log(`[sla-engine] Processing ${openClocks.length} open clocks`);

  for (const clock of openClocks) {
    let newStatus: SlaStatus;

    if (clock.dueAt <= now) {
      newStatus = clock.blockedBy ? "BLOCKED" : "OVERDUE";
    } else {
      const daysLeft = workingDaysBetween(now, clock.dueAt);
      newStatus = daysLeft <= DUE_SOON_THRESHOLD ? "DUE_SOON" : "ON_TRACK";
    }

    if (newStatus !== clock.status) {
      await prisma.slaClock.update({
        where: { id: clock.id },
        data: { status: newStatus },
      });
    }
  }

  console.log(`[sla-engine] Done at ${now.toISOString()}`);
}

run().catch((err) => {
  console.error("[sla-engine] Fatal error:", err);
  process.exit(1);
});
