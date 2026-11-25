import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { EventType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { isAwaitingDecision, nextCallDueAfter } from "@/lib/refunds";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = await prisma.agent.findUnique({
    where: { email: session.user.email, isActive: true, deletedAt: null },
  });
  if (!actor) {
    return NextResponse.json(
      { error: "No active agent account found for this email. Contact an admin." },
      { status: 403 }
    );
  }

  const refund = await prisma.refund.findFirst({ where: { id: params.id, deletedAt: null, isActive: true } });
  if (!refund) {
    return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  }
  if (!isAwaitingDecision(refund.status)) {
    return NextResponse.json({ error: "Calls are only tracked until a decision is made" }, { status: 409 });
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.refund.update({
      where: { id: refund.id },
      data: { lastCallAt: now, nextCallDueAt: nextCallDueAfter(now) },
    });
    await emitEvent(tx, {
      leadId: refund.leadId,
      refundId: refund.id,
      actorId: actor.id,
      eventType: EventType.REFUND_CALLED,
      payload: { nextCallDueAt: result.nextCallDueAt?.toISOString() },
    });
    return result;
  });

  return NextResponse.json(updated);
}
