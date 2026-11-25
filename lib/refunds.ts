import type { EventType, RefundStatus } from "@prisma/client";
import { SLA_BUDGETS, workingDaysFrom } from "./sla";

export type RefundAction = "approve" | "deny" | "initiate" | "credit" | "recover" | "settle";

export const REFUND_ACTIONS: RefundAction[] = ["approve", "deny", "initiate", "credit", "recover", "settle"];

const TRANSITIONS: Record<RefundAction, { from: RefundStatus; to: RefundStatus; event: EventType }> = {
  approve: { from: "RAISED", to: "APPROVED", event: "REFUND_APPROVED" },
  deny: { from: "RAISED", to: "DENIED", event: "REFUND_DENIED" },
  initiate: { from: "APPROVED", to: "INITIATED", event: "REFUND_INITIATED" },
  credit: { from: "INITIATED", to: "CREDITED", event: "REFUND_CREDITED" },
  recover: { from: "DENIED", to: "RECOVERY", event: "REFUND_RECOVERY" },
  settle: { from: "RECOVERY", to: "SETTLED", event: "REFUND_SETTLED" },
};

export function resolveRefundAction(current: RefundStatus, action: RefundAction) {
  const t = TRANSITIONS[action];
  return t && t.from === current ? { to: t.to, event: t.event } : null;
}

/** Statuses where the call cadence still runs (no decision yet). */
export function isAwaitingDecision(status: RefundStatus): boolean {
  return status === "RAISED";
}

export function isOpenRefund(status: RefundStatus): boolean {
  return status !== "CREDITED" && status !== "SETTLED";
}

/** Next call is due REFUND_CALL working days after the given moment. */
export function nextCallDueAfter(from: Date): Date {
  return workingDaysFrom(from, SLA_BUDGETS.REFUND_CALL);
}
