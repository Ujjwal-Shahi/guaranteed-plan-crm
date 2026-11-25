import { describe, it, expect } from "vitest";
import { distributeLeads } from "@/lib/assignment";
import { istDayStart, istDayEnd, leaveActiveAt, leavesOverlap, isDateString } from "@/lib/leave";

describe("distributeLeads", () => {
  it("evens out by current load", () => {
    const r = distributeLeads(["l1", "l2", "l3", "l4"], [
      { id: "a", load: 0, capacity: 50 },
      { id: "b", load: 2, capacity: 50 },
    ]);
    const byAgent = Object.fromEntries(r.perTarget.map((t) => [t.agentId, t.assigned]));
    expect(byAgent).toEqual({ a: 3, b: 1 });
    expect(r.assignments).toHaveLength(4);
  });
  it("flags over-capacity targets", () => {
    const r = distributeLeads(["l1", "l2"], [{ id: "a", load: 1, capacity: 2 }]);
    expect(r.perTarget[0].overCapacity).toBe(true);
    expect(r.perTarget[0].loadAfter).toBe(3);
  });
  it("assigns nothing without targets", () => {
    expect(distributeLeads(["l1"], []).assignments).toEqual([]);
  });
});

describe("leave dates (IST)", () => {
  it("day bounds are expressed in IST", () => {
    expect(istDayStart("2026-03-02").toISOString()).toBe("2026-03-01T18:30:00.000Z");
    expect(istDayEnd("2026-03-02").toISOString()).toBe("2026-03-02T18:29:59.999Z");
  });
  it("leave is active through the last IST day and ends after", () => {
    const leave = [{ startDate: istDayStart("2026-03-02"), endDate: istDayEnd("2026-03-03") }];
    expect(leaveActiveAt(leave, new Date("2026-03-03T18:00:00Z"))).toBe(true);
    expect(leaveActiveAt(leave, new Date("2026-03-03T18:31:00Z"))).toBe(false);
    expect(leaveActiveAt(leave, new Date("2026-03-01T18:00:00Z"))).toBe(false);
  });
  it("detects overlapping ranges", () => {
    const a = { startDate: istDayStart("2026-03-02"), endDate: istDayEnd("2026-03-04") };
    expect(leavesOverlap(a, { startDate: istDayStart("2026-03-04"), endDate: istDayEnd("2026-03-06") })).toBe(true);
    expect(leavesOverlap(a, { startDate: istDayStart("2026-03-05"), endDate: istDayEnd("2026-03-06") })).toBe(false);
  });
  it("validates date strings", () => {
    expect(isDateString("2026-03-02")).toBe(true);
    expect(isDateString("02/03/2026")).toBe(false);
    expect(isDateString("2026-13-40")).toBe(false);
  });
});
