import { randomUUID } from "crypto";
import { appendRow, deleteRow, readAllRows, updateRow } from "./core";
import { listAllOrdersRaw } from "./orders";
import { listStaffCalls } from "./staffCalls";
import { listTableSwitchLog } from "./tableSwitchLog";

const TAB = "TableNames";
const HEADERS = ["id", "tableId", "displayName", "updatedBy", "updatedAt"];

export type TableNameEntry = {
  id: string;
  tableId: string;
  displayName: string;
  updatedBy: string;
  updatedAt: string;
};

function decode(values: Record<string, string>): TableNameEntry {
  return {
    id: values.id,
    tableId: values.tableId,
    displayName: values.displayName,
    updatedBy: values.updatedBy,
    updatedAt: values.updatedAt,
  };
}

/**
 * A friendly display name layered on top of a raw table code (e.g. "01" ->
 * "Platinum 1"). Purely cosmetic — the raw tableId is still what QR links,
 * device assignment, orders, and the switch log all key off; nothing about
 * that changes. Order page, staff/kitchen dashboards and admin views resolve
 * through this map to decide what to print next to "Bàn ".
 */
export async function listTableNames(): Promise<TableNameEntry[]> {
  const rows = await readAllRows(TAB);
  const entries = rows.map((r) => decode(r.values));
  entries.sort((a, b) => a.tableId.localeCompare(b.tableId));
  return entries;
}

export async function upsertTableName(tableId: string, displayName: string, updatedBy: string): Promise<TableNameEntry> {
  const rows = await readAllRows(TAB);
  const existing = rows.find((r) => r.values.tableId === tableId);
  const updatedAt = new Date().toISOString();

  if (existing) {
    const next: TableNameEntry = { id: existing.values.id, tableId, displayName, updatedBy, updatedAt };
    await updateRow(TAB, existing.rowNumber, HEADERS, next);
    return next;
  }

  const entry: TableNameEntry = { id: randomUUID(), tableId, displayName, updatedBy, updatedAt };
  await appendRow(TAB, HEADERS, entry);
  return entry;
}

/** Removes the custom name — the table reverts to showing its raw code. */
export async function deleteTableName(tableId: string): Promise<boolean> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.tableId === tableId);
  if (!row) return false;
  await deleteRow(TAB, row.rowNumber);
  return true;
}

/** Every raw table code seen so far across orders, staff calls, and the switch log — powers an autocomplete so a manager doesn't have to remember exact codes when renaming. */
export async function listKnownTableIds(): Promise<string[]> {
  const [orders, calls, switches] = await Promise.all([
    listAllOrdersRaw(),
    listStaffCalls(undefined, 100000),
    listTableSwitchLog(100000),
  ]);
  const set = new Set<string>();
  for (const o of orders) set.add(o.tableId);
  for (const c of calls) set.add(c.tableId);
  for (const s of switches) {
    set.add(s.newTableId);
    if (s.previousTableId) set.add(s.previousTableId);
  }
  return [...set].sort();
}

/** Every table a staff device could switch to, with a friendly label where one is set — powers the quick-pick list in the table-switch modal so staff tap a room instead of typing a raw code. */
export async function listSwitchOptions(): Promise<{ tableId: string; label: string }[]> {
  const [names, knownIds] = await Promise.all([listTableNames(), listKnownTableIds()]);
  const nameMap = new Map(names.map((n) => [n.tableId, n.displayName]));
  const ids = new Set([...knownIds, ...names.map((n) => n.tableId)]);
  return [...ids]
    .map((tableId) => ({ tableId, label: nameMap.get(tableId) || tableId }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const TABLE_NAMES_TAB = TAB;
export const TABLE_NAMES_HEADERS = HEADERS;
