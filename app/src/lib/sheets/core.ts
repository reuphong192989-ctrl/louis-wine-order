import { google, sheets_v4 } from "googleapis";

let cachedClient: sheets_v4.Sheets | null = null;
let cachedSheetIdMap: Record<string, number> | null = null;

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name} (cấu hình Google Sheets).`);
  return v;
}

function spreadsheetId(): string {
  return getEnv("GOOGLE_SHEET_ID");
}

async function getClient(): Promise<sheets_v4.Sheets> {
  if (cachedClient) return cachedClient;
  const email = getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const rawKey = getEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

function colLetter(count: number): string {
  let n = count;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s || "A";
}

async function getTabSheetId(tab: string): Promise<number> {
  if (!cachedSheetIdMap) {
    const client = await getClient();
    const res = await client.spreadsheets.get({ spreadsheetId: spreadsheetId() });
    const map: Record<string, number> = {};
    for (const sheet of res.data.sheets ?? []) {
      const title = sheet.properties?.title;
      const id = sheet.properties?.sheetId;
      if (title != null && id != null) map[title] = id;
    }
    cachedSheetIdMap = map;
  }
  const id = cachedSheetIdMap[tab];
  if (id == null) {
    throw new Error(
      `Không tìm thấy tab "${tab}" trong Google Sheet. Hãy tạo một tab (sheet con) đúng tên này với dòng tiêu đề tương ứng.`
    );
  }
  return id;
}

/** Creates the tab with a header row if it doesn't exist yet; leaves it untouched otherwise. Used by the seed script. */
export async function ensureTab(tab: string, headers: string[]): Promise<void> {
  const client = await getClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: spreadsheetId() });
  const exists = (meta.data.sheets ?? []).some((s) => s.properties?.title === tab);

  if (!exists) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId(),
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
    cachedSheetIdMap = null; // invalidate cache so getTabSheetId picks up the new tab
  }

  await client.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A1:${colLetter(headers.length)}1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
}

export type SheetRow = { rowNumber: number; values: Record<string, string> };

/** Reads every row in a tab (row 1 = headers) as {rowNumber, values}. rowNumber is the real 1-indexed sheet row. */
export async function readAllRows(tab: string): Promise<SheetRow[]> {
  const client = await getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A1:Z10000`,
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];
  const headers = rows[0] as string[];
  return rows.slice(1).map((row, i) => {
    const values: Record<string, string> = {};
    headers.forEach((h, idx) => {
      values[h] = (row[idx] as string) ?? "";
    });
    return { rowNumber: i + 2, values };
  });
}

export async function appendRow(tab: string, headers: string[], record: Record<string, string>): Promise<void> {
  const client = await getClient();
  const row = headers.map((h) => record[h] ?? "");
  await client.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

/** Appends many rows in a single API call — use this instead of a loop of appendRow() to avoid hitting Sheets' per-minute write quota (bulk seeding, imports, etc). */
export async function appendRows(tab: string, headers: string[], records: Record<string, string>[]): Promise<void> {
  if (records.length === 0) return;
  const client = await getClient();
  const rows = records.map((record) => headers.map((h) => record[h] ?? ""));
  await client.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

/** Clears every data row in a tab (keeps the header row). Used to reset before a re-seed. */
export async function clearTabData(tab: string): Promise<void> {
  const client = await getClient();
  await client.spreadsheets.values.clear({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A2:Z10000`,
  });
}

export async function updateRow(
  tab: string,
  rowNumber: number,
  headers: string[],
  record: Record<string, string>
): Promise<void> {
  const client = await getClient();
  const row = headers.map((h) => record[h] ?? "");
  await client.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A${rowNumber}:${colLetter(headers.length)}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

/** Updates several rows of a tab in a single API call — use this instead of a loop of updateRow() for reordering, etc. */
export async function batchUpdateRows(
  tab: string,
  headers: string[],
  updates: { rowNumber: number; record: Record<string, string> }[]
): Promise<void> {
  if (updates.length === 0) return;
  const client = await getClient();
  await client.spreadsheets.values.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      valueInputOption: "RAW",
      data: updates.map(({ rowNumber, record }) => ({
        range: `${tab}!A${rowNumber}:${colLetter(headers.length)}${rowNumber}`,
        values: [headers.map((h) => record[h] ?? "")],
      })),
    },
  });
}

export async function deleteRow(tab: string, rowNumber: number): Promise<void> {
  const client = await getClient();
  const sheetId = await getTabSheetId(tab);
  await client.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
          },
        },
      ],
    },
  });
}

// ---- small encode/decode helpers shared by every entity module ----
export const cell = {
  str: (v: string | null | undefined): string => v ?? "",
  strOrNull: (s: string): string | null => (s === "" ? null : s),
  num: (v: number | null | undefined): string => (v == null ? "" : String(v)),
  numOrNull: (s: string): number | null => (s === "" ? null : Number(s)),
  int: (v: number): string => String(v),
  toInt: (s: string, fallback = 0): number => (s === "" ? fallback : parseInt(s, 10)),
  bool: (v: boolean): string => (v ? "true" : "false"),
  toBool: (s: string): boolean => s === "true",
};
