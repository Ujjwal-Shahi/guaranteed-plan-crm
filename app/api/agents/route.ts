import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { EventType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { getAgentLoads } from "@/lib/manpower";

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN ?? "nobroker.in";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "1";
  return NextResponse.json({ agents: await getAgentLoads({ includeInactive }) });
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return NextResponse.json({ error: `email must be a @${ALLOWED_DOMAIN} address` }, { status: 400 });
  }

  const capacity = body.capacity === undefined ? 50 : Number(body.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) {
    return NextResponse.json({ error: "capacity must be a whole number of at least 1" }, { status: 400 });
  }

  const noBrokerLogin = typeof body.noBrokerLogin === "string" && body.noBrokerLogin.trim() ? body.noBrokerLogin.trim() : null;
  const backupAgentId = typeof body.backupAgentId === "string" && body.backupAgentId ? body.backupAgentId : null;
  if (backupAgentId) {
    const backup = await prisma.agent.findFirst({ where: { id: backupAgentId, isActive: true, deletedAt: null } });
    if (!backup) return NextResponse.json({ error: "backupAgentId is not an active agent" }, { status: 400 });
  }

  const clash = await prisma.agent.findFirst({
    where: { OR: [{ email }, ...(noBrokerLogin ? [{ noBrokerLogin }] : [])] },
  });
  if (clash) {
    return NextResponse.json({ error: "An agent with this email or login already exists" }, { status: 409 });
  }

  const agent = await prisma.$transaction(async (tx) => {
    const created = await tx.agent.create({
      data: {
        name,
        email,
        noBrokerLogin,
        team: typeof body.team === "string" && body.team.trim() ? body.team.trim() : null,
        role: typeof body.role === "string" && body.role.trim() ? body.role.trim() : null,
        capacity,
        backupAgentId,
      },
    });
    await emitEvent(tx, {
      actorId: actor.id,
      eventType: EventType.AGENT_CREATED,
      payload: { agentId: created.id, team: created.team, role: created.role },
    });
    return created;
  });

  return NextResponse.json(agent, { status: 201 });
}
