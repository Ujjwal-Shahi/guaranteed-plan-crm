import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { EventType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, deletedAt: null, isActive: true },
    include: {
      agent: { select: { id: true, name: true, email: true, team: true } },
      slaClocks: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      refunds: { where: { deletedAt: null, isActive: true }, orderBy: { createdAt: "desc" } },
      mailThreads: { where: { deletedAt: null, isActive: true }, orderBy: { createdAt: "desc" } },
      events: {
        take: 50,
        orderBy: { occurredAt: "desc" },
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

const PATCHABLE_STAGE_DATES = [
  "obCompletedAt",
  "docsCollectedAt",
  "ddpPrDoneAt",
  "ddpFinalDoneAt",
  "saDetailsSharedAt",
  "saDraftDoneAt",
  "saSignedAt",
  "loanSaSharedAt",
  "loanDdReceivedAt",
  "sdDraftDoneAt",
  "registeredAt",
] as const;

const PATCHABLE_AMOUNTS = [
  "dealValue",
  "pfcAmount",
  "tokenAmount",
  "tdsAmount",
] as const;

const PATCHABLE_STRINGS = [
  "sellerName",
  "sellerEmail",
  "buyerName",
  "propertyAddress",
  "propertyCity",
  "blockedBy",
  "blockedNote",
  "ticketId",
  "agentId",
] as const;

const PATCHABLE_BOOLEANS = ["interiorPitched", "referralAsked"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, deletedAt: null, isActive: true },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Reject attempts to change immutable fields
  if ("code" in body || "segment" in body) {
    return NextResponse.json({ error: "code and segment are immutable after creation" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const field of PATCHABLE_STAGE_DATES) {
    if (field in body) {
      updateData[field] = body[field] != null ? new Date(body[field] as string) : null;
      changedFields.push(field);
    }
  }

  for (const field of PATCHABLE_AMOUNTS) {
    if (field in body) {
      updateData[field] = body[field] != null ? new Decimal(String(body[field])) : null;
      changedFields.push(field);
    }
  }

  for (const field of PATCHABLE_STRINGS) {
    if (field in body) {
      updateData[field] = body[field] != null ? String(body[field]) : null;
      changedFields.push(field);
    }
  }

  for (const field of PATCHABLE_BOOLEANS) {
    if (field in body) {
      updateData[field] = Boolean(body[field]);
      changedFields.push(field);
    }
  }

  if (changedFields.length === 0) {
    return NextResponse.json({ error: "No patchable fields provided" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.lead.update({
      where: { id: params.id },
      data: updateData,
    });

    await emitEvent(tx, {
      leadId: params.id,
      actorId: actor.id,
      eventType: EventType.LEAD_UPDATED,
      payload: { fields: changedFields },
    });

    return result;
  });

  return NextResponse.json(updated);
}
