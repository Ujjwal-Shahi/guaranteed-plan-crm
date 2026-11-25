/**
 * Sheets mirror — runs every 10 minutes via Cloud Scheduler.
 * ONE-WAY: CRM → Sheet. Never reads sheet content. Delta sync: a tab is rewritten only when
 * its content hash differs from the last successful write (kept in the MirrorState table).
 * Set SHEETS_DRY_RUN=1 to build rows and report what would change without writing.
 */
import { prisma } from "@/lib/db";
import { describeSheetsError, replaceTab } from "@/lib/sheets";
import {
  LEAD_HEADER,
  REFUND_HEADER,
  WORKBOOK_ENV,
  WORKBOOK_SEGMENTS,
  hashRows,
  leadRow,
  refundRow,
  statusTabRows,
  type Row,
  type Workbook,
} from "@/lib/mirror";

export interface TabResult {
  workbook: Workbook;
  tab: string;
  rows: number;
  outcome: "written" | "unchanged" | "dry-run" | "failed";
}

async function syncTab(
  workbook: Workbook,
  spreadsheetId: string,
  tab: string,
  header: Row,
  body: Row[],
  dryRun: boolean,
  now: Date
): Promise<TabResult> {
  const key = `${workbook}:${tab}`;
  const values = [header, ...body];
  const contentHash = hashRows(values);
  const previous = await prisma.mirrorState.findUnique({ where: { key } });

  if (previous?.contentHash === contentHash) {
    return { workbook, tab, rows: body.length, outcome: "unchanged" };
  }
  if (dryRun) return { workbook, tab, rows: body.length, outcome: "dry-run" };

  await replaceTab(spreadsheetId, tab, values);
  await prisma.mirrorState.upsert({
    where: { key },
    update: { contentHash, rowCount: body.length, syncedAt: now },
    create: { key, contentHash, rowCount: body.length, syncedAt: now },
  });
  return { workbook, tab, rows: body.length, outcome: "written" };
}

export async function runSheetsMirror(opts: { now?: Date; dryRun?: boolean } = {}) {
  const now = opts.now ?? new Date();
  const dryRun = opts.dryRun ?? false;
  const results: TabResult[] = [];

  for (const workbook of Object.keys(WORKBOOK_ENV) as Workbook[]) {
    const spreadsheetId = process.env[WORKBOOK_ENV[workbook]];
    if (!spreadsheetId) {
      console.log(`[sheets-mirror] ${WORKBOOK_ENV[workbook]} not set — skipping ${workbook}`);
      continue;
    }
    const segments = WORKBOOK_SEGMENTS[workbook];

    try {
      const [leads, refunds] = await Promise.all([
        prisma.lead.findMany({
          where: { isActive: true, deletedAt: null, segment: { in: segments } },
          orderBy: { code: "asc" },
          include: {
            agent: { select: { name: true, team: true } },
            slaClocks: {
              where: { deletedAt: null },
              select: { clockType: true, status: true, dueAt: true, completedAt: true },
            },
          },
        }),
        prisma.refund.findMany({
          where: {
            isActive: true,
            deletedAt: null,
            lead: { isActive: true, deletedAt: null, segment: { in: segments } },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: { lead: { select: { code: true, segment: true, agent: { select: { name: true } } } } },
        }),
      ]);

      results.push(
        await syncTab(workbook, spreadsheetId, "Leads", LEAD_HEADER, leads.map(leadRow), dryRun, now),
        await syncTab(workbook, spreadsheetId, "Refunds", REFUND_HEADER, refunds.map(refundRow), dryRun, now)
      );

      if (!dryRun) {
        await replaceTab(spreadsheetId, "Mirror status", statusTabRows({ leads: leads.length, refunds: refunds.length }, now));
      }
    } catch (err) {
      console.error(`[sheets-mirror] ${workbook} failed — ${describeSheetsError(err)}`);
      results.push({ workbook, tab: "*", rows: 0, outcome: "failed" });
    }
  }
  return results;
}

if (require.main === module) {
  runSheetsMirror({ dryRun: process.env.SHEETS_DRY_RUN === "1" })
    .then((results) => {
      for (const r of results) console.log(`[sheets-mirror] ${r.workbook}/${r.tab}: ${r.outcome} (${r.rows} rows)`);
      if (results.some((r) => r.outcome === "failed")) process.exitCode = 1;
    })
    .catch((err) => {
      console.error("[sheets-mirror] Fatal error:", describeSheetsError(err));
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
