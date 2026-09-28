/**
 * One-time copy of every tab from the Google Sheet into PostgreSQL, so the app
 * can switch to DATA_BACKEND=postgres without losing menu, orders, staff or logs.
 *
 * Needs both backends configured in .env.local:
 *   GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *   DATABASE_URL
 *
 * Run:   npm run migrate:pg            (refuses if PostgreSQL already has data)
 *        npm run migrate:pg -- --force (wipes those tabs in PostgreSQL first)
 *
 * The Google Sheet is only read, never modified.
 */
import "./load-env";
import * as sheets from "../src/lib/sheets/backend-sheets";
import * as postgres from "../src/lib/sheets/backend-postgres";
import { CATEGORIES_TAB, CATEGORIES_HEADERS } from "../src/lib/sheets/categories";
import { MENU_ITEMS_TAB, MENU_ITEMS_HEADERS } from "../src/lib/sheets/menuItems";
import { ORDERS_TAB, ORDERS_HEADERS, ORDER_ITEMS_TAB, ORDER_ITEMS_HEADERS } from "../src/lib/sheets/orders";
import { STAFF_CALLS_TAB, STAFF_CALLS_HEADERS } from "../src/lib/sheets/staffCalls";
import { STAFF_INCIDENTS_TAB, STAFF_INCIDENTS_HEADERS } from "../src/lib/sheets/staffIncidents";
import { TABLE_NAMES_TAB, TABLE_NAMES_HEADERS } from "../src/lib/sheets/tableNames";
import { TABLE_SWITCH_LOG_TAB, TABLE_SWITCH_LOG_HEADERS } from "../src/lib/sheets/tableSwitchLog";
import { USERS_TAB, USERS_HEADERS } from "../src/lib/sheets/users";

const TABS: [string, string[]][] = [
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

const BATCH = 500;

async function main() {
  const force = process.argv.includes("--force");

  if (!force) {
    for (const [tab] of TABS) {
      const existing = await postgres.readAllRows(tab);
      if (existing.length > 0) {
        throw new Error(`PostgreSQL đã có ${existing.length} dòng trong "${tab}". Dùng --force để xoá và chép lại.`);
      }
    }
  }

  for (const [tab, headers] of TABS) {
    if (force) await postgres.clearTabData(tab);
    let rows: sheets.SheetRow[];
    try {
      rows = await sheets.readAllRows(tab);
    } catch (e) {
      console.warn(`- ${tab}: bỏ qua (không đọc được tab trên Google Sheet: ${(e as Error).message})`);
      await postgres.ensureTab(tab, headers);
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
    console.log(`✓ ${tab}: ${rows.length} dòng`);
  }

  console.log("\nXong. Đặt DATA_BACKEND=postgres trên Vercel rồi deploy lại để chuyển sang PostgreSQL.");
}

main()
  .catch((e) => {
    console.error("\n✗ Lỗi:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => postgres.closePool());
