import { clearTabData, readAllRows } from "./core";

/**
 * Tabs wiped by "Đặt lại dữ liệu trước khai trương" (OWNER-only, irreversible) — every transactional/test
 * record, so revenue reports start from zero. Deliberately NOT included: Categories, MenuItems, Users,
 * TableNames, Settings/BankAccounts, MenuImportLog — the menu, accounts and configuration must survive a
 * reset untouched, same principle as the Book1 import tool (never touch prices or delete dishes).
 */
const RESET_TABS = [
  { tab: "Orders", label: "Đơn hàng" },
  { tab: "OrderItems", label: "Món trong đơn" },
  { tab: "Bills", label: "Hoá đơn" },
  { tab: "CancelledItems", label: "Món/đơn đã huỷ hoặc trả lại" },
  { tab: "StaffCalls", label: "Gọi nhân viên" },
  { tab: "Reservations", label: "Đặt bàn" },
  { tab: "TableSwitchLog", label: "Nhật ký chuyển bàn" },
  { tab: "Reviews", label: "Đánh giá" },
] as const;

export type ResetTabCount = { tab: string; label: string; count: number };

/** Read-only: how many rows are in each tab a reset would clear, for the confirmation screen. */
export async function countTestData(): Promise<ResetTabCount[]> {
  return Promise.all(RESET_TABS.map(async ({ tab, label }) => ({ tab, label, count: (await readAllRows(tab)).length })));
}

/** Irreversible — permanently empties every tab in RESET_TABS. Menu, accounts, table names and bank settings are untouched. */
export async function resetTestData(): Promise<ResetTabCount[]> {
  const counts = await countTestData();
  await Promise.all(RESET_TABS.map(({ tab }) => clearTabData(tab)));
  return counts;
}
