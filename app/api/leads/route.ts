import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { LeadSegment, LeadStatus, EventType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { startClock } from "@/lib/sla-clocks";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const segment = searchParams.get("segment") as LeadSegment | null;
  const status = searchParams.get("status") as LeadStatus | null;
  const agentId = searchParams.get("agentId");
  const q = searchParams.get("q");

  const where = {
    deletedAt: null,
    isActive: true,
    ...(segment ? { segment } : {}),
    ...(status ? { status } : {}),
    ...(agentId ? { agentId } : {}),
    ...(q ? { code: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        agent: { select: { id: true, name: true } },
        slaClocks: { where: { deletedAt: null }, select: { clockType: true, status: true, dueAt: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
  });
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    code,
    segment,
    dealValue,
    agentId,
    promiseTatDays,
    pfcAmount,
    tokenAmount,
    tdsAmount,
    sellerName,
    buyerName,
    propertyAddress,
    propertyCity,
  } = body as Record<string, unknown>;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  if (!segment || !Object.values(LeadSegment).includes(segment as LeadSegment)) {
    return NextResponse.json({ error: "segment is required and must be a valid LeadSegment" }, { status: 400 });
  }
  if (dealValue === undefined || dealValue === null) {
    return NextResponse.json({ error: "dealValue is required" }, { status: 400 });
  }

  const dealValueDecimal = new Decimal(String(dealValue));
  if (dealValueDecimal.isNaN() || dealValueDecimal.lessThan(0)) {
    return NextResponse.json({ error: "dealValue must be a non-negative number" }, { status: 400 });
  }

  const existing = await prisma.lead.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (existing) {
    return NextResponse.json({ error: `Lead code ${code} already exists` }, { status: 409 });
  }

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        code: code.trim().toUpperCase(),
        segment: segment as LeadSegment,
        dealValue: dealValueDecimal,
        agentId: typeof agentId === "string" ? agentId : undefined,
        promiseTatDays: typeof promiseTatDays === "number" ? promiseTatDays : undefined,
        pfcAmount: pfcAmount != null ? new Decimal(String(pfcAmount)) : undefined,
        tokenAmount: tokenAmount != null ? new Decimal(String(tokenAmount)) : undefined,
        tdsAmount: tdsAmount != null ? new Decimal(String(tdsAmount)) : undefined,
        sellerName: typeof sellerName === "string" ? sellerName : undefined,
        buyerName: typeof buyerName === "string" ? buyerName : undefined,
        propertyAddress: typeof propertyAddress === "string" ? propertyAddress : undefined,
        propertyCity: typeof propertyCity === "string" ? propertyCity : undefined,
      },
    });

    if (typeof promiseTatDays === "number" && promiseTatDays > 0) {
      await startClock(tx, {
        leadId: created.id,
        clockType: "OB",
        startedAt: created.createdAt,
        budgetDays: promiseTatDays,
      });
    }

    await emitEvent(tx, {
      leadId: created.id,
      actorId: actor.id,
      eventType: EventType.LEAD_CREATED,
      payload: { code: created.code, segment: created.segment, dealValue: dealValue },
    });

    return created;
  });

  return NextResponse.json(lead, { status: 201 });
}
