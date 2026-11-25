import { fromZonedTime } from "date-fns-tz";
import { EventType } from "@prisma/client";
import type { PrismaTransaction } from "./db";
import { emitEvent } from "./events";

const IST = "Asia/Kolkata";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value) && !isNaN(Date.parse(value));
}

/** First instant of the given calendar day in IST, as a UTC Date. */
export function istDayStart(day: string): Date {
  return fromZonedTime(`${day}T00:00:00.000`, IST);
}

/** Last instant of the given calendar day in IST, as a UTC Date. */
export function istDayEnd(day: string): Date {
  return fromZonedTime(`${day}T23:59:59.999`, IST);
}

export function leaveActiveAt(leaves: { startDate: Date; endDate: Date }[], now: Date): boolean {
  return leaves.some((l) => l.startDate <= now && now <= l.endDate);
}

export function leavesOverlap(
  a: { startDate: Date; endDate: Date },
  b: { startDate: Date; endDate: Date }
): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

/** Brings an agent's status in line with their leave dates. Returns what changed. */
export async function applyLeaveState(
  tx: PrismaTransaction,
  agentId: string,
  now: Date,
  actorId: string = agentId
): Promise<"started" | "ended" | null> {
  const agent = await tx.agent.findUnique({ where: { id: agentId } });
  if (!agent || !agent.isActive || agent.deletedAt || agent.status === "EXITED") return null;

  const leaves = await tx.agentLeave.findMany({ where: { agentId, deletedAt: null } });
  const onLeave = leaveActiveAt(leaves, now);

  if (onLeave && agent.status === "ACTIVE") {
    await tx.agent.update({ where: { id: agentId }, data: { status: "ON_LEAVE" } });
    await emitEvent(tx, { actorId, eventType: EventType.LEAVE_STARTED, payload: { agentId } });
    return "started";
  }
  if (!onLeave && agent.status === "ON_LEAVE") {
    await tx.agent.update({ where: { id: agentId }, data: { status: "ACTIVE" } });
    await emitEvent(tx, { actorId, eventType: EventType.LEAVE_ENDED, payload: { agentId } });
    return "ended";
  }
  return null;
}
