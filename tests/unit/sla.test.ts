import { describe, it, expect } from "vitest";
import { workingDaysFrom, workingDaysBetween } from "@/lib/sla";

describe("workingDaysFrom", () => {
  it("skips weekends", () => {
    // Friday 2026-01-02 + 1 working day = Monday 2026-01-05
    const fri = new Date("2026-01-02T00:00:00Z");
    const result = workingDaysFrom(fri, 1);
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-05");
  });

  it("3 working days from a Tuesday", () => {
    const tue = new Date("2026-01-06T00:00:00Z");
    const result = workingDaysFrom(tue, 3);
    // Tue +3 wd = Fri 2026-01-09
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-09");
  });

  it("returns start when days=0", () => {
    const d = new Date("2026-01-06T00:00:00Z");
    expect(workingDaysFrom(d, 0)).toEqual(d);
  });
});

describe("workingDaysBetween", () => {
  it("counts Mon–Fri inclusive", () => {
    const mon = new Date("2026-01-05T00:00:00Z");
    const fri = new Date("2026-01-09T00:00:00Z");
    expect(workingDaysBetween(mon, fri)).toBe(4); // Tue Wed Thu Fri
  });

  it("returns 0 when end <= start", () => {
    const d = new Date("2026-01-06T00:00:00Z");
    expect(workingDaysBetween(d, d)).toBe(0);
  });
});

import { computeSlaStatus, STAGE_CLOCKS, workingDaysFrom as wdf } from "@/lib/sla";

describe("computeSlaStatus", () => {
  const now = new Date("2026-01-06T10:00:00Z"); // Tuesday
  const base = { completedAt: null, blockedBy: null };

  it("DONE when completedAt is set", () => {
    expect(computeSlaStatus({ ...base, dueAt: new Date("2026-01-01T00:00:00Z"), completedAt: now }, now)).toBe("DONE");
  });
  it("OVERDUE when past dueAt with no blocker", () => {
    expect(computeSlaStatus({ ...base, dueAt: new Date("2026-01-05T00:00:00Z") }, now)).toBe("OVERDUE");
  });
  it("BLOCKED when past dueAt with blockedBy", () => {
    expect(computeSlaStatus({ ...base, blockedBy: "Seller docs", dueAt: new Date("2026-01-05T00:00:00Z") }, now)).toBe("BLOCKED");
  });
  it("DUE_SOON within 1 working day", () => {
    expect(computeSlaStatus({ ...base, dueAt: new Date("2026-01-07T12:00:00Z") }, now)).toBe("DUE_SOON");
  });
  it("ON_TRACK with more than 1 working day left", () => {
    expect(computeSlaStatus({ ...base, dueAt: new Date("2026-01-12T00:00:00Z") }, now)).toBe("ON_TRACK");
  });
});

describe("holidays and stage chain", () => {
  it("skips Republic Day (2026-01-26, a Monday)", () => {
    const fri = new Date("2026-01-23T00:00:00Z");
    expect(wdf(fri, 1).toISOString().slice(0, 10)).toBe("2026-01-27");
  });
  it("every stage's next clock is another stage's completes", () => {
    const completes = new Set(Object.values(STAGE_CLOCKS).map((s) => s.completes));
    for (const s of Object.values(STAGE_CLOCKS)) {
      if (s.starts) expect(completes.has(s.starts)).toBe(true);
    }
  });
});
