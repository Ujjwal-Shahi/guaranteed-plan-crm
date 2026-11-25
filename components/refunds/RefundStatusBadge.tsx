import type { RefundStatus } from "@prisma/client";

const LABELS: Record<RefundStatus, string> = {
  RAISED: "Raised",
  APPROVED: "Approved",
  INITIATED: "Initiated",
  CREDITED: "Credited",
  DENIED: "Denied",
  RECOVERY: "Recovery",
  SETTLED: "Settled",
};

const CLASSES: Record<RefundStatus, string> = {
  RAISED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  INITIATED: "bg-indigo-100 text-indigo-800",
  CREDITED: "bg-green-100 text-green-800",
  DENIED: "bg-red-100 text-red-800",
  RECOVERY: "bg-orange-100 text-orange-800",
  SETTLED: "bg-gray-100 text-gray-700",
};

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${CLASSES[status]}`}>
      {LABELS[status]}
    </span>
  );
}

export const REFUND_STATUS_LABELS = LABELS;
