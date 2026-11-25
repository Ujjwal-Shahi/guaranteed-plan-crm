import { formatIST } from "@/lib/format";

const EVENT_LABELS: Record<string, string> = {
  LEAD_CREATED: "created this lead",
  LEAD_UPDATED: "updated lead details",
  LEAD_ASSIGNED: "reassigned lead",
  LEAD_CANCELLED: "cancelled lead",
  STAGE_UPDATED: "updated stage",
  OB_COMPLETED: "completed onboarding",
  DDP_DOCS_COLLECTED: "collected DDP docs",
  DDP_PR_COMPLETED: "completed DDP PR report",
  DDP_FINAL_COMPLETED: "completed DDP final report",
  SA_DETAILS_SHARED: "shared SA details",
  SA_DRAFT_DONE: "completed SA draft",
  SA_SIGNED: "signed sale agreement",
  LOAN_DD_RECEIVED: "received loan DD",
  SD_DRAFT_DONE: "completed SD draft",
  REGISTERED: "completed registration",
  REFUND_RAISED: "raised refund",
  REFUND_CALLED: "called for refund",
  REFUND_APPROVED: "approved refund",
  REFUND_DENIED: "denied refund",
  REFUND_INITIATED: "initiated refund",
  REFUND_CREDITED: "credited refund",
  REFUND_RECOVERY: "started token recovery",
  REFUND_SETTLED: "settled recovery",
  REFUND_UPDATED: "updated refund details",
  MAIL_LINKED: "linked mail thread",
  MAIL_REPLIED: "replied to mail",
  NOTE_ADDED: "added a note",
  SLA_OVERDUE: "went overdue",
  SLA_BLOCKED: "was marked blocked",
};

interface Event {
  id: string;
  eventType: string;
  actor: { name: string };
  occurredAt: Date | string;
  payload: unknown;
}

export function EventTimeline({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400 italic">No events recorded yet.</p>;
  }

  return (
    <ul className="space-y-0">
      {events.map((event, idx) => (
        <li key={event.id} className="relative flex gap-3 pb-4">
          {idx < events.length - 1 && (
            <span className="absolute left-3.5 top-7 bottom-0 w-px bg-gray-200" />
          )}
          <div className="mt-1 h-7 w-7 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center z-10">
            <span className="text-xs font-semibold text-[#3D4FD6]">
              {event.actor.name[0].toUpperCase()}
            </span>
          </div>
          <div className="pt-0.5">
            <p className="text-sm text-gray-900">
              <span className="font-medium">{event.actor.name}</span>{" "}
              <span className="text-gray-600">
                {EVENT_LABELS[event.eventType] ?? event.eventType.toLowerCase().replace(/_/g, " ")}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {formatIST(event.occurredAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
