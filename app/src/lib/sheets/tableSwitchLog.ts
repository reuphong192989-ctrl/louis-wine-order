import { randomUUID } from "crypto";
import { appendRow, readAllRows, cell } from "./core";

const TAB = "TableSwitchLog";
// kind: "" = a device (tablet/kiosk) was re-pointed at another table;
// "orders" = a guest's open orders were moved to another table from the staff screen.
const HEADERS = ["id", "previousTableId", "newTableId", "username", "role", "createdAt", "kind"];

export type TableSwitchKind = "" | "orders";

export type TableSwitchEntry = {
  id: string;
  previousTableId: string | null;
  newTableId: string;
  username: string;
  role: string;
  createdAt: string;
  kind: TableSwitchKind;
};

function decode(values: Record<string, string>): TableSwitchEntry {
  return {
    id: values.id,
    previousTableId: cell.strOrNull(values.previousTableId),
    newTableId: values.newTableId,
    username: values.username,
    role: values.role,
    createdAt: values.createdAt,
    kind: (values.kind ?? "") as TableSwitchKind,
  };
}

/**
 * Append-only audit trail for table assignment/switch on a device (tablet or
 * QR-less kiosk) — every entry requires the acting staff member's own
 * credentials, so a mix-up (order attributed to the wrong table) can later be
 * traced back to who switched what, when. Never exposes a delete — the point
 * of an audit log is that it can't be erased after the fact.
 */
export async function logTableSwitch(entry: {
  previousTableId: string | null;
  newTableId: string;
  username: string;
  role: string;
  kind?: TableSwitchKind;
}): Promise<TableSwitchEntry> {
  const record: TableSwitchEntry = { id: randomUUID(), createdAt: new Date().toISOString(), ...entry, kind: entry.kind ?? "" };
  await appendRow(TAB, HEADERS, {
    id: record.id,
    previousTableId: cell.str(record.previousTableId),
    newTableId: record.newTableId,
    username: record.username,
    role: record.role,
    createdAt: record.createdAt,
    kind: record.kind,
  });
  return record;
}

export async function listTableSwitchLog(limit = 500): Promise<TableSwitchEntry[]> {
  const rows = await readAllRows(TAB);
  const entries = rows.map((r) => decode(r.values));
  entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return entries.slice(0, limit);
}

export const TABLE_SWITCH_LOG_TAB = TAB;
export const TABLE_SWITCH_LOG_HEADERS = HEADERS;
