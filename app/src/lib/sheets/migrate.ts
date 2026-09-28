import * as sheets from "./backend-sheets";
import * as postgres from "./backend-postgres";
import { CATEGORIES_TAB, CATEGORIES_HEADERS } from "./categories";
import { MENU_ITEMS_TAB, MENU_ITEMS_HEADERS } from "./menuItems";
import { ORDERS_TAB, ORDERS_HEADERS, ORDER_ITEMS_TAB, ORDER_ITEMS_HEADERS } from "./orders";
import { STAFF_CALLS_TAB, STAFF_CALLS_HEADERS } from "./staffCalls";
import { STAFF_INCIDENTS_TAB, STAFF_INCIDENTS_HEADERS } from "./staffIncidents";
import { TABLE_NAMES_TAB, TABLE_NAMES_HEADERS } from "./tableNames";
import { TABLE_SWITCH_LOG_TAB, TABLE_SWITCH_LOG_HEADERS } from "./tableSwitchLog";
import { USERS_TAB, USERS_HEADERS } from "./users";

export const ALL_TABS: [string, string[]][] = [
  [CATEGORIES_TAB, CATEGORIES_HEADERS],
  [MENU_ITEMS_TAB, MENU_ITEMS_HEADERS],
  [ORDERS_TAB, ORDERS_HEADERS],
  [ORDER_ITEMS_TAB, ORDER_ITEMS_HEADERS],
  [STAFF_CALLS_TAB, STAFF_CALLS_HEADERS],
  [STAFF_INCIDENTS_TAB, STAFF_INCIDENTS_HEADERS],
  [TABLE_NAMES_TAB, TABLE_NAMES_HEADERS],
  [TABLE_SWITCH_LOG_TAB, TABLE_SWITCH_LOG_HEADERS],
  [USERS_TAB, USERS_HEADERS],
];

export type TabResult = { tab: string; rows: number; skipped?: string };

const BATCH = 500;

/** Row counts per tab currently in PostgreSQL. */
export async function postgresCounts(): Promise<TabResult[]> {
  const out: TabResult[] = [];
  for (const [tab] of ALL_TABS) out.push({ tab, rows: (await postgres.readAllRows(tab)).length });
  return out;
}

/**
 * Copies every tab from the Google Sheet (read-only) into PostgreSQL and
 * verifies each tab's row count. Refuses to touch PostgreSQL tabs that already
 * hold data unless `force` is set, in which case those tabs are wiped first.
 */
export async function migrateSheetsToPostgres({ force = false } = {}): Promise<TabResult[]> {
  if (!force) {
    for (const { tab, rows } of await postgresCounts()) {
      if (rows > 0) throw new Error(`PostgreSQL đã có ${rows} dòng trong "${tab}". Chọn "chép đè" để xoá và chép lại.`);
    }
  }

  // Read the whole Sheet first so a Sheets error never leaves PostgreSQL half-wiped.
  const source: { tab: string; headers: string[]; rows: sheets.SheetRow[] | null; skipped?: string }[] = [];
  for (const [tab, headers] of ALL_TABS) {
    try {
      source.push({ tab, headers, rows: await sheets.readAllRows(tab) });
    } catch (e) {
      source.push({ tab, headers, rows: null, skipped: (e as Error).message });
    }
  }

  const results: TabResult[] = [];
  for (const { tab, headers, rows, skipped } of source) {
    if (force) await postgres.clearTabData(tab);
    if (!rows) {
      await postgres.ensureTab(tab, headers);
      results.push({ tab, rows: 0, skipped: `không đọc được tab trên Google Sheet: ${skipped}` });
      continue;
    }
    // Keep any extra columns that exist on the sheet but not in the code's header list.
    const allHeaders = [...headers, ...Object.keys(rows[0]?.values ?? {}).filter((h) => !headers.includes(h))];
    await postgres.ensureTab(tab, allHeaders);
    for (let i = 0; i < rows.length; i += BATCH) {
      await postgres.appendRows(tab, allHeaders, rows.slice(i, i + BATCH).map((r) => r.values));
    }
    const copied = (await postgres.readAllRows(tab)).length;
    if (copied !== rows.length) throw new Error(`${tab}: chép ${copied}/${rows.length} dòng — dừng lại.`);
    results.push({ tab, rows: rows.length });
  }
  return results;
}
