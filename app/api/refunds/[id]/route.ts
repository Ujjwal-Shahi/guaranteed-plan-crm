import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { EventType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { REFUND_ACTIONS, resolveRefundAction, type RefundAction } from "@/lib/refunds";
import { startClock } from "@/lib/sla-clocks";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const refund = await prisma.refund.findFirst({
    where: { id: params.id, deletedAt: null, isActive: true },
    include: {
      lead: { select: { id: true, code: true, segment: true, status: true, agent: { select: { name: true } } } },
      events: {
        orderBy: { occurredAt: "desc" },
        take: 50,
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });
  if (!refund) {
    return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  }
  return NextResponse.json(refund);
}

const AMOUNT_FIELDS = ["bmAmount", "holdingAmount", "refundAmount", "penaltyAmount"] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const field of AMOUNT_FIELDS) {
    if (field in body) {
      if (body[field] === null || body[field] === "") {
        data[field] = null;
      } else {
        let d: Decimal;
        try {
          d = new Decimal(String(body[field]));
        } catch {
          return NextResponse.json({ error: `${field} must be a number` }, { status: 400 });
        }
        if (d.isNaN() || d.lessThan(0)) {
          return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 });
        }
        data[field] = d;
      }
      changedFields.push(field);
    }
  }
  for (const field of ["reason", "refundType"] as const) {
    if (field in body) {
      data[field] = body[field] != null ? String(body[field]) : null;
      changedFields.push(field);
    }
  }

  const action = body.action as RefundAction | undefined;
  let transition: ReturnType<typeof resolveRefundAction> = null;
  const now = new Date();

  if (action !== undefined) {
    if (!REFUND_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    transition = resolveRefundAction(refund.status, action);
    if (!transition) {
      return NextResponse.json(
        { error: `Cannot ${action} a refund that is ${refund.status}` },
        { status: 409 }
      );
    }
    if (action === "deny") {
      if (body.denialMailLogged !== true && !refund.denialMailLoggedAt) {
        return NextResponse.json(
          { error: "Log the denial mail before denying (denialMailLogged: true)" },
          { status: 400 }
        );
      }
      data.denialMailLoggedAt = refund.denialMailLoggedAt ?? now;
    }
    data.status = transition.to;
    if (action === "initiate") data.initiatedAt = now;
    if (action === "credit") data.creditedAt = now;
    if (action === "approve" || action === "deny") data.nextCallDueAt = null;
  }

  if (!transition && changedFields.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.refund.update({ where: { id: refund.id }, data });

    if (transition) {
      if (action === "approve") {
        await startClock(tx, { leadId: refund.leadId, clockType: "REFUND_INITIATION", startedAt: now });
      }
      if (action === "initiate") {
        await tx.slaClock.updateMany({
          where: { leadId: refund.leadId, clockType: "REFUND_INITIATION", completedAt: null, deletedAt: null },
          data: { completedAt: now, status: "DONE" },
        });
      }
      await emitEvent(tx, {
        leadId: refund.leadId,
        refundId: refund.id,
        actorId: actor.id,
        eventType: EventType[transition.event],
        payload: { from: refund.status, to: transition.to },
      });
    }
    if (changedFields.length > 0) {
      await emitEvent(tx, {
        leadId: refund.leadId,
        refundId: refund.id,
        actorId: actor.id,
        eventType: EventType.REFUND_UPDATED,
        payload: { fields: changedFields },
      });
    }
    return result;
  });

  return NextResponse.json(updated);
}
