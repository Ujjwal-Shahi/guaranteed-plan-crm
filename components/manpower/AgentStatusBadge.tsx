import type { AgentStatus } from "@prisma/client";

const CLASSES: Record<AgentStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  ON_LEAVE: "bg-amber-100 text-amber-800",
  EXITED: "bg-gray-100 text-gray-600",
};
const LABELS: Record<AgentStatus, string> = { ACTIVE: "Active", ON_LEAVE: "On leave", EXITED: "Exited" };

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${CLASSES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
