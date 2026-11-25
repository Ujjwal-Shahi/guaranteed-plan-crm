/**
 * SLA engine — runs every 5 minutes via Cloud Scheduler.
 * Recomputes status on open SlaClocks. Never writes dueAt. Idempotent.
 */
import { EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { computeSlaStatus } from "@/lib/sla";

export async function runSlaEngine(now = new Date()) {
  const openClocks = await prisma.slaClock.findMany({
    where: {
      completedAt: null,
      deletedAt: null,
      lead: { deletedAt: null, isActive: true, status: "ACTIVE" },
    },
    include: { lead: { select: { id: true, agentId: true } } },
  });

  let changed = 0;
  for (const clock of openClocks) {
    const next = computeSlaStatus(clock, now);
    if (next === clock.status) continue;

    await prisma.$transaction(async (tx) => {
      await tx.slaClock.update({ where: { id: clock.id }, data: { status: next } });

      const eventType =
        next === "OVERDUE" ? EventType.SLA_OVERDUE : next === "BLOCKED" ? EventType.SLA_BLOCKED : null;
      if (eventType && clock.lead.agentId) {
        await emitEvent(tx, {
          leadId: clock.lead.id,
          actorId: clock.lead.agentId,
          eventType,
          payload: { clockType: clock.clockType, from: clock.status, to: next },
        });
      }
    });
    changed++;
  }

  return { processed: openClocks.length, changed };
}

if (require.main === module) {
  runSlaEngine()
    .then((r) => console.log(`[sla-engine] processed=${r.processed} changed=${r.changed}`))
    .catch((err) => {
      console.error("[sla-engine] Fatal error:", err instanceof Error ? err.message : "unknown");
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
