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

function toSheetRows(rows: unknown[][] | null | undefined): SheetRow[] {
  if (!rows || rows.length === 0) return [];
  const headers = rows[0] as string[];
  return rows.slice(1).map((row, i) => {
    const values: Record<string, string> = {};
    headers.forEach((h, idx) => {
      values[h] = (row[idx] as string) ?? "";
    });
    return { rowNumber: i + 2, values };
  });
}

/** Whole-tab A1 range — no fixed row/column cap, so tabs can grow past 10,000 rows. */
function tabRange(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

/**
 * Reads every row in a tab (row 1 = headers) as {rowNumber, values}. rowNumber is the real 1-indexed sheet row.
 * Always hits the API — use this before any write that targets a rowNumber.
 */
export async function readAllRows(tab: string): Promise<SheetRow[]> {
  const client = await getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: tabRange(tab),
  });
  return toSheetRows(res.data.values);
}

// ---- short-lived read cache for polled list endpoints ----
// Staff/kitchen screens and customer phones poll every few seconds. Without a
// cache each poll is 1–3 Sheets read requests, which quickly exceeds Google's
// per-minute read quota. Callers that only display data share one read for
// `ttlMs`; any write through this module drops the affected tab immediately.
// Rows from the cache must NOT be used to pick a rowNumber for a write.
type CacheEntry = { at: number; rows: SheetRow[] };
const g = globalThis as typeof globalThis & {
  __sheetsCache?: Map<string, CacheEntry>;
  __sheetsInflight?: Map<string, Promise<SheetRow[]>>;
};
const cache = (g.__sheetsCache ??= new Map<string, CacheEntry>());
const inflight = (g.__sheetsInflight ??= new Map<string, Promise<SheetRow[]>>());

function invalidate(tab: string) {
  cache.delete(tab);
  inflight.delete(tab);
}

/**
 * Cached read of several tabs, fetched together in ONE batchGet request for
 * whichever tabs are stale. Concurrent callers share the same in-flight request.
 */
export async function readTabsCached(tabs: string[], ttlMs: number): Promise<SheetRow[][]> {
  const now = Date.now();
  const missing = tabs.filter((t) => {
    const hit = cache.get(t);
    return !(hit && now - hit.at < ttlMs) && !inflight.has(t);
  });

  if (missing.length > 0) {
    const request = (async () => {
      const client = await getClient();
      const res = await client.spreadsheets.values.batchGet({
        spreadsheetId: spreadsheetId(),
        ranges: missing.map(tabRange),
      });
      return (res.data.valueRanges ?? []).map((vr) => toSheetRows(vr.values));
    })();
    missing.forEach((t, i) => {
      const p = request.then((all) => all[i] ?? []);
      inflight.set(t, p);
      p.then(
        (rows) => {
          if (inflight.get(t) === p) {
            cache.set(t, { at: Date.now(), rows });
            inflight.delete(t);
          }
        },
        () => {
          if (inflight.get(t) === p) inflight.delete(t);
        }
      );
    });
  }

  return Promise.all(
    tabs.map((t) => {
      const p = inflight.get(t);
      if (p) return p;
      const hit = cache.get(t);
      return hit ? Promise.resolve(hit.rows) : readAllRows(t);
    })
  );
}

export async function readAllRowsCached(tab: string, ttlMs: number): Promise<SheetRow[]> {
  const [rows] = await readTabsCached([tab], ttlMs);
  return rows;
}

export async function appendRow(tab: string, headers: string[], record: Record<string, string>): Promise<void> {
  invalidate(tab);
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
  invalidate(tab);
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
  invalidate(tab);
  const client = await getClient();
  await client.spreadsheets.values.clear({
    spreadsheetId: spreadsheetId(),
    range: `${tabRange(tab)}!A2:ZZ`,
  });
}

export async function updateRow(
  tab: string,
  rowNumber: number,
  headers: string[],
  record: Record<string, string>
): Promise<void> {
  invalidate(tab);
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
  invalidate(tab);
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
  return deleteRows(tab, [rowNumber]);
}

/** Deletes several rows of a tab in one batchUpdate call. Order-independent — rows are removed highest-index-first internally so earlier deletions never shift the indices of rows still pending deletion. */
export async function deleteRows(tab: string, rowNumbers: number[]): Promise<void> {
  if (rowNumbers.length === 0) return;
  invalidate(tab);
  const client = await getClient();
  const sheetId = await getTabSheetId(tab);
  const sorted = [...rowNumbers].sort((a, b) => b - a);
  await client.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      requests: sorted.map((rowNumber) => ({
        deleteDimension: {
          range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
        },
      })),
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

/**
 * Report export: replaces the whole content of `tab` (created if missing) with a
 * header row + rows. Values are USER_ENTERED so numbers/dates stay summable in
 * Google Sheets. Used by the daily report export — never by the app's own data.
 */
export async function writeReportTab(tab: string, rows: (string | number)[][]): Promise<void> {
  const client = await getClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: spreadsheetId() });
  const exists = (meta.data.sheets ?? []).some((s) => s.properties?.title === tab);
  if (!exists) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId(),
      requestBody: { requests: [{ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1 } } } }] },
    });
    cachedSheetIdMap = null;
  }
  await client.spreadsheets.values.clear({ spreadsheetId: spreadsheetId(), range: tabRange(tab) });
  await client.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tabRange(tab)}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
  invalidate(tab);
}
