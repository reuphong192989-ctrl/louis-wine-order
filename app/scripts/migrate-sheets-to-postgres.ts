/**
 * One-time copy of every tab from the Google Sheet into PostgreSQL, so the app
 * can switch to DATA_BACKEND=postgres without losing menu, orders, staff or logs.
 * (Same logic as Quản trị → Dữ liệu, for running from a machine instead of Vercel.)
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
import { closePool } from "../src/lib/sheets/backend-postgres";
import { migrateSheetsToPostgres } from "../src/lib/sheets/migrate";

migrateSheetsToPostgres({ force: process.argv.includes("--force") })
  .then((results) => {
    for (const r of results) console.log(r.skipped ? `- ${r.tab}: bỏ qua (${r.skipped})` : `✓ ${r.tab}: ${r.rows} dòng`);
    console.log("\nXong. Đặt DATA_BACKEND=postgres trên Vercel rồi deploy lại để chuyển sang PostgreSQL.");
  })
  .catch((e) => {
    console.error("\n✗ Lỗi:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => closePool());
