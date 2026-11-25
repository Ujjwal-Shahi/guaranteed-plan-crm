import { describe, it, expect } from "vitest";
import { resolveRefundAction, nextCallDueAfter, isOpenRefund, REFUND_ACTIONS } from "@/lib/refunds";

describe("refund state machine", () => {
  it("follows the approval path", () => {
    expect(resolveRefundAction("RAISED", "approve")?.to).toBe("APPROVED");
    expect(resolveRefundAction("APPROVED", "initiate")?.to).toBe("INITIATED");
    expect(resolveRefundAction("INITIATED", "credit")?.to).toBe("CREDITED");
  });
  it("follows the denial path", () => {
    expect(resolveRefundAction("RAISED", "deny")?.to).toBe("DENIED");
    expect(resolveRefundAction("DENIED", "recover")?.to).toBe("RECOVERY");
    expect(resolveRefundAction("RECOVERY", "settle")?.to).toBe("SETTLED");
  });
  it("rejects illegal jumps", () => {
    expect(resolveRefundAction("RAISED", "credit")).toBeNull();
    expect(resolveRefundAction("DENIED", "approve")).toBeNull();
    expect(resolveRefundAction("CREDITED", "settle")).toBeNull();
  });
  it("every action is reachable from exactly one status", () => {
    const statuses = ["RAISED", "APPROVED", "INITIATED", "CREDITED", "DENIED", "RECOVERY", "SETTLED"] as const;
    for (const a of REFUND_ACTIONS) {
      expect(statuses.filter((s) => resolveRefundAction(s, a)).length).toBe(1);
    }
  });
  it("terminal states are closed", () => {
    expect(isOpenRefund("CREDITED")).toBe(false);
    expect(isOpenRefund("SETTLED")).toBe(false);
    expect(isOpenRefund("DENIED")).toBe(true);
  });
});

describe("call cadence", () => {
  it("next call is 2 working days out, skipping the weekend", () => {
    const thu = new Date("2026-01-08T09:00:00Z");
    expect(nextCallDueAfter(thu).toISOString().slice(0, 10)).toBe("2026-01-12");
  });
});
