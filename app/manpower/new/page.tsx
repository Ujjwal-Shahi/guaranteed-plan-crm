import { prisma } from "@/lib/db";
import { AgentForm } from "@/components/manpower/AgentForm";

export default async function NewAgentPage() {
  const backups = await prisma.agent.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Add agent</h1>
      <p className="text-sm text-gray-500 mb-6">New joiners start with zero leads and appear in assignment lists.</p>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <AgentForm mode="create" backups={backups} />
      </div>
    </div>
  );
}
