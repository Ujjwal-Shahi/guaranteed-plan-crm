import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatInTimeZone } from "date-fns-tz";
import { getAgentLoads } from "@/lib/manpower";
import { AgentStatusBadge } from "@/components/manpower/AgentStatusBadge";
import { AgentForm } from "@/components/manpower/AgentForm";
import { LeaveForm } from "@/components/manpower/LeaveForm";
import { AgentActions } from "@/components/manpower/AgentActions";
import { ReassignPanel } from "@/components/manpower/ReassignPanel";

const fmt = (d: Date) => formatInTimeZone(d, "Asia/Kolkata", "dd MMM yyyy");

export default async function AgentPage({ params }: { params: { id: string } }) {
  const agent = await prisma.agent.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { leaves: { where: { deletedAt: null }, orderBy: { startDate: "desc" }, take: 10 } },
  });
  if (!agent) notFound();

  const loads = await getAgentLoads({ includeInactive: true });
  const me = loads.find((l) => l.id === agent.id);
  const others = loads.filter((l) => l.id !== agent.id && l.isActive);
  const backupNames = new Map(others.map((o) => [o.id, o.name]));
  const reassignTargets = others
    .filter((o) => o.status === "ACTIVE")
    .map((o) => ({ id: o.id, name: o.name, open: o.open, capacity: o.capacity }));

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <Link href="/manpower" className="text-sm text-gray-500 hover:text-[#3D4FD6]">← Manpower</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-semibold text-gray-900">{agent.name}</h1>
          <AgentStatusBadge status={agent.isActive ? agent.status : "EXITED"} />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {me?.open ?? 0} open · {me?.overdue ?? 0} overdue · {me?.blocked ?? 0} blocked · {me?.capacityUsedPct ?? 0}% of capacity
          {agent.exitedAt ? ` · exited ${fmt(agent.exitedAt)}` : ""}
        </p>
      </div>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Details</h2>
        <AgentForm
          mode="edit"
          agentId={agent.id}
          backups={others.map((o) => ({ id: o.id, name: o.name }))}
          initial={{
            name: agent.name,
            email: agent.email,
            noBrokerLogin: agent.noBrokerLogin,
            team: agent.team,
            role: agent.role,
            capacity: agent.capacity,
            backupAgentId: agent.backupAgentId,
          }}
        />
      </section>

      {agent.isActive && (
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Mark leave</h2>
          <p className="text-xs text-gray-500 mb-3">
            Starts at the beginning of the first day (IST) and returns automatically after the last day. Today counts as unplanned leave.
          </p>
          <LeaveForm agentId={agent.id} backups={others.map((o) => ({ id: o.id, name: o.name }))} />
          {agent.leaves.length > 0 && (
            <ul className="mt-4 text-sm divide-y divide-gray-100 border-t border-gray-100">
              {agent.leaves.map((l) => (
                <li key={l.id} className="py-2 flex justify-between text-gray-700">
                  <span>{fmt(l.startDate)} – {fmt(l.endDate)}{l.reason ? ` · ${l.reason}` : ""}</span>
                  <span className="text-gray-500">Backup: {l.backupId ? backupNames.get(l.backupId) ?? "—" : "none"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Reassign open leads</h2>
        <ReassignPanel agentId={agent.id} openLeads={me?.open ?? 0} targets={reassignTargets} />
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Status</h2>
        <AgentActions
          agentId={agent.id}
          isActive={agent.isActive}
          leaves={agent.leaves
            .filter((l) => l.endDate >= new Date())
            .map((l) => ({ id: l.id, label: `${fmt(l.startDate)}–${fmt(l.endDate)}` }))}
        />
      </section>
    </div>
  );
}
