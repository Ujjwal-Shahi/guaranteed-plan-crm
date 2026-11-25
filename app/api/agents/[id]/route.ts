import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { EventType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agent = await prisma.agent.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      backupAgent: { select: { id: true, name: true } },
      leaves: { where: { deletedAt: null }, orderBy: { startDate: "desc" }, take: 20 },
    },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  return NextResponse.json(agent);
}

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

  const agent = await prisma.agent.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if ("email" in body) {
    return NextResponse.json({ error: "email cannot be changed" }, { status: 400 });
  }

  const now = new Date();

  if (body.action === "deactivate" || body.action === "reactivate") {
    const deactivating = body.action === "deactivate";
    if (deactivating && !agent.isActive) {
      return NextResponse.json({ error: "Agent is already deactivated" }, { status: 409 });
    }
    if (!deactivating && agent.isActive) {
      return NextResponse.json({ error: "Agent is already active" }, { status: 409 });
    }
    if (deactivating && agent.id === actor.id) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
    }

    const openLeads = await prisma.lead.count({
      where: { agentId: agent.id, status: "ACTIVE", isActive: true, deletedAt: null },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.agent.update({
        where: { id: agent.id },
        data: deactivating
          ? { isActive: false, status: "EXITED", exitedAt: now }
          : { isActive: true, status: "ACTIVE", exitedAt: null },
      });
      await emitEvent(tx, {
        actorId: actor.id,
        eventType: deactivating ? EventType.AGENT_DEACTIVATED : EventType.AGENT_UPDATED,
        payload: { agentId: agent.id, openLeads, ...(deactivating ? {} : { reactivated: true }) },
      });
      return result;
    });
    return NextResponse.json({ ...updated, openLeadsNeedingCover: deactivating ? openLeads : 0 });
  }

  const data: Record<string, unknown> = {};
  const changed: string[] = [];

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
    changed.push("name");
  }
  for (const f of ["team", "role", "noBrokerLogin"] as const) {
    if (f in body) {
      data[f] = typeof body[f] === "string" && (body[f] as string).trim() ? (body[f] as string).trim() : null;
      changed.push(f);
    }
  }
  if ("capacity" in body) {
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      return NextResponse.json({ error: "capacity must be a whole number of at least 1" }, { status: 400 });
    }
    data.capacity = capacity;
    changed.push("capacity");
  }
  if ("backupAgentId" in body) {
    const id = typeof body.backupAgentId === "string" && body.backupAgentId ? body.backupAgentId : null;
    if (id) {
      if (id === agent.id) return NextResponse.json({ error: "An agent cannot back up themselves" }, { status: 400 });
      const backup = await prisma.agent.findFirst({ where: { id, isActive: true, deletedAt: null } });
      if (!backup) return NextResponse.json({ error: "backupAgentId is not an active agent" }, { status: 400 });
    }
    data.backupAgentId = id;
    changed.push("backupAgentId");
  }

  if (changed.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (typeof data.noBrokerLogin === "string") {
    const clash = await prisma.agent.findFirst({ where: { noBrokerLogin: data.noBrokerLogin, NOT: { id: agent.id } } });
    if (clash) return NextResponse.json({ error: "That NoBroker login is already in use" }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.agent.update({ where: { id: agent.id }, data });
    await emitEvent(tx, {
      actorId: actor.id,
      eventType: EventType.AGENT_UPDATED,
      payload: { agentId: agent.id, fields: changed },
    });
    return result;
  });
  return NextResponse.json(updated);
}
