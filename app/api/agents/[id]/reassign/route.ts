import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { EventType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { distributeLeads } from "@/lib/assignment";

const OPEN_LEAD = { status: "ACTIVE" as const, isActive: true, deletedAt: null };

/**
 * Moves an agent's open leads to one or more active agents, spread by current load.
 * Without confirm:true it only previews. Closed, cancelled and refund leads never move.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  const source = await prisma.agent.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!source) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const toAgentIds = Array.isArray(body.toAgentIds)
    ? Array.from(new Set(body.toAgentIds.filter((x): x is string => typeof x === "string")))
    : [];
  if (toAgentIds.length === 0 || toAgentIds.includes(source.id)) {
    return NextResponse.json({ error: "Choose one or more target agents other than the source" }, { status: 400 });
  }

  const targets = await prisma.agent.findMany({
    where: { id: { in: toAgentIds }, isActive: true, deletedAt: null, status: "ACTIVE" },
  });
  if (targets.length !== toAgentIds.length) {
    return NextResponse.json({ error: "Every target must be an active agent who is not on leave" }, { status: 400 });
  }

  const [leads, loads] = await Promise.all([
    prisma.lead.findMany({ where: { agentId: source.id, ...OPEN_LEAD }, orderBy: { createdAt: "asc" }, select: { id: true } }),
    prisma.lead.groupBy({ by: ["agentId"], where: { agentId: { in: toAgentIds }, ...OPEN_LEAD }, _count: { _all: true } }),
  ]);
  const loadOf = new Map(loads.map((g) => [g.agentId, g._count._all]));

  const plan = distributeLeads(
    leads.map((l) => l.id),
    targets.map((t) => ({ id: t.id, load: loadOf.get(t.id) ?? 0, capacity: t.capacity }))
  );
  const nameOf = new Map(targets.map((t) => [t.id, t.name]));
  const preview = {
    total: leads.length,
    perTarget: plan.perTarget.map((t) => ({ ...t, name: nameOf.get(t.agentId) ?? "" })),
  };

  if (body.confirm !== true) {
    return NextResponse.json({ confirmed: false, ...preview });
  }

  let moved = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const a of plan.assignments) {
        const res = await tx.lead.updateMany({
          where: { id: a.leadId, agentId: source.id, ...OPEN_LEAD },
          data: { agentId: a.toAgentId },
        });
        if (res.count === 1) {
          moved++;
          await emitEvent(tx, {
            leadId: a.leadId,
            actorId: actor.id,
            eventType: EventType.LEAD_ASSIGNED,
            payload: { from: source.id, to: a.toAgentId, reason: "bulk_reassign" },
          });
        }
      }
    },
    { timeout: 120000, maxWait: 10000 }
  );

  return NextResponse.json({ confirmed: true, moved, ...preview });
}
