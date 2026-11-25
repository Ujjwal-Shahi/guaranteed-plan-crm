import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyLeaveState } from "@/lib/leave";

/** Cancels a leave (soft delete) and returns the agent to ACTIVE if it was the one in effect. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; leaveId: string } }
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

  const body = await req.json().catch(() => ({}));
  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const leave = await prisma.agentLeave.findFirst({
    where: { id: params.leaveId, agentId: params.id, deletedAt: null },
  });
  if (!leave) return NextResponse.json({ error: "Leave not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.agentLeave.update({ where: { id: leave.id }, data: { deletedAt: new Date() } });
    await applyLeaveState(tx, params.id, new Date(), actor.id);
  });

  return NextResponse.json({ ok: true });
}
