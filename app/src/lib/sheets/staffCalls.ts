import { randomUUID } from "crypto";
import { appendRow, readAllRows, updateRow, cell } from "./core";

const TAB = "StaffCalls";
const HEADERS = ["id", "tableId", "status", "createdAt", "acknowledgedAt"];

export type StaffCallStatus = "PENDING" | "ACKNOWLEDGED";

export type StaffCall = {
  id: string;
  tableId: string;
  status: StaffCallStatus;
  createdAt: string;
  acknowledgedAt: string | null;
};

function decode(values: Record<string, string>): StaffCall {
  return {
    id: values.id,
    tableId: values.tableId,
    status: values.status as StaffCallStatus,
    createdAt: values.createdAt,
    acknowledgedAt: cell.strOrNull(values.acknowledgedAt),
  };
}

export async function listStaffCalls(status?: StaffCallStatus, limit = 200): Promise<StaffCall[]> {
  const rows = await readAllRows(TAB);
  let calls = rows.map((r) => decode(r.values));
  if (status) calls = calls.filter((c) => c.status === status);
  calls.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return calls.slice(0, limit);
}

export async function createStaffCall(tableId: string): Promise<StaffCall> {
  const call: StaffCall = { id: randomUUID(), tableId, status: "PENDING", createdAt: new Date().toISOString(), acknowledgedAt: null };
  await appendRow(TAB, HEADERS, {
    id: call.id,
    tableId: call.tableId,
    status: call.status,
    createdAt: call.createdAt,
    acknowledgedAt: "",
  });
  return call;
}

export async function acknowledgeStaffCall(id: string): Promise<StaffCall | null> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return null;
  const current = decode(row.values);
  const next: StaffCall = { ...current, status: "ACKNOWLEDGED", acknowledgedAt: new Date().toISOString() };
  await updateRow(TAB, row.rowNumber, HEADERS, {
    id: next.id,
    tableId: next.tableId,
    status: next.status,
    createdAt: next.createdAt,
    acknowledgedAt: cell.str(next.acknowledgedAt),
  });
  return next;
}
