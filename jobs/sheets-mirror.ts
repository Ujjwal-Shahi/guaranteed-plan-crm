/**
 * Sheets mirror — runs every 10 minutes via Cloud Scheduler.
 * Writes CRM data to Google Sheets. ONE-WAY: CRM → Sheet only.
 * Never reads from the sheet.
 */
import { prisma } from "@/lib/db";
import { writeRangeToSheet } from "@/lib/sheets";
import { formatInTimeZone } from "date-fns-tz";

const IST = "Asia/Kolkata";
const fmt = (d: Date | null) =>
  d ? formatInTimeZone(d, IST, "dd/MM/yyyy HH:mm") : "";

async function run() {
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID_SOCIETY;
  if (!spreadsheetId) {
    console.log("[sheets-mirror] SHEETS_SPREADSHEET_ID_SOCIETY not set — skipping");
    return;
  }

  const leads = await prisma.lead.findMany({
    where: { isActive: true, deletedAt: null },
    include: { agent: true, slaClocks: true },
    orderBy: { code: "asc" },
  });

  const header = [
    "Code", "Segment", "Status", "Agent", "Deal Value",
    "OB Done", "Docs Collected", "DDP PR", "DDP Final",
    "SA Draft", "SA Signed", "Registered",
  ];

  const rows = leads.map((l) => [
    l.code,
    l.segment,
    l.status,
    l.agent?.name ?? "",
    l.dealValue.toString(),
    fmt(l.obCompletedAt),
    fmt(l.docsCollectedAt),
    fmt(l.ddpPrDoneAt),
    fmt(l.ddpFinalDoneAt),
    fmt(l.saDraftDoneAt),
    fmt(l.saSignedAt),
    fmt(l.registeredAt),
  ]);

  await writeRangeToSheet(spreadsheetId, "CRM!A1", [header, ...rows]);
  console.log(`[sheets-mirror] Wrote ${rows.length} rows at ${new Date().toISOString()}`);
}

run().catch((err) => {
  console.error("[sheets-mirror] Fatal error:", err);
  process.exit(1);
});
