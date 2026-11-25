// Sheets mirror writer — CRM → Google Sheets only.
// Nothing in this file reads from the sheet back into the CRM.
// Called exclusively from jobs/sheets-mirror.ts

import { google } from "googleapis";

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not set");
  const key = JSON.parse(keyJson);
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function writeRangeToSheet(
  spreadsheetId: string,
  range: string,
  values: (string | number | null)[][]
) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}
