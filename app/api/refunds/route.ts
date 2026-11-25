import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { EventType, RefundStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { nextCallDueAfter } from "@/lib/refunds";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const status = searchParams.get("status") as RefundStatus | null;
  const leadId = searchParams.get("leadId");
  const callsDue = searchParams.get("queue") === "calls-due";

  if (status && !Object.values(RefundStatus).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const where = {
    deletedAt: null,
    isActive: true,
    ...(status ? { status } : {}),
    ...(leadId ? { leadId } : {}),
    ...(callsDue ? { status: RefundStatus.RAISED, nextCallDueAt: { lte: new Date() } } : {}),
  };

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: callsDue ? { nextCallDueAt: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { lead: { select: { id: true, code: true, segment: true, agent: { select: { name: true } } } } },
    }),
    prisma.refund.count({ where }),
  ]);

  return NextResponse.json({
    refunds,
    pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
  });
}

function parseAmount(value: unknown): Decimal | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  try {
    const d = new Decimal(String(value));
    return d.isNaN() || d.lessThan(0) ? "invalid" : d;
  } catch {
    return "invalid";
  }
}

export async function POST(req: NextRequest) {
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const leadCode = typeof body.leadCode === "string" ? body.leadCode.trim().toUpperCase() : "";
  if (!leadCode) {
    return NextResponse.json({ error: "leadCode is required" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const bmAmount = parseAmount(body.bmAmount);
  const holdingAmount = parseAmount(body.holdingAmount);
  const refundAmount = parseAmount(body.refundAmount);
  if ([bmAmount, holdingAmount, refundAmount].includes("invalid")) {
    return NextResponse.json({ error: "Amounts must be non-negative numbers" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({ where: { code: leadCode, deletedAt: null, isActive: true } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (lead.status !== "ACTIVE") {
    return NextResponse.json({ error: "Only active leads can be cancelled for refund" }, { status: 409 });
  }

  const now = new Date();
  const refund = await prisma.$transaction(async (tx) => {
    const created = await tx.refund.create({
      data: {
        leadId: lead.id,
        reason,
        refundType: typeof body.refundType === "string" ? body.refundType : undefined,
        bmAmount: bmAmount as Decimal | null,
        holdingAmount: holdingAmount as Decimal | null,
        refundAmount: refundAmount as Decimal | null,
        nextCallDueAt: nextCallDueAfter(now),
      },
    });

    await tx.lead.update({ where: { id: lead.id }, data: { status: "CANCELLED" } });

    await emitEvent(tx, {
      leadId: lead.id,
      actorId: actor.id,
      eventType: EventType.LEAD_CANCELLED,
      payload: { reason, refundId: created.id },
    });
    await emitEvent(tx, {
      leadId: lead.id,
      refundId: created.id,
      actorId: actor.id,
      eventType: EventType.REFUND_RAISED,
      payload: { reason },
    });
    return created;
  });

  return NextResponse.json(refund, { status: 201 });
}
