import { describe, it, expect } from "vitest";
import {
  LEAD_HEADER,
  REFUND_HEADER,
  currentClock,
  hashRows,
  leadRow,
  refundRow,
  workbookForSegment,
  type MirrorLead,
  type MirrorRefund,
} from "@/lib/mirror";

const d = (s: string) => new Date(s);
const money = (s: string) => ({ toFixed: (n: number) => Number(s).toFixed(n) });

const lead: MirrorLead = {
  code: "GP0001",
  segment: "GP_SOCIETY",
  status: "ACTIVE",
  dealValue: money("1250000"),
  pfcAmount: null,
  tokenAmount: money("50000.5"),
  tdsAmount: null,
  promiseTatDays: 30,
  obCompletedAt: d("2026-01-05T20:00:00Z"), // 06 Jan 01:30 IST
  docsCollectedAt: null,
  ddpPrDoneAt: null,
  ddpFinalDoneAt: null,
  saDetailsSharedAt: null,
  saDraftDoneAt: null,
  saSignedAt: null,
  loanSaSharedAt: null,
  loanDdReceivedAt: null,
  sdDraftDoneAt: null,
  registeredAt: null,
  blockedBy: null,
  ticketId: "T-9",
  createdAt: d("2026-01-01T00:00:00Z"),
  updatedAt: d("2026-01-02T00:00:00Z"),
  agent: { name: "=HYPERLINK(\"x\")", team: "Alpha" },
  slaClocks: [
    { clockType: "OB", status: "DONE", dueAt: d("2026-01-10T00:00:00Z"), completedAt: d("2026-01-05T20:00:00Z") },
    { clockType: "DOCS_COLLECTION", status: "ON_TRACK", dueAt: d("2026-01-14T00:00:00Z"), completedAt: null },
  ],
};

describe("workbook routing", () => {
  it("sends BM segments to the buyer workbook and the rest to society", () => {
    expect(workbookForSegment("BMBA_BM")).toBe("BUYER");
    expect(workbookForSegment("BMHV_BM_1L")).toBe("BUYER");
    for (const s of ["GP_SOCIETY", "BAPS_SOCIETY", "SSPP_POSTPAID", "PLOT"] as const) {
      expect(workbookForSegment(s)).toBe("SOCIETY");
    }
  });
});

describe("leadRow", () => {
  const row = leadRow(lead);
  it("matches the header width", () => {
    expect(row).toHaveLength(LEAD_HEADER.length);
  });
  it("formats money with two decimals and blanks nulls", () => {
    expect(row[LEAD_HEADER.indexOf("Deal Value (₹)")]).toBe("1250000.00");
    expect(row[LEAD_HEADER.indexOf("Token (₹)")]).toBe("50000.50");
    expect(row[LEAD_HEADER.indexOf("PFC (₹)")]).toBe("");
  });
  it("shows dates in IST", () => {
    expect(row[LEAD_HEADER.indexOf("OB Done")]).toBe("06/01/2026");
  });
  it("reports the open clock as the current stage", () => {
    expect(row[LEAD_HEADER.indexOf("Current Stage")]).toBe("DOCS_COLLECTION");
    expect(row[LEAD_HEADER.indexOf("SLA Status")]).toBe("ON_TRACK");
  });
  it("never includes customer contact or free-text fields", () => {
    expect(LEAD_HEADER.join("|").toLowerCase()).not.toMatch(/email|phone|seller|buyer|address|note/);
  });
});

describe("currentClock", () => {
  it("is null when every clock is complete", () => {
    expect(currentClock([{ clockType: "OB", status: "DONE", dueAt: d("2026-01-01T00:00:00Z"), completedAt: d("2026-01-01T00:00:00Z") }])).toBeNull();
  });
  it("picks the earliest due among open clocks", () => {
    const c = currentClock([
      { clockType: "B", status: "ON_TRACK", dueAt: d("2026-02-01T00:00:00Z"), completedAt: null },
      { clockType: "A", status: "OVERDUE", dueAt: d("2026-01-01T00:00:00Z"), completedAt: null },
    ]);
    expect(c?.clockType).toBe("A");
  });
});

describe("refundRow", () => {
  const refund: MirrorRefund = {
    status: "RAISED",
    refundType: "Full",
    bmAmount: null,
    holdingAmount: null,
    refundAmount: money("75000"),
    penaltyAmount: null,
    lastCallAt: null,
    nextCallDueAt: d("2026-01-12T00:00:00Z"),
    denialMailLoggedAt: null,
    initiatedAt: null,
    creditedAt: null,
    createdAt: d("2026-01-08T00:00:00Z"),
    lead: { code: "GP0001", segment: "GP_SOCIETY", agent: { name: "A" } },
  };
  it("matches the header width and omits the free-text reason", () => {
    expect(refundRow(refund)).toHaveLength(REFUND_HEADER.length);
    expect(REFUND_HEADER.join("|").toLowerCase()).not.toContain("reason");
  });
  it("shows next call only while awaiting a decision", () => {
    const idx = REFUND_HEADER.indexOf("Next Call Due");
    expect(refundRow(refund)[idx]).not.toBe("");
    expect(refundRow({ ...refund, status: "APPROVED" })[idx]).toBe("");
  });
});

describe("hashRows", () => {
  it("is stable for equal content and changes with it", () => {
    expect(hashRows([["a", 1]])).toBe(hashRows([["a", 1]]));
    expect(hashRows([["a", 1]])).not.toBe(hashRows([["a", 2]]));
  });
});
