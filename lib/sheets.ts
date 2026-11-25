// Sheets mirror writer — CRM → Google Sheets only.
// Nothing in this file reads sheet CONTENT back into the CRM. It only lists tab titles
// so a missing tab can be created. Called exclusively from jobs/sheets-mirror.ts.

import { google, type sheets_v4 } from "googleapis";

let client: sheets_v4.Sheets | null = null;

function getClient(): sheets_v4.Sheets {
  if (client) return client;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not set");
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(keyJson),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = google.sheets({ version: "v4", auth });
  return client;
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { code?: number; status?: number }).code ?? (err as { status?: number }).status;
      if (i >= attempts - 1 || !status || !RETRYABLE.has(Number(status))) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

async function ensureTab(spreadsheetId: string, title: string) {
  const sheets = getClient();
  const meta = await withRetry(() =>
    sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" })
  );
  if (meta.data.sheets?.some((s) => s.properties?.title === title)) return;
  await withRetry(() =>
    sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    })
  );
}

/**
 * Replaces the whole tab with `values`. Writes first, then clears rows below, so viewers
 * never see an empty tab. RAW input means cell text is never interpreted as a formula.
 */
export async function replaceTab(
  spreadsheetId: string,
  title: string,
  values: (string | number)[][]
) {
  const sheets = getClient();
  await ensureTab(spreadsheetId, title);
  await withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${title}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    })
  );
  await withRetry(() =>
    sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${title}'!A${values.length + 1}:ZZ`,
    })
  );
}

/** Error text safe for logs: status and message only, never response bodies. */
export function describeSheetsError(err: unknown): string {
  const e = err as { code?: number; message?: string };
  return `${e.code ?? "error"}: ${e.message ?? "unknown"}`;
}
