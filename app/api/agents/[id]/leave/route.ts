import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyLeaveState, isDateString, istDayEnd, istDayStart, leavesOverlap } from "@/lib/leave";

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

  const agent = await prisma.agent.findFirst({ where: { id: params.id, isActive: true, deletedAt: null } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isDateString(body.startDate) || !isDateString(body.endDate)) {
    return NextResponse.json({ error: "startDate and endDate must be YYYY-MM-DD" }, { status: 400 });
  }
  const range = { startDate: istDayStart(body.startDate), endDate: istDayEnd(body.endDate) };
  if (range.endDate < range.startDate) {
    return NextResponse.json({ error: "endDate cannot be before startDate" }, { status: 400 });
  }

  const backupId = typeof body.backupId === "string" && body.backupId ? body.backupId : null;
  if (backupId) {
    if (backupId === agent.id) {
      return NextResponse.json({ error: "An agent cannot cover their own leave" }, { status: 400 });
    }
    const backup = await prisma.agent.findFirst({ where: { id: backupId, isActive: true, deletedAt: null } });
    if (!backup) return NextResponse.json({ error: "backupId is not an active agent" }, { status: 400 });
  }

  const existing = await prisma.agentLeave.findMany({ where: { agentId: agent.id, deletedAt: null } });
  if (existing.some((l) => leavesOverlap(l, range))) {
    return NextResponse.json({ error: "This overlaps an existing leave" }, { status: 409 });
  }

  const now = new Date();
  const leave = await prisma.$transaction(async (tx) => {
    const created = await tx.agentLeave.create({
      data: {
        agentId: agent.id,
        ...range,
        backupId,
        reason: typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null,
      },
    });
    if (backupId) {
      await tx.agent.update({ where: { id: agent.id }, data: { backupAgentId: backupId } });
    }
    await applyLeaveState(tx, agent.id, now, actor.id);
    return created;
  });

  return NextResponse.json(leave, { status: 201 });
}
