import { SlaStatus, LeadStatus } from "@prisma/client";

const SLA_LABELS: Record<SlaStatus, string> = {
  ON_TRACK: "On Track",
  DUE_SOON: "Due Soon",
  OVERDUE: "Overdue",
  BLOCKED: "Blocked",
  DONE: "Done",
};

const SLA_CLASSES: Record<SlaStatus, string> = {
  ON_TRACK: "pill-on-track",
  DUE_SOON: "pill-due-soon",
  OVERDUE: "pill-overdue",
  BLOCKED: "pill-blocked",
  DONE: "pill-done",
};

const LEAD_STATUS_CLASSES: Record<LeadStatus, string> = {
  ACTIVE: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  REGISTERED: "bg-green-100 text-green-800",
};

export function SlaStatusPill({ status }: { status: SlaStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${SLA_CLASSES[status]}`}
    >
      {SLA_LABELS[status]}
    </span>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_CLASSES[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
