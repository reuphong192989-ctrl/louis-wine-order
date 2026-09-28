import * as sheets from "./backend-sheets";
import * as postgres from "./backend-postgres";

/**
 * Row-store used by every entity module (categories, menuItems, orders, …).
 *
 * DATA_BACKEND=postgres → PostgreSQL (DATABASE_URL); anything else → Google
 * Sheets (the original backend). Both expose the same functions, so switching
 * is a config change — no route or screen code changes.
 */
export type { SheetRow } from "./backend-sheets";
export { cell } from "./backend-sheets";

export function dataBackend(): "postgres" | "sheets" {
  return process.env.DATA_BACKEND === "postgres" ? "postgres" : "sheets";
}

type Backend = Omit<typeof postgres, "closePool">;

function b(): Backend {
  return dataBackend() === "postgres" ? postgres : sheets;
}

export const readAllRows: typeof sheets.readAllRows = (tab) => b().readAllRows(tab);
export const readAllRowsCached: typeof sheets.readAllRowsCached = (tab, ttlMs) => b().readAllRowsCached(tab, ttlMs);
export const readTabsCached: typeof sheets.readTabsCached = (tabs, ttlMs) => b().readTabsCached(tabs, ttlMs);
export const ensureTab: typeof sheets.ensureTab = (tab, headers) => b().ensureTab(tab, headers);
export const appendRow: typeof sheets.appendRow = (tab, headers, record) => b().appendRow(tab, headers, record);
export const appendRows: typeof sheets.appendRows = (tab, headers, records) => b().appendRows(tab, headers, records);
export const clearTabData: typeof sheets.clearTabData = (tab) => b().clearTabData(tab);
export const updateRow: typeof sheets.updateRow = (tab, rowNumber, headers, record) =>
  b().updateRow(tab, rowNumber, headers, record);
export const batchUpdateRows: typeof sheets.batchUpdateRows = (tab, headers, updates) => b().batchUpdateRows(tab, headers, updates);
export const deleteRow: typeof sheets.deleteRow = (tab, rowNumber) => b().deleteRow(tab, rowNumber);
export const deleteRows: typeof sheets.deleteRows = (tab, rowNumbers) => b().deleteRows(tab, rowNumbers);
