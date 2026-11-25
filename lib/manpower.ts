import { prisma } from "./db";

const OPEN_LEAD = { status: "ACTIVE" as const, isActive: true, deletedAt: null };

export interface AgentLoad {
  id: string;
  name: string;
  team: string | null;
  role: string | null;
  status: "ACTIVE" | "ON_LEAVE" | "EXITED";
  isActive: boolean;
  capacity: number;
  backupAgentId: string | null;
  backupName: string | null;
  open: number;
  overdue: number;
  blocked: number;
  capacityUsedPct: number;
}

/** Live load per agent: open leads, leads with an overdue clock, leads with a blocked clock. */
export async function getAgentLoads(opts: { includeInactive?: boolean } = {}): Promise<AgentLoad[]> {
  const agents = await prisma.agent.findMany({
    where: { deletedAt: null, ...(opts.includeInactive ? {} : { isActive: true }) },
    orderBy: [{ team: "asc" }, { name: "asc" }],
    include: { backupAgent: { select: { name: true } } },
  });

  const [openGroups, flaggedClocks] = await Promise.all([
    prisma.lead.groupBy({ by: ["agentId"], where: OPEN_LEAD, _count: { _all: true } }),
    prisma.slaClock.findMany({
      where: {
        completedAt: null,
        deletedAt: null,
        status: { in: ["OVERDUE", "BLOCKED"] },
        lead: OPEN_LEAD,
      },
      select: { leadId: true, status: true, lead: { select: { agentId: true } } },
    }),
  ]);

  const open = new Map(openGroups.map((g) => [g.agentId, g._count._all]));
  const overdue = new Map<string, Set<string>>();
  const blocked = new Map<string, Set<string>>();
  for (const c of flaggedClocks) {
    const agentId = c.lead.agentId;
    if (!agentId) continue;
    const bucket = c.status === "OVERDUE" ? overdue : blocked;
    if (!bucket.has(agentId)) bucket.set(agentId, new Set());
    bucket.get(agentId)!.add(c.leadId);
  }

  return agents.map((a) => {
    const openCount = open.get(a.id) ?? 0;
    return {
      id: a.id,
      name: a.name,
      team: a.team,
      role: a.role,
      status: a.status,
      isActive: a.isActive,
      capacity: a.capacity,
      backupAgentId: a.backupAgentId,
      backupName: a.backupAgent?.name ?? null,
      open: openCount,
      overdue: overdue.get(a.id)?.size ?? 0,
      blocked: blocked.get(a.id)?.size ?? 0,
      capacityUsedPct: a.capacity > 0 ? Math.round((openCount / a.capacity) * 100) : 0,
    };
  });
}

/** Open leads whose owner is missing, on leave, exited or deactivated. */
export async function getNeedsCover() {
  return prisma.lead.findMany({
    where: {
      ...OPEN_LEAD,
      OR: [
        { agentId: null },
        { agent: { OR: [{ status: { not: "ACTIVE" } }, { isActive: false }] } },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      agent: {
        select: { id: true, name: true, status: true, isActive: true, team: true, backupAgent: { select: { id: true, name: true } } },
      },
    },
  });
}
