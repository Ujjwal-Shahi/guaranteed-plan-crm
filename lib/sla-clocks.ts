import type { PrismaTransaction } from "./db";
import { SLA_BUDGETS, STAGE_CLOCKS, workingDaysFrom } from "./sla";

/** Starts a clock once. If one already exists for (lead, clockType) it is left untouched — dueAt is immutable. */
export async function startClock(
  tx: PrismaTransaction,
  opts: { leadId: string; clockType: string; startedAt: Date; budgetDays?: number }
) {
  const existing = await tx.slaClock.findUnique({
    where: { leadId_clockType: { leadId: opts.leadId, clockType: opts.clockType } },
  });
  if (existing) return existing;

  const days = opts.budgetDays ?? SLA_BUDGETS[opts.clockType] ?? 0;
  return tx.slaClock.create({
    data: {
      leadId: opts.leadId,
      clockType: opts.clockType,
      startedAt: opts.startedAt,
      dueAt: workingDaysFrom(opts.startedAt, days),
    },
  });
}

/** Completes the clock for a stage that just got its date, then starts the next stage's clock. */
export async function advanceClocks(
  tx: PrismaTransaction,
  leadId: string,
  stageField: string,
  at: Date
) {
  const step = STAGE_CLOCKS[stageField];
  if (!step) return;

  await tx.slaClock.updateMany({
    where: { leadId, clockType: step.completes, completedAt: null, deletedAt: null },
    data: { completedAt: at, status: "DONE" },
  });
  if (step.starts) {
    await startClock(tx, { leadId, clockType: step.starts, startedAt: at });
  }
}
