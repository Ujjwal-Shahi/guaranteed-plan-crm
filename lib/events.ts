import { EventType } from "@prisma/client";
import type { PrismaTransaction } from "./db";

export async function emitEvent(
  tx: PrismaTransaction,
  opts: {
    leadId?: string;
    refundId?: string;
    actorId: string;
    eventType: EventType;
    payload?: object;
  }
) {
  await tx.event.create({
    data: {
      leadId: opts.leadId,
      refundId: opts.refundId,
      actorId: opts.actorId,
      eventType: opts.eventType,
      payload: opts.payload ?? {},
      occurredAt: new Date(),
    },
  });
}
