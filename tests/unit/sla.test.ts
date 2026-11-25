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
