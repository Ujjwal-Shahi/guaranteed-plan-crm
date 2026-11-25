import { createHash } from "crypto";
import type { LeadSegment, LeadStatus, RefundStatus, SlaStatus } from "@prisma/client";
import { formatIST } from "./format";

// Pure row-building for the Sheets mirror. No I/O. Customer names, emails, phones and
// free-text notes are deliberately never mirrored.

export type Workbook = "SOCIETY" | "BUYER";

export const WORKBOOK_ENV: Record<Workbook, string> = {
  SOCIETY: "SHEETS_SPREADSHEET_ID_SOCIETY",
  BUYER: "SHEETS_SPREADSHEET_ID_BUYER",
};

export const WORKBOOK_SEGMENTS: Record<Workbook, LeadSegment[]> = {
  SOCIETY: ["GP_SOCIETY", "BAPS_SOCIETY", "SSPP_POSTPAID", "PLOT"],
  BUYER: ["BMBA_BM", "BMHV_BM_1L"],
};

export function workbookForSegment(segment: LeadSegment): Workbook {
  return WORKBOOK_SEGMENTS.BUYER.includes(segment) ? "BUYER" : "SOCIETY";
}

const SEGMENT_LABELS: Record<LeadSegment, string> = {
  GP_SOCIETY: "GP/Society",
  BAPS_SOCIETY: "BAPS Society",
  SSPP_POSTPAID: "Post Paid",
  PLOT: "Plot",
  BMBA_BM: "BM",
  BMHV_BM_1L: "BM >1L",
};

type Money = { toFixed(digits: number): string } | null;
type Cell = string | number;
export type Row = Cell[];

const money = (v: Money): string => (v == null ? "" : v.toFixed(2));
const dt = (d: Date | null): string => (d ? formatIST(d, "dd/MM/yyyy HH:mm") : "");
const day = (d: Date | null): string => (d ? formatIST(d, "dd/MM/yyyy") : "");

export interface MirrorLead {
  code: string;
  segment: LeadSegment;
  status: LeadStatus;
  dealValue: Money;
  pfcAmount: Money;
  tokenAmount: Money;
  tdsAmount: Money;
  promiseTatDays: number | null;
  obCompletedAt: Date | null;
  docsCollectedAt: Date | null;
  ddpPrDoneAt: Date | null;
  ddpFinalDoneAt: Date | null;
  saDetailsSharedAt: Date | null;
  saDraftDoneAt: Date | null;
  saSignedAt: Date | null;
  loanSaSharedAt: Date | null;
  loanDdReceivedAt: Date | null;
  sdDraftDoneAt: Date | null;
  registeredAt: Date | null;
  blockedBy: string | null;
  ticketId: string | null;
  createdAt: Date;
  updatedAt: Date;
  agent: { name: string; team: string | null } | null;
  slaClocks: { clockType: string; status: SlaStatus; dueAt: Date; completedAt: Date | null }[];
}

export const LEAD_HEADER: Row = [
  "Code", "Segment", "Status", "Owner", "Team",
  "Deal Value (₹)", "PFC (₹)", "Token (₹)", "TDS (₹)", "Promise TAT (days)",
  "OB Done", "Docs Collected", "DDP PR Done", "DDP Final Done", "SA Details Shared",
  "SA Draft Done", "SA Signed", "Loan SA Shared", "Loan DD Received", "SD Draft Done", "Registered",
  "Current Stage", "SLA Status", "SLA Due", "Blocked By", "Ticket ID", "Created", "Updated",
];

/** The open clock with the earliest due date, i.e. the stage the lead is currently in. */
export function currentClock(clocks: MirrorLead["slaClocks"]) {
  const open = clocks.filter((c) => !c.completedAt);
  if (open.length === 0) return null;
  return open.reduce((a, b) => (b.dueAt < a.dueAt ? b : a));
}

export function leadRow(l: MirrorLead): Row {
  const clock = currentClock(l.slaClocks);
  return [
    l.code,
    SEGMENT_LABELS[l.segment],
    l.status,
    l.agent?.name ?? "",
    l.agent?.team ?? "",
    money(l.dealValue),
    money(l.pfcAmount),
    money(l.tokenAmount),
    money(l.tdsAmount),
    l.promiseTatDays ?? "",
    day(l.obCompletedAt),
    day(l.docsCollectedAt),
    day(l.ddpPrDoneAt),
    day(l.ddpFinalDoneAt),
    day(l.saDetailsSharedAt),
    day(l.saDraftDoneAt),
    day(l.saSignedAt),
    day(l.loanSaSharedAt),
    day(l.loanDdReceivedAt),
    day(l.sdDraftDoneAt),
    day(l.registeredAt),
    clock?.clockType ?? "",
    clock?.status ?? "",
    clock ? dt(clock.dueAt) : "",
    l.blockedBy ?? "",
    l.ticketId ?? "",
    dt(l.createdAt),
    dt(l.updatedAt),
  ];
}

export interface MirrorRefund {
  status: RefundStatus;
  refundType: string | null;
  bmAmount: Money;
  holdingAmount: Money;
  refundAmount: Money;
  penaltyAmount: Money;
  lastCallAt: Date | null;
  nextCallDueAt: Date | null;
  denialMailLoggedAt: Date | null;
  initiatedAt: Date | null;
  creditedAt: Date | null;
  createdAt: Date;
  lead: { code: string; segment: LeadSegment; agent: { name: string } | null };
}

export const REFUND_HEADER: Row = [
  "Lead Code", "Segment", "Status", "Owner", "Type",
  "BM Amount (₹)", "Holding Amount (₹)", "Refund Amount (₹)", "Penalty (₹)",
  "Raised", "Last Call", "Next Call Due", "Denial Mail Logged", "Initiated", "Credited",
];

export function refundRow(r: MirrorRefund): Row {
  return [
    r.lead.code,
    SEGMENT_LABELS[r.lead.segment],
    r.status,
    r.lead.agent?.name ?? "",
    r.refundType ?? "",
    money(r.bmAmount),
    money(r.holdingAmount),
    money(r.refundAmount),
    money(r.penaltyAmount),
    dt(r.createdAt),
    dt(r.lastCallAt),
    r.status === "RAISED" ? dt(r.nextCallDueAt) : "",
    dt(r.denialMailLoggedAt),
    dt(r.initiatedAt),
    dt(r.creditedAt),
  ];
}

export function hashRows(rows: Row[]): string {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function statusTabRows(counts: { leads: number; refunds: number }, now: Date): Row[] {
  return [
    ["Read-only mirror of the NoBroker Monetisation CRM. Edits made here are overwritten and never read back."],
    ["Last checked (IST)", formatIST(now, "dd/MM/yyyy HH:mm")],
    ["Leads", counts.leads],
    ["Refunds", counts.refunds],
  ];
}
